"""
Public business email finder for decision makers.
Only extracts emails directly visible on legitimate public sources.
"""

import re
from typing import List, Optional, Tuple
from jarvis.database.models import EmailStatus
from jarvis.search.search_manager import SearchManager
from jarvis.utils.urls import extract_domain_from_url
from .verifier import EmailVerifier

EMAIL_EXTRACT_REGEX = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b'
)

class EmailFinder:
    def __init__(self, search_manager: Optional[SearchManager] = None):
        self.search_mgr = search_manager or SearchManager()

    def find_public_email(
        self,
        full_name: str,
        company_name: str,
        official_domain: str
    ) -> Tuple[Optional[str], EmailStatus, List[str]]:
        """
        Searches public corporate press releases and contact pages for explicitly published emails.
        """
        if not official_domain:
            return None, EmailStatus.NOT_FOUND, []

        query = f'"{full_name}" email OR contact "@{official_domain}"'
        results = self.search_mgr.search(query, max_results=3)

        source_urls = []
        for res in results:
            content = (res.content or "") + " " + (res.title or "")
            found_emails = EMAIL_EXTRACT_REGEX.findall(content)
            for em in found_emails:
                clean_em, status = EmailVerifier.classify_email(
                    email=em,
                    official_domain=official_domain,
                    is_explicitly_published=True
                )
                if status == EmailStatus.VERIFIED_PUBLIC and clean_em:
                    source_urls.append(res.url)
                    return clean_em, EmailStatus.VERIFIED_PUBLIC, source_urls

        return None, EmailStatus.NOT_FOUND, []
