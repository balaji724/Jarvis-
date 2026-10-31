"""
Unit tests for URL parsing and domain extraction.
"""

from jarvis.utils.urls import extract_domain_from_url, normalize_domain, clean_url, is_valid_url

def test_domain_normalization_standard():
    assert normalize_domain("https://www.zoho.com/about-us") == "zoho.com"
    assert normalize_domain("http://apple.com/iphone?query=1#frag") == "apple.com"
    assert normalize_domain("microsoft.com") == "microsoft.com"

def test_multipart_tlds():
    assert extract_domain_from_url("https://tcs.co.in/careers") == "tcs.co.in"
    assert extract_domain_from_url("http://sub.example.co.uk") == "example.co.uk"

def test_subdomain_spoofing_defense():
    # Crucial security requirement from Section 8:
    # "Do not incorrectly treat example.com.fake-site.com as example.com"
    spoofed = "https://example.com.fake-site.com/login"
    domain = extract_domain_from_url(spoofed)
    assert domain == "fake-site.com"
    assert domain != "example.com"

def test_clean_url():
    cleaned = clean_url("https://www.zoho.com/leadership/?utm_source=test#team")
    assert cleaned == "https://www.zoho.com/leadership"

def test_is_valid_url():
    assert is_valid_url("https://zoho.com") is True
    assert is_valid_url("not_a_url") is False
    assert is_valid_url("") is False
