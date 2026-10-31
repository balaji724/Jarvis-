"""
Domain and company website verification.
Ensures domains are legitimate corporate websites and not social media or directory aggregators.
"""

from typing import Tuple
from jarvis.utils.urls import extract_domain_from_url, is_valid_url

EXCLUDED_DOMAINS = {
    "wikipedia.org", "facebook.com", "instagram.com", "twitter.com", "x.com",
    "youtube.com", "pinterest.com", "glassdoor.com", "indeed.com", "yelp.com",
    "yellowpages.com", "bloomberg.com", "reuters.com", "forbes.com"
}

class CompanyVerifier:
    @staticmethod
    def verify_candidate_domain(url: str, target_name: str) -> Tuple[bool, str]:
        """
        Validates that a URL represents a genuine primary company website.
        """
        if not is_valid_url(url):
            return False, "Invalid URL structure"

        domain = extract_domain_from_url(url)
        if not domain:
            return False, "Could not extract registered domain"

        if domain in EXCLUDED_DOMAINS:
            return False, f"Domain '{domain}' is a directory/news/social site, not official company website"

        return True, domain
