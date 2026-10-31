"""
Unit tests for company disambiguation and matching.
"""

from jarvis.company.matcher import CompanyMatcher

def test_apple_disambiguation():
    # Apple Inc. vs Apple Hospitality / Apple Bank
    match, score, reason = CompanyMatcher.match_company(
        target_name="Apple Inc.",
        candidate_title="Apple Hospitality REIT Hotel Properties",
        candidate_url="https://applehospitalityreit.com"
    )
    assert match is False
    assert score <= 0.30

    match, score, reason = CompanyMatcher.match_company(
        target_name="Apple Inc.",
        candidate_title="Apple Bank for Savings Personal Accounts",
        candidate_url="https://applebank.com"
    )
    assert match is False
    assert score <= 0.30

    match, score, reason = CompanyMatcher.match_company(
        target_name="Apple Inc.",
        candidate_title="Apple Official Site",
        candidate_url="https://apple.com"
    )
    assert match is True
    assert score >= 0.85

def test_company_suffix_stripping():
    match, score, _ = CompanyMatcher.match_company(
        target_name="Zoho Corporation Pvt Ltd",
        candidate_title="Zoho Official Cloud Software Suite",
        candidate_url="https://zoho.com"
    )
    assert match is True
    assert score >= 0.85
