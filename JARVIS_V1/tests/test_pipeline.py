"""
Unit tests for pipeline status, confidence calculation, and orchestrator workflow.
"""

from jarvis.ai.scorer import ConfidenceScorer
from jarvis.database.models import VerificationStatus, CompanyInput, PipelineJobStatus
from jarvis.voice.command_router import CommandRouter, VoiceIntent

def test_confidence_scoring_engine():
    scorer = ConfidenceScorer()

    score, status, breakdown = scorer.score_person(
        target_company="Zoho",
        target_role="CEO",
        target_city="Chennai",
        target_country="India",
        official_domain="zoho.com",
        extracted_designation="Chief Executive Officer",
        source_urls=[
            "https://zoho.com/leadership",
            "https://forbes.com/profile/sridhar-vembu"
        ],
        evidence_texts=[
            "Sridhar Vembu is the CEO of Zoho Corporation based in Chennai, India."
        ]
    )

    # Official (40) + Authoritative (25) + 2 Sources (15) + Domain (10) + Role (5) + Location (5) = 100
    assert score == 100
    assert status == VerificationStatus.VERIFIED
    assert breakdown.official_company_source == 40
    assert breakdown.authoritative_source == 25

def test_voice_command_parsing():
    c1 = CommandRouter.parse("Jarvis, process pending companies")
    assert c1.intent == VoiceIntent.PROCESS_PENDING

    c2 = CommandRouter.parse("Jarvis, find CEO of Zoho")
    assert c2.intent == VoiceIntent.FIND_PEOPLE
    assert c2.company == "Zoho"
    assert c2.role == "CEO"

    c3 = CommandRouter.parse("Jarvis, find five decision makers for Microsoft")
    assert c3.intent == VoiceIntent.FIND_PEOPLE
    assert c3.company == "Microsoft"
    assert c3.max_people == 5

    c4 = CommandRouter.parse("Jarvis, pause")
    assert c4.intent == VoiceIntent.PAUSE

    c5 = CommandRouter.parse("Jarvis, export Excel")
    assert c5.intent == VoiceIntent.EXPORT_EXCEL

def test_company_input_parsing():
    item = CompanyInput(
        **{
            "Company Name": "Zoho",
            "City": "Chennai",
            "Country": "India",
            "Target Role": "CEO",
            "Max People": "1",
            "Status": "Pending"
        }
    )
    assert item.company_name == "Zoho"
    assert item.max_people == 1
    assert item.status == "Pending"
