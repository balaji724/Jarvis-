"""
PeopleFinder searches for decision-makers and coordinates extraction, enrichment, and scoring.
"""

from typing import List, Optional
from jarvis.search.search_manager import SearchManager
from jarvis.database.models import PersonRecord
from jarvis.ai.scorer import ConfidenceScorer
from jarvis.email.finder import EmailFinder
from jarvis.linkedin.resolver import LinkedInResolver
from jarvis.utils.logger import logger
from .extractor import PeopleExtractor
from .matcher import PeopleMatcher

class PeopleFinder:
    def __init__(
        self,
        search_manager: Optional[SearchManager] = None,
        extractor: Optional[PeopleExtractor] = None,
        scorer: Optional[ConfidenceScorer] = None,
        email_finder: Optional[EmailFinder] = None,
        linkedin_resolver: Optional[LinkedInResolver] = None
    ):
        self.search_mgr = search_manager or SearchManager()
        self.extractor = extractor or PeopleExtractor()
        self.scorer = scorer or ConfidenceScorer()
        self.email_finder = email_finder or EmailFinder(self.search_mgr)
        self.linkedin_resolver = linkedin_resolver or LinkedInResolver(self.search_mgr)

    def find_decision_makers(
        self,
        company_name: str,
        official_domain: str,
        city: str = "",
        country: str = "",
        target_role: str = "CEO",
        max_people: int = 1
    ) -> List[PersonRecord]:
        """
        Discovers up to max_people high-confidence decision makers.
        """
        queries = []
        if target_role:
            queries.append(f'"{company_name}" "{target_role}"')
        queries.extend([
            f'"{company_name}" CEO OR "Chief Executive Officer"',
            f'"{company_name}" founder OR "co-founder"',
            f'"{company_name}" leadership OR management',
            f'"{company_name}" CTO OR CFO',
        ])

        all_snippets = []
        for q in queries:
            results = self.search_mgr.search(q, max_results=4)
            for r in results:
                all_snippets.append({
                    "title": r.title,
                    "url": r.url,
                    "content": r.content
                })
            # If we already have strong candidates from the target role, break early
            if len(all_snippets) >= 8:
                break

        # Extract people via AI / heuristic model
        raw_candidates = self.extractor.extract_and_verify(
            company_name=company_name,
            city=city,
            country=country,
            target_role=target_role,
            max_people=max(max_people * 2, 3),
            search_snippets=all_snippets
        )

        # Deduplicate
        unique_people = PeopleMatcher.deduplicate(raw_candidates)

        # Enrich and score
        enriched_people: List[PersonRecord] = []
        for person in unique_people:
            # 1. Resolve LinkedIn if missing
            if not person.linkedin_url:
                l_url, l_sources = self.linkedin_resolver.resolve_profile(
                    full_name=person.full_name,
                    company_name=company_name,
                    designation=person.designation
                )
                if l_url:
                    person.linkedin_url = l_url
                    person.source_urls.extend(l_sources)

            # 2. Find public business email if missing
            if not person.email:
                em, em_status, em_sources = self.email_finder.find_public_email(
                    full_name=person.full_name,
                    company_name=company_name,
                    official_domain=official_domain
                )
                if em:
                    person.email = em
                    person.email_status = em_status
                    person.source_urls.extend(em_sources)

            # 3. Calculate Confidence Score
            score, status, _ = self.scorer.score_person(
                target_company=company_name,
                target_role=target_role,
                target_city=city,
                target_country=country,
                official_domain=official_domain,
                extracted_designation=person.designation,
                source_urls=person.source_urls,
                evidence_texts=person.evidence
            )
            person.confidence = score
            person.verification_status = status
            enriched_people.append(person)

        # Sort by confidence descending
        enriched_people.sort(key=lambda x: x.confidence, reverse=True)

        # Return only up to max_people
        return enriched_people[:max_people]
