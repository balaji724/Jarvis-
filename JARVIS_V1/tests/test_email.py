"""
Unit tests for email rules and verification status.
"""

from jarvis.database.models import EmailStatus
from jarvis.email.verifier import EmailVerifier

def test_explicitly_published_business_email():
    email, status = EmailVerifier.classify_email(
        email="press@zoho.com",
        official_domain="zoho.com",
        is_explicitly_published=True,
        is_generic_inbox=False
    )
    # Generic prefix press is discarded as personal executive email
    assert status == EmailStatus.NOT_FOUND

    email, status = EmailVerifier.classify_email(
        email="sridhar.vembu@zoho.com",
        official_domain="zoho.com",
        is_explicitly_published=True,
        is_generic_inbox=False
    )
    assert email == "sridhar.vembu@zoho.com"
    assert status == EmailStatus.VERIFIED_PUBLIC

def test_reject_inferred_prediction():
    # If merely predicted, it must never be called VERIFIED_PUBLIC
    email, status = EmailVerifier.classify_email(
        email="john.doe@company.com",
        official_domain="company.com",
        is_explicitly_published=False
    )
    assert status == EmailStatus.INFERRED_NOT_VERIFIED
    assert email is None

def test_invalid_syntax():
    assert EmailVerifier.is_valid_syntax("not-an-email") is False
    assert EmailVerifier.is_valid_syntax("ceo@domain") is False
    assert EmailVerifier.is_valid_syntax("ceo@domain.com") is True
