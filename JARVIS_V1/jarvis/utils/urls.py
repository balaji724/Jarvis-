"""
URL and Domain utilities for JARVIS V1.
Handles strict domain normalization, sanitization, and security checks.
"""

from urllib.parse import urlparse
import re

# Common multi-part TLDs for reliable domain parsing
MULTI_PART_TLDS = {
    "co.uk", "org.uk", "gov.uk", "ac.uk",
    "co.in", "net.in", "org.in", "gen.in", "firm.in", "ind.in",
    "com.au", "net.au", "org.au", "edu.au",
    "co.nz", "net.nz", "org.nz",
    "com.br", "net.br", "org.br",
    "co.za", "org.za",
    "com.sg", "edu.sg",
    "com.my", "net.my",
    "co.jp", "ne.jp", "ac.jp",
}

def extract_domain_from_url(url: str) -> str:
    """
    Extracts the root registered domain from a given URL or hostname.
    Ensures 'example.com.fake-site.com' resolves to 'fake-site.com' and not 'example.com'.
    """
    if not url:
        return ""

    cleaned = url.strip()
    if not cleaned.startswith(("http://", "https://")):
        cleaned = "https://" + cleaned

    try:
        parsed = urlparse(cleaned)
        netloc = (parsed.netloc or "").split(":")[0].lower()
    except Exception:
        return ""

    if not netloc:
        return ""

    # Remove leading 'www.' and subdomains if needed, or preserve registered domain
    parts = netloc.split(".")
    if len(parts) <= 2:
        return netloc

    # Check multi-part TLDs (e.g. example.co.in -> example.co.in, not co.in)
    last_two = ".".join(parts[-2:])
    if last_two in MULTI_PART_TLDS:
        if len(parts) >= 3:
            return ".".join(parts[-3:])
        return netloc

    # Standard TLD: return last 2 parts (e.g. sub.example.com -> example.com)
    return ".".join(parts[-2:])

def normalize_domain(domain_or_url: str) -> str:
    """
    Normalizes domain by removing protocol, www, trailing slashes, paths, and casing.
    """
    if not domain_or_url:
        return ""
    return extract_domain_from_url(domain_or_url)

def clean_url(url: str) -> str:
    """
    Cleans URL by stripping query parameters, fragments, and trailing slashes.
    """
    if not url:
        return ""
    try:
        parsed = urlparse(url.strip())
        scheme = parsed.scheme if parsed.scheme in ("http", "https") else "https"
        netloc = parsed.netloc.lower()
        path = parsed.path.rstrip("/")
        return f"{scheme}://{netloc}{path}"
    except Exception:
        return url.strip()

def is_valid_url(url: str) -> bool:
    """
    Checks if a URL has valid HTTP/HTTPS scheme and valid network location.
    """
    if not url or not isinstance(url, str):
        return false
    try:
        parsed = urlparse(url.strip())
        return parsed.scheme in ("http", "https") and bool(parsed.netloc) and "." in parsed.netloc
    except Exception:
        return False
