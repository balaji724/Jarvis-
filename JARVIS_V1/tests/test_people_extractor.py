"""
Unit tests for people extraction, deduplication, and verification.
"""

from jarvis.database.models import PersonRecord, EmailStatus, VerificationStatus
from jarvis.people.matcher import PeopleMatcher
from jarvis.people.verifier import PeopleVerifier

def test_person_pydantic_validation():
    person = PersonRecord(
        first_name="Sridhar",
        last_name="Vembu",
        full_name="Sridhar Vembu",
        designation="Chief Executive Officer",
        email=None,
        email_status=EmailStatus.NOT_FOUND,
        linkedin_url="https://www.linkedin.com/in/svembu",
        source_urls=["https://zoho.com/leadership"],
        evidence=["Sridhar Vembu co-founded Zoho and serves as CEO."],
        confidence=95,
        verification_status=VerificationStatus.VERIFIED
    )
    assert person.first_name == "Sridhar"
    assert person.confidence == 95
    assert person.email_status == EmailStatus.NOT_FOUND

def test_person_deduplication():
    p1 = PersonRecord(
        full_name="Sridhar Vembu",
        designation="CEO",
        linkedin_url="https://www.linkedin.com/in/svembu",
        source_urls=["https://zoho.com/about"],
        evidence=["CEO of Zoho"],
        confidence=85
    )
    p2 = PersonRecord(
        full_name="Sridhar Vembu",
        designation="Chief Executive Officer & Founder",
        linkedin_url="https://www.linkedin.com/in/svembu/",
        source_urls=["https://forbes.com/profile/sridhar-vembu"],
        evidence=["Forbes billionaire profile"],
        confidence=95
    )

    merged = PeopleMatcher.merge_records(p1, p2)
    assert merged.full_name == "Sridhar Vembu"
    assert merged.confidence == 95
    assert len(merged.source_urls) == 2
    assert "Chief Executive Officer" in merged.designation

def test_people_verifier_filters_artifacts():
    invalid_person = PersonRecord(
        full_name="Privacy Policy",
        designation="Terms of Service",
        source_urls=[]
    )
    is_valid, reason = PeopleVerifier.is_valid_person(invalid_person)
    assert is_valid is False
