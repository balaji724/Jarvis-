"""
Confidence Scoring Engine for JARVIS V1.
Calculates mathematical confidence score (0-100) and maps to VerificationStatus.
"""

from typing import List, Tuple
from config import settings
from jarvis.database.models import VerificationStatus, ConfidenceBreakdown
from jarvis.utils.urls import extract_domain_from_url
from jarvis.utils.text import compute_similarity
from .classifier import SourceRanker, SourceTier

class ConfidenceScorer:
    def __init__(
        self,
        weight_official: int = 40,
        weight_authoritative: int = 25,
        weight_independent_sources: int = 15,
        weight_domain_match: int = 10,
        weight_role_match: int = 5,
        weight_location_match: int = 5,
    ):
        self.w_official = weight_official
        self.w_authoritative = weight_authoritative
        self.w_independent = weight_independent_sources
        self.w_domain = weight_domain_match
        self.w_role = weight_role_match
        self.w_location = weight_location_match

    def score_person(
        self,
        target_company: str,
        target_role: str,
        target_city: str,
        target_country: str,
        official_domain: str,
        extracted_designation: str,
        source_urls: List[str],
        evidence_texts: List[str]
    ) -> Tuple[int, VerificationStatus, ConfidenceBreakdown]:
        """
        Calculates composite score based on evidence criteria.
        """
        breakdown = ConfidenceBreakdown()
        unique_domains = {extract_domain_from_url(u) for u in source_urls if extract_domain_from_url(u)}

        # 1. Official company source (+40)
        has_official = False
        norm_official = extract_domain_from_url(official_domain)
        if norm_official and norm_official in unique_domains:
            has_official = True
            breakdown.official_company_source = self.w_official

        # 2. Authoritative source (+25)
        has_authoritative = False
        for url in source_urls:
            tier = SourceRanker.classify_source(url, official_domain)
            if tier in (SourceTier.REGISTRY_GOV, SourceTier.REPUTABLE_NEWS):
                has_authoritative = True
                breakdown.authoritative_source = self.w_authoritative
                break

        # 3. Two or more independent sources (+15)
        if len(unique_domains) >= 2:
            breakdown.two_independent_sources = self.w_independent

        # 4. Exact company/domain match (+10)
        if norm_official:
            breakdown.exact_company_domain_match = self.w_domain

        # 5. Role match (+5)
        if target_role and extracted_designation:
            t_role = target_role.lower()
            e_role = extracted_designation.lower()
            if t_role in e_role or e_role in t_role or compute_similarity(t_role, e_role) >= 0.7:
                breakdown.role_match = self.w_role

        # 6. Location match (+5)
        combined_evidence = " ".join(evidence_texts).lower()
        if (target_city and target_city.lower() in combined_evidence) or \
           (target_country and target_country.lower() in combined_evidence):
            breakdown.location_match = self.w_location

        raw_total = (
            breakdown.official_company_source +
            breakdown.authoritative_source +
            breakdown.two_independent_sources +
            breakdown.exact_company_domain_match +
            breakdown.role_match +
            breakdown.location_match
        )
        total = min(100, max(0, raw_total))
        breakdown.total = total

        # Map to VerificationStatus
        if total >= 90:
            status = VerificationStatus.VERIFIED
        elif total >= settings.MIN_CONFIDENCE:
            status = VerificationStatus.HIGH_CONFIDENCE
        elif total >= 60:
            status = VerificationStatus.NEEDS_REVIEW
        else:
            status = VerificationStatus.LOW_CONFIDENCE

        return total, status, breakdown
