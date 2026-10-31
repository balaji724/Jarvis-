"""
AI extraction engine for identifying verified executives from evidence snippets.
Never invents information; strictly enforces public citation evidence.
"""

import re
from typing import List, Optional
from pydantic import BaseModel, Field
from jarvis.database.models import PersonRecord, EmailStatus, VerificationStatus
from jarvis.utils.logger import logger
from jarvis.utils.text import normalize_name
from .client import AIClient

class AIExtractedPersonItem(BaseModel):
    first_name: str = Field(default="", description="First name of the person")
    last_name: str = Field(default="", description="Last name of the person")
    full_name: str = Field(..., description="Full name of executive")
    designation: str = Field(..., description="Exact verified job title / role")
    email: Optional[str] = Field(default=None, description="Only if explicitly published in evidence")
    is_email_verified_public: bool = Field(default=False, description="True only if published on official/reputable site")
    linkedin_url: Optional[str] = Field(default=None, description="Only if explicitly present in search results")
    evidence_snippet: str = Field(..., description="Verbatim sentence or snippet confirming this person holds this role")
    source_url: str = Field(..., description="URL where this person was identified")

class AIExtractionResponse(BaseModel):
    candidates: List[AIExtractedPersonItem] = Field(default_factory=list)

SYSTEM_PROMPT = """You are JARVIS, a strict factual research automation agent.
Your objective is to identify real company executives and decision makers strictly from provided public evidence.

RULES:
1. NEVER hallucinate, guess, or predict names, emails, titles, or URLs.
2. If an email is not explicitly present in the text, leave email as null and is_email_verified_public as false. Never construct 'firstname.lastname@domain.com'.
3. Only extract people who are verified to be currently associated with the target company in executive/leadership capacity.
4. Extract the exact evidence quote and source URL.
5. If no verified person is found, return an empty candidates list.
"""

class AIExtractor:
    def __init__(self, ai_client: Optional[AIClient] = None):
        self.ai = ai_client or AIClient()

    def extract_candidates(
        self,
        company_name: str,
        city: str,
        country: str,
        target_role: str,
        max_people: int,
        search_snippets: List[dict]
    ) -> List[PersonRecord]:
        """
        Extracts verified candidates using OpenAI Responses API if available,
        falling back to deterministic factual regex analysis.
        """
        evidence_text = "\n\n".join([
            f"Source URL: {s.get('url', '')}\nTitle: {s.get('title', '')}\nContent: {s.get('content', '')}"
            for s in search_snippets
        ])

        if self.ai.is_available() and evidence_text.strip():
            user_prompt = f"""Target Company: {company_name}
Location: {city}, {country}
Target Role Priority: {target_role}
Max People to Extract: {max_people}

EVIDENCE CORPUS:
{evidence_text}

Extract up to {max_people} decision-makers according to the rules."""

            result: Optional[AIExtractionResponse] = self.ai.generate_structured(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
                response_model=AIExtractionResponse
            )

            if result and result.candidates:
                records = []
                for c in result.candidates[:max_people]:
                    # Split full name into first/last if missing
                    fn = c.first_name
                    ln = c.last_name
                    if not fn and not ln and c.full_name:
                        parts = c.full_name.strip().split()
                        fn = parts[0] if parts else ""
                        ln = " ".join(parts[1:]) if len(parts) > 1 else ""

                    email_stat = EmailStatus.VERIFIED_PUBLIC if (c.email and c.is_email_verified_public) else EmailStatus.NOT_FOUND

                    records.append(
                        PersonRecord(
                            first_name=fn,
                            last_name=ln,
                            full_name=c.full_name,
                            designation=c.designation,
                            email=c.email if email_stat == EmailStatus.VERIFIED_PUBLIC else None,
                            email_status=email_stat,
                            linkedin_url=c.linkedin_url,
                            source_urls=[c.source_url] if c.source_url else [],
                            evidence=[c.evidence_snippet] if c.evidence_snippet else [],
                            confidence=0,  # Will be scored by ConfidenceScorer
                            verification_status=VerificationStatus.NEEDS_REVIEW
                        )
                    )
                return records

        # Heuristic deterministic extraction fallback
        return self._heuristic_extract(company_name, target_role, max_people, search_snippets)

    def _heuristic_extract(
        self,
        company_name: str,
        target_role: str,
        max_people: int,
        search_snippets: List[dict]
    ) -> List[PersonRecord]:
        """
        Deterministic pattern matcher for titles and names from authoritative search snippets.
        """
        candidates: List[PersonRecord] = []
        seen_names = set()

        role_patterns = [
            rf"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:is|serves as|was appointed as)?\s*(?:the\s+)?(CEO|Chief Executive Officer|Founder|Co-Founder|Managing Director|CTO|CFO|President)\s+(?:of|at)\s+{re.escape(company_name)}",
            rf"{re.escape(company_name)}'?s?\s+(CEO|Chief Executive Officer|Founder|Co-Founder|Managing Director|CTO|CFO|President),?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
            rf"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),?\s+(CEO|Chief Executive Officer|Founder|Managing Director|CTO|CFO)\s+at\s+{re.escape(company_name)}",
        ]

        for item in search_snippets:
            content = item.get("content", "") + " " + item.get("title", "")
            url = item.get("url", "")
            for pat in role_patterns:
                matches = re.finditer(pat, content, re.IGNORECASE)
                for m in matches:
                    groups = m.groups()
                    # Determine which group is name and which is role
                    if any(t.lower() in groups[0].lower() for t in ["ceo", "founder", "director", "officer", "cto", "cfo"]):
                        role_str = groups[0]
                        name_str = groups[1]
                    else:
                        name_str = groups[0]
                        role_str = groups[1]

                    norm_n = normalize_name(name_str)
                    if norm_n in seen_names or len(name_str.split()) < 2:
                        continue

                    seen_names.add(norm_n)
                    parts = name_str.strip().split()
                    fn = parts[0]
                    ln = " ".join(parts[1:])

                    candidates.append(
                        PersonRecord(
                            first_name=fn,
                            last_name=ln,
                            full_name=name_str.strip(),
                            designation=role_str.strip(),
                            email=None,
                            email_status=EmailStatus.NOT_FOUND,
                            linkedin_url=None,
                            source_urls=[url] if url else [],
                            evidence=[f"Found '{name_str} ({role_str})' in public snippet."],
                            confidence=0,
                            verification_status=VerificationStatus.NEEDS_REVIEW
                        )
                    )
                    if len(candidates) >= max_people:
                        return candidates

        return candidates
