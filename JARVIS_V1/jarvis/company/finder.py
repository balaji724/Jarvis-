"""
CompanyFinder discovers and verifies the official website and domain of target companies.
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from jarvis.search.search_manager import SearchManager
from jarvis.utils.urls import extract_domain_from_url, clean_url
from jarvis.utils.logger import logger
from .matcher import CompanyMatcher
from .verifier import CompanyVerifier

class DiscoveredCompany(BaseModel):
    company_name: str
    domain: str = ""
    official_url: str = ""
    confidence: int = 0
    source_urls: List[str] = Field(default_factory=list)

class CompanyFinder:
    def __init__(self, search_manager: Optional[SearchManager] = None):
        self.search_mgr = search_manager or SearchManager()

    def find_company(self, company_name: str, city: str = "", country: str = "") -> DiscoveredCompany:
        """
        Executes multi-query discovery to locate the authentic corporate domain.
        """
        queries = [
            f'"{company_name}" official website',
            f'"{company_name}" official company',
        ]
        if city or country:
            loc = f"{city} {country}".strip()
            queries.append(f'"{company_name}" {loc}')

        collected_sources: List[str] = []
        best_candidate: Optional[dict] = None
        best_score: float = 0.0

        for q in queries:
            results = self.search_mgr.search(q, max_results=4)
            for res in results:
                collected_sources.append(res.url)
                is_valid, domain = CompanyVerifier.verify_candidate_domain(res.url, company_name)
                if not is_valid:
                    continue

                is_match, match_score, reason = CompanyMatcher.match_company(
                    target_name=company_name,
                    candidate_title=res.title,
                    candidate_url=res.url,
                    city=city,
                    country=country
                )

                if is_match and match_score > best_score:
                    best_score = match_score
                    best_candidate = {
                        "domain": domain,
                        "url": clean_url(res.url),
                        "title": res.title,
                        "score": int(match_score * 100),
                    }
                    if match_score >= 0.95:
                        break
            if best_candidate and best_score >= 0.95:
                break

        if best_candidate:
            return DiscoveredCompany(
                company_name=company_name,
                domain=best_candidate["domain"],
                official_url=best_candidate["url"],
                confidence=min(100, max(50, best_candidate["score"])),
                source_urls=list(dict.fromkeys(collected_sources))[:5]
            )

        logger.warning(f"Could not conclusively identify official domain for '{company_name}'")
        return DiscoveredCompany(
            company_name=company_name,
            domain="",
            official_url="",
            confidence=0,
            source_urls=list(dict.fromkeys(collected_sources))[:5]
        )
