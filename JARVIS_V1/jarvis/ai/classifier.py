"""
Source quality ranker and classification engine for JARVIS V1.
Evaluates evidence URLs according to trust hierarchy.
"""

from enum import IntEnum
from urllib.parse import urlparse
from jarvis.utils.urls import extract_domain_from_url

class SourceTier(IntEnum):
    OFFICIAL_LEADERSHIP = 1
    OFFICIAL_WEBSITE = 2
    REGISTRY_GOV = 3
    REPUTABLE_NEWS = 4
    PROFESSIONAL_ORG = 5
    PUBLIC_SEARCH_SNIPPET = 6
    UNKNOWN_LOW_QUALITY = 7

REPUTABLE_DOMAINS = {
    # News & Business
    "bloomberg.com", "reuters.com", "wsj.com", "forbes.com", "ft.com",
    "techcrunch.com", "cnbc.com", "economictimes.indiatimes.com", "business-standard.com",
    "nytimes.com", "bbc.com", "theverge.com", "fortune.com", "inc.com",
    # Authoritative Directories & Registries
    "sec.gov", "companieshouse.gov.uk", "mca.gov.in", "opencorporates.com",
    "crunchbase.com", "pitchbook.com", "wikipedia.org", "wikidata.org"
}

LEADERSHIP_PATHS = [
    "/about", "/about-us", "/leadership", "/team", "/management",
    "/our-team", "/executives", "/board-of-directors", "/people", "/company/about"
]

class SourceRanker:
    @staticmethod
    def classify_source(url: str, official_domain: str = "") -> SourceTier:
        if not url:
            return SourceTier.UNKNOWN_LOW_QUALITY

        domain = extract_domain_from_url(url)
        path = urlparse(url).path.lower()

        # Check official domain match
        if official_domain and domain == extract_domain_from_url(official_domain):
            if any(lp in path for lp in LEADERSHIP_PATHS):
                return SourceTier.OFFICIAL_LEADERSHIP
            return SourceTier.OFFICIAL_WEBSITE

        # Check Government & Reputable News / Registries
        if domain.endswith(".gov") or domain.endswith(".gov.in") or domain.endswith(".gov.uk"):
            return SourceTier.REGISTRY_GOV

        if domain in REPUTABLE_DOMAINS:
            if "sec.gov" in domain or "mca.gov.in" in domain or "companieshouse" in domain or "opencorporates" in domain:
                return SourceTier.REGISTRY_GOV
            return SourceTier.REPUTABLE_NEWS

        if "linkedin.com" in domain or "crunchbase.com" in domain:
            return SourceTier.PROFESSIONAL_ORG

        return SourceTier.PUBLIC_SEARCH_SNIPPET
