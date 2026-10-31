"""
Company matcher to disambiguate target companies from unrelated entities.
Example: Distinguishes 'Apple Inc.' from 'Apple Bank' or 'Apple Hospitality'.
"""

from typing import Tuple
from jarvis.utils.text import (
    normalize_text,
    strip_company_legal_suffix,
    compute_similarity
)
from jarvis.utils.urls import extract_domain_from_url

DISAMBIGUATION_STOP_WORDS = {
    "bank", "hospitality", "hotel", "resort", "realty", "properties",
    "logistics", "plumbing", "dentistry", "dental", "motors", "auto"
}

class CompanyMatcher:
    @staticmethod
    def match_company(
        target_name: str,
        candidate_title: str,
        candidate_url: str,
        city: str = "",
        country: str = ""
    ) -> Tuple[bool, float, str]:
        """
        Evaluates whether a search result candidate represents the real target company.
        Returns (is_match, confidence_ratio, reason).
        """
        norm_target = normalize_text(target_name)
        base_target = strip_company_legal_suffix(target_name)
        norm_title = normalize_text(candidate_title)
        domain = extract_domain_from_url(candidate_url)
        norm_url = domain.split(".")[0].lower()

        # Check disambiguation conflict:
        # If candidate title contains a distinct industry keyword not in target name
        target_tokens = set(norm_target.split())
        title_tokens = set(norm_title.split())
        conflicting_tokens = (title_tokens - target_tokens) & DISAMBIGUATION_STOP_WORDS

        if conflicting_tokens and not (target_tokens & DISAMBIGUATION_STOP_WORDS):
            return False, 0.20, f"Disambiguation conflict with tokens: {conflicting_tokens}"

        # Exact domain match with base name (e.g. zoho -> zoho.com)
        if base_target.replace(" ", "") == norm_url:
            return True, 0.98, "Exact registered domain match"

        # Similarity on base names
        base_title = strip_company_legal_suffix(candidate_title)
        sim = compute_similarity(base_target, base_title)

        if sim >= 0.85:
            return True, sim, f"High name similarity ({sim:.2f})"

        # Check if base target is prominent in title and URL
        if base_target in norm_title and (base_target in norm_url or norm_url in base_target):
            return True, 0.85, "Target name present in title and domain"

        # Geographic boost if present
        if (city and city.lower() in norm_title) or (country and country.lower() in norm_title):
            if base_target in norm_title:
                return True, 0.80, "Name and location matched in title"

        return False, sim, f"Low similarity ({sim:.2f})"
