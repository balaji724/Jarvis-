"""
Compliant LinkedIn profile resolver for JARVIS V1.
Strictly captures publicly indexed URLs without private scraping or authentication bypass.
"""

import re
from typing import Optional, List, Tuple
from urllib.parse import urlparse
from jarvis.search.search_manager import SearchManager
from jarvis.utils.text import compute_similarity, normalize_name
from jarvis.utils.logger import logger

LINKEDIN_URL_PATTERN = re.compile(
    r'https?://(?:[a-z]{2,3}\.)?linkedin\.com/in/([a-zA-Z0-9_\-%]+)',
    re.IGNORECASE
)

class LinkedInResolver:
    def __init__(self, search_manager: Optional[SearchManager] = None):
        self.search_mgr = search_manager or SearchManager()

    @staticmethod
    def validate_public_linkedin_url(url: str) -> Optional[str]:
        """
        Validates that a URL is a legitimate public /in/ profile URL.
        Rejects company pages, jobs, pulse articles, and malformed strings.
        """
        if not url:
            return None
        match = LINKEDIN_URL_PATTERN.search(url.strip())
        if match:
            slug = match.group(1).rstrip("/")
            # Disallow search, login, help endpoints
            if slug.lower() in ("login", "auth", "signup", "search", "feed", "company"):
                return None
            return f"https://www.linkedin.com/in/{slug}"
        return None

    def resolve_profile(
        self,
        full_name: str,
        company_name: str,
        designation: str = ""
    ) -> Tuple[Optional[str], List[str]]:
        """
        Locates publicly indexed profile URL via search engines.
        Never guesses or fabricates profile slugs from names.
        """
        query = f'site:linkedin.com/in/ "{full_name}" "{company_name}"'
        results = self.search_mgr.search(query, max_results=3)

        source_urls = []
        target_name_norm = normalize_name(full_name)

        for res in results:
            valid_url = self.validate_public_linkedin_url(res.url)
            if not valid_url:
                continue

            source_urls.append(res.url)
            # Verify person's name appears in search result title or snippet
            res_title_norm = normalize_name(res.title)
            if target_name_norm in res_title_norm or compute_similarity(target_name_norm, res_title_norm) >= 0.70:
                logger.info(f"Resolved public LinkedIn for {full_name}: {valid_url}")
                return valid_url, source_urls

        return None, source_urls
