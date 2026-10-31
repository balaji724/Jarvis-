"""
JARVIS 2.0 Unit Tests.
Verifies bilingual Tamil + English voice parsing, spoofing defense, and confidence engine.
"""

from jarvis.voice.command_router import CommandRouter, VoiceIntent
from jarvis.utils.urls import extract_domain_from_url
from jarvis.ai.scorer import ConfidenceScorer

def test_tamil_voice_parsing():
    c1 = CommandRouter.parse("ஜார்விஸ், ஜோஹோ நிறுவனத்தை ஆராய்")
    assert c1.intent == VoiceIntent.RESEARCH_COMPANY
    assert c1.language == "ta"

    c2 = CommandRouter.parse("ஜார்விஸ், நிலவரத்தை சொல்")
    assert c2.intent == VoiceIntent.SHOW_STATUS
    assert c2.language == "ta"

    c3 = CommandRouter.parse("ஜார்விஸ், எக்செல் ஏற்றுமதி செய்")
    assert c3.intent == VoiceIntent.EXPORT_EXCEL

def test_english_voice_parsing():
    c1 = CommandRouter.parse("Jarvis, research Apple Inc.")
    assert c1.intent == VoiceIntent.RESEARCH_COMPANY
    assert "Apple" in c1.company

    c2 = CommandRouter.parse("Jarvis, find CEO of Zoho")
    assert c2.intent == VoiceIntent.FIND_PEOPLE
    assert c2.company == "Zoho"
    assert c2.role == "CEO"

def test_subdomain_spoofing_defense():
    spoofed = "https://zoho.com.fake-phishing.org/login"
    domain = extract_domain_from_url(spoofed)
    assert domain == "fake-phishing.org"
    assert domain != "zoho.com"

def test_confidence_scoring_evidence_based():
    scorer = ConfidenceScorer()
    score, status, _ = scorer.score_person(
        target_company="Zoho",
        target_role="CEO",
        target_city="Chennai",
        target_country="India",
        official_domain="zoho.com",
        extracted_designation="Chief Executive Officer",
        source_urls=["https://www.zoho.com/leadership", "https://en.wikipedia.org/wiki/Zoho_Corporation"],
        evidence_texts=["Sridhar Vembu is the CEO of Zoho Corporation."]
    )
    assert score >= 90
    assert status.value == "VERIFIED"
