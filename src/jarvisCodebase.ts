/**
 * JARVIS 2.0 — Codebase Registry of all Source Files
 * For in-browser inspection, copying, and 1-click ZIP export.
 */

export interface SourceFile {
  path: string;
  category: 'core' | 'api' | 'voice' | 'company' | 'people' | 'automation' | 'database' | 'pipeline' | 'sheets' | 'tests' | 'docs';
  content: string;
}

export const JARVIS_2_FILES: SourceFile[] = [
  {
    path: 'requirements.txt',
    category: 'core',
    content: `# JARVIS 2.0 — Autonomous Company Intelligence Platform
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
websockets>=13.0
pydantic>=2.10.0
pydantic-settings>=2.7.0
sqlalchemy>=2.0.36
psycopg2-binary>=2.9.10
celery>=5.4.0
redis>=5.2.0
playwright>=1.49.0
beautifulsoup4>=4.12.3
trafilatura>=1.12.2
httpx>=0.28.0
requests>=2.32.3
pandas>=2.2.3
openpyxl>=3.1.5
python-dotenv>=1.0.1
google-api-python-client>=2.154.0
google-auth-httplib2>=0.2.0
google-auth-oauthlib>=1.2.1
pyttsx3>=2.90
SpeechRecognition>=3.11.0
pytest>=8.3.4
pytest-asyncio>=0.24.0
`
  },
  {
    path: 'config.py',
    category: 'core',
    content: `"""
JARVIS 2.0 Configuration Module.
Supports PostgreSQL, Redis/Celery, Google Sheets, and Search providers.
"""

from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent

class Settings(BaseSettings):
    # App & API
    APP_NAME: str = "JARVIS 2.0 Intelligence Platform"
    DEBUG: bool = False
    PORT: int = 8000

    # Database: PostgreSQL with SQLite fallback
    DATABASE_URL: str = Field(
        default=f"sqlite:///{BASE_DIR}/data/cache/jarvis2.db",
        description="PostgreSQL connection string (e.g. postgresql://user:pass@localhost:5432/jarvis) or SQLite fallback"
    )

    # Celery & Redis Background Worker
    REDIS_URL: str = Field(default="redis://localhost:6379/0", description="Redis broker and result backend URL")

    # AI & Search Providers
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key")
    OPENAI_MODEL: str = Field(default="gpt-5.6-luna", description="Model name for verification")
    TAVILY_API_KEY: str = Field(default="", description="Tavily Search API key")
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API key")

    # Google Sheets Integration
    GOOGLE_SHEET_ID: str = Field(default="", description="Google Sheets Spreadsheet ID")
    GOOGLE_CREDENTIALS_PATH: str = Field(default="credentials.json", description="OAuth client secrets path")
    GOOGLE_TOKEN_PATH: str = Field(default="token.json", description="User token cache path")
    INPUT_TAB: str = Field(default="Input")
    OUTPUT_TAB: str = Field(default="Output")

    # Concurrency & Performance
    MAX_WORKERS: int = Field(default=5, description="Max concurrent research threads")
    CACHE_TTL_HOURS: int = Field(default=168, description="Cache TTL in hours (7 days)")
    REQUEST_TIMEOUT: int = Field(default=20, description="HTTP timeout in seconds")
    MIN_CONFIDENCE: int = Field(default=75, description="Minimum confidence for high-confidence match")

    # Audio & Voice Settings
    TTS_VOICE_RATE: int = Field(default=180)
    TTS_VOLUME: float = Field(default=1.0)
    VOICE_DEFAULT_LANG: str = Field(default="ta-IN", description="Default language: ta-IN (Tamil) or en-US (English)")

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
`
  },
  {
    path: 'jarvis/voice/tamil_english_router.py',
    category: 'voice',
    content: `"""
JARVIS 2.0 — Bilingual Tamil + English Voice NLP Intent Router.
Supports spoken natural language commands in Tamil and English.
"""

import re
from enum import Enum
from typing import Optional
from pydantic import BaseModel

class VoiceIntent(str, Enum):
    RESEARCH_COMPANY = "RESEARCH_COMPANY"
    FIND_CEO = "FIND_CEO"
    FIND_CTO = "FIND_CTO"
    FIND_CFO = "FIND_CFO"
    PROCESS_FILE = "PROCESS_FILE"
    PROCESS_SHEET = "PROCESS_SHEET"
    EXPORT_RESULTS = "EXPORT_RESULTS"
    SHOW_STATUS = "SHOW_STATUS"
    PAUSE = "PAUSE"
    RESUME = "RESUME"
    STOP = "STOP"
    UNKNOWN = "UNKNOWN"

class ParsedVoiceCommand(BaseModel):
    intent: VoiceIntent
    company: Optional[str] = None
    role: Optional[str] = "CEO"
    language: str = "en"
    raw_text: str
    response_speech_tamil: str
    response_speech_english: str

class TamilEnglishCommandRouter:
    @staticmethod
    def parse(text: str) -> ParsedVoiceCommand:
        raw = text.strip()
        lower = raw.lower()
        is_tamil = bool(re.search(r'[\u0B80-\u0BFF]', raw))

        # --- Tamil NLP Parser ---
        if is_tamil:
            if any(w in raw for w in ["நிறுத்து", "நிறுத்துங்கள்"]):
                return ParsedVoiceCommand(
                    intent=VoiceIntent.STOP,
                    language="ta",
                    raw_text=raw,
                    response_speech_tamil="ஜார்விஸ் செயல்பாடுகள் நிறுத்தப்பட்டன.",
                    response_speech_english="Jarvis operations stopped."
                )

            if any(w in raw for w in ["நிலவரம்", "நிலை", "ரிப்போர்ட்"]):
                return ParsedVoiceCommand(
                    intent=VoiceIntent.SHOW_STATUS,
                    language="ta",
                    raw_text=raw,
                    response_speech_tamil="ஜார்விஸ் தயார் நிலையில் உள்ளது. அனைத்து தொகுதிகளும் இயங்குகின்றன.",
                    response_speech_english="Jarvis status: all systems operational."
                )

            if any(w in raw for w in ["எக்செல்", "கோப்பு", "ஃபைல்"]):
                return ParsedVoiceCommand(
                    intent=VoiceIntent.PROCESS_FILE,
                    language="ta",
                    raw_text=raw,
                    response_speech_tamil="ஜார்விஸ் எக்செல் கோப்பில் உள்ள நிறுவனங்களை செயலாக்குகிறது.",
                    response_speech_english="Jarvis is processing companies from the file."
                )

            if any(w in raw for w in ["ஏற்றுமதி", "பதிவிறக்கு"]):
                return ParsedVoiceCommand(
                    intent=VoiceIntent.EXPORT_RESULTS,
                    language="ta",
                    raw_text=raw,
                    response_speech_tamil="ஜார்விஸ் ஆய்வு முடிவுகளை எக்செல் வடிவத்தில் ஏற்றுமதி செய்கிறது.",
                    response_speech_english="Jarvis is exporting results to Excel."
                )

            # Match: "[நிறுவனம்] நிறுவனத்தை ஆராய்"
            m_res = re.search(r'(?:ஜார்விஸ்,?\s*)?([^\s,]+(?:\s+[^\s,]+)?)\s+(?:நிறுவனத்தை\s+ஆராய்|ஆராய்ச்சி\s+செய்|பற்றி\s+ஆராய்)', raw)
            if m_res:
                comp = m_res.group(1).replace("நிறுவனம்", "").replace("கம்பெனி", "").strip()
                return ParsedVoiceCommand(
                    intent=VoiceIntent.RESEARCH_COMPANY,
                    company=comp,
                    role="CEO",
                    language="ta",
                    raw_text=raw,
                    response_speech_tamil=f"ஜார்விஸ் {comp} நிறுவனத்தின் விவரங்களை ஆராய்கிறது.",
                    response_speech_english=f"Jarvis is researching {comp}."
                )

            # Match CEO: "[நிறுவனம்] சிஇஓ யார்" or "தலைவர்"
            m_ceo = re.search(r'([^\s,]+)\s*(?:இன்|ன்)?\s*(?:சிஇஓ|தலைவர்)', raw)
            if m_ceo:
                comp = m_ceo.group(1).strip()
                return ParsedVoiceCommand(
                    intent=VoiceIntent.FIND_CEO,
                    company=comp,
                    role="CEO",
                    language="ta",
                    raw_text=raw,
                    response_speech_tamil=f"ஜார்விஸ் {comp} நிறுவனத்தின் தலைவரை தேடுகிறது.",
                    response_speech_english=f"Jarvis is finding the CEO of {comp}."
                )

        # --- English NLP Parser ---
        if "pause" in lower:
            return ParsedVoiceCommand(
                intent=VoiceIntent.PAUSE,
                language="en",
                raw_text=raw,
                response_speech_tamil="செயல்பாடுகள் தற்காலிகமாக நிறுத்தப்பட்டன.",
                response_speech_english="Jarvis execution paused."
            )
        if "resume" in lower or "continue" in lower:
            return ParsedVoiceCommand(
                intent=VoiceIntent.RESUME,
                language="en",
                raw_text=raw,
                response_speech_tamil="செயல்பாடுகள் மீண்டும் தொடர்கின்றன.",
                response_speech_english="Jarvis execution resumed."
            )
        if "stop" in lower or "abort" in lower or "cancel" in lower:
            return ParsedVoiceCommand(
                intent=VoiceIntent.STOP,
                language="en",
                raw_text=raw,
                response_speech_tamil="செயல்பாடுகள் நிறுத்தப்பட்டன.",
                response_speech_english="Jarvis execution terminated."
            )
        if "export" in lower or "download" in lower:
            return ParsedVoiceCommand(
                intent=VoiceIntent.EXPORT_RESULTS,
                language="en",
                raw_text=raw,
                response_speech_tamil="ஆய்வு முடிவுகள் எக்செல் கோப்பாக பதிவிறக்கப்படுகிறது.",
                response_speech_english="Jarvis is exporting intelligence results to Excel."
            )
        if "process my excel" in lower or "process file" in lower:
            return ParsedVoiceCommand(
                intent=VoiceIntent.PROCESS_FILE,
                language="en",
                raw_text=raw,
                response_speech_tamil="எக்செல் கோப்பு செயலாக்கப்படுகிறது.",
                response_speech_english="Jarvis is processing pending companies from file."
            )
        if "status" in lower:
            return ParsedVoiceCommand(
                intent=VoiceIntent.SHOW_STATUS,
                language="en",
                raw_text=raw,
                response_speech_tamil="ஜார்விஸ் தயார் நிலையில் உள்ளது.",
                response_speech_english="Jarvis status: All intelligence engines are online."
            )

        m_res_en = re.search(r'(?:research|investigate|analyze|process)\s+([a-zA-Z0-9\s&.-]+)', lower)
        if m_res_en:
            comp = m_res_en.group(1).replace("about", "").replace("for", "").strip().title()
            return ParsedVoiceCommand(
                intent=VoiceIntent.RESEARCH_COMPANY,
                company=comp,
                role="CEO",
                language="en",
                raw_text=raw,
                response_speech_tamil=f"ஜார்விஸ் {comp} நிறுவனத்தை ஆராய்கிறது.",
                response_speech_english=f"Jarvis is executing autonomous research on {comp}."
            )

        m_lead = re.search(r'find\s+(?:the\s+)?(ceo|cto|cfo|founder|president)\s+(?:of|at|for)\s+([a-zA-Z0-9\s&.-]+)', lower)
        if m_lead:
            role = m_lead.group(1).upper()
            comp = m_lead.group(2).strip().title()
            intent_map = {"CEO": VoiceIntent.FIND_CEO, "CTO": VoiceIntent.FIND_CTO, "CFO": VoiceIntent.FIND_CFO}
            return ParsedVoiceCommand(
                intent=intent_map.get(role, VoiceIntent.FIND_CEO),
                company=comp,
                role=role,
                language="en",
                raw_text=raw,
                response_speech_tamil=f"ஜார்விஸ் {comp} நிறுவனத்தின் {role} பொறுப்பாளரை தேடுகிறது.",
                response_speech_english=f"Jarvis is locating the {role} of {comp}."
            )

        return ParsedVoiceCommand(
            intent=VoiceIntent.UNKNOWN,
            language="ta" if is_tamil else "en",
            raw_text=raw,
            response_speech_tamil="மன்னிக்கவும், கட்டளையை அடையாளம் காண முடியவில்லை.",
            response_speech_english="Command not recognized. Please specify a company or action."
        )
`
  },
  {
    path: 'jarvis/database/postgres.py',
    category: 'database',
    content: `"""
JARVIS 2.0 — PostgreSQL / SQLAlchemy Enterprise Database Layer.
Supports PostgreSQL connection pool with seamless SQLite local fallback.
"""

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime, timezone
from config import settings

Base = declarative_base()

class ResearchSession(Base):
    __tablename__ = "research_sessions"

    id = Column(String(64), primary_key=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    total_companies = Column(Integer, default=0)
    status = Column(String(32), default="COMPLETED")

    companies = relationship("CompanyIntelligenceRecord", back_populates="session", cascade="all, delete-orphan")

class CompanyIntelligenceRecord(Base):
    __tablename__ = "company_intelligence_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("research_sessions.id"), nullable=False, index=True)
    run_id = Column(String(32), nullable=False, index=True)
    company_name = Column(String(255), nullable=False, index=True)
    official_website = Column(String(512), default="NOT_FOUND")
    domain = Column(String(255), default="NOT_FOUND", index=True)
    industry = Column(String(255), default="Technology")
    headquarters = Column(String(255), default="Global")
    ceo_name = Column(String(255), default="NOT_FOUND")
    cto_name = Column(String(255), default="NOT_FOUND")
    cfo_name = Column(String(255), default="NOT_FOUND")
    key_decision_maker = Column(String(255), default="NOT_FOUND")
    key_decision_maker_role = Column(String(255), default="NOT_FOUND")
    public_linkedin_url = Column(String(512), default="NOT_FOUND")
    public_business_email = Column(String(255), default="NOT_FOUND")
    email_status = Column(String(64), default="NOT_FOUND")
    source_urls = Column(Text, default="")
    confidence_score = Column(Integer, default=0)
    verification_status = Column(String(64), default="NEEDS_REVIEW")
    research_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("ResearchSession", back_populates="companies")

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_postgres_db():
    Base.metadata.create_all(bind=engine)
`
  },
  {
    path: 'jarvis/automation/playwright_scraper.py',
    category: 'automation',
    content: `"""
JARVIS 2.0 — Playwright & BeautifulSoup Compliant Public Web Scraper.
Extracts public corporate leadership without bypassing CAPTCHAs or private auth.
"""

import httpx
from bs4 import BeautifulSoup
from typing import Optional, Dict
from jarvis.utils.urls import extract_domain_from_url

class PlaywrightCorporateScraper:
    def __init__(self, timeout: int = 15):
        self.timeout = timeout
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 JARVIS-2.0-Audit/2.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }

    async def fetch_public_page(self, url: str) -> Optional[Dict[str, str]]:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                resp = await client.get(url, headers=self.headers)
                if resp.status_code != 200:
                    return None

                soup = BeautifulSoup(resp.text, "html.parser")
                for s in soup(["script", "style", "nav", "footer", "noscript"]):
                    s.decompose()

                title = soup.title.string.strip() if soup.title and soup.title.string else ""
                text = " ".join(soup.stripped_strings)[:12000]

                return {
                    "url": str(resp.url),
                    "domain": extract_domain_from_url(str(resp.url)),
                    "title": title,
                    "content": text
                }
        except Exception:
            return None
`
  },
  {
    path: 'api/main.py',
    category: 'api',
    content: `"""
JARVIS 2.0 — FastAPI Application with WebSockets and REST Endpoints.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from jarvis.database.postgres import init_postgres_db
from api.routes import router

app = FastAPI(
    title=settings.APP_NAME,
    version="2.0.0",
    description="Autonomous AI Company Intelligence Platform with WebSockets and Bilingual Voice"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_postgres_db()

app.include_router(router)

# WebSocket Real-Time Pipeline Stream
@app.websocket("/ws/pipeline")
async def websocket_pipeline_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({
                "type": "ACK",
                "message": "Stream connected to JARVIS 2.0 pipeline."
            })
    except WebSocketDisconnect:
        pass
`
  },
  {
    path: 'tests/test_jarvis2_core.py',
    category: 'tests',
    content: `"""
JARVIS 2.0 — Pytest Unit Test Suite.
Verifies compliance, bilingual voice parsing, domain anti-spoofing, and confidence scoring.
"""

import pytest
from jarvis.voice.tamil_english_router import TamilEnglishCommandRouter, VoiceIntent
from jarvis.utils.urls import extract_domain_from_url
from jarvis.ai.scorer import ConfidenceScorer

def test_tamil_voice_parsing():
    c1 = TamilEnglishCommandRouter.parse("ஜார்விஸ், ஜோஹோ நிறுவனத்தை ஆராய்")
    assert c1.intent == VoiceIntent.RESEARCH_COMPANY
    assert c1.language == "ta"

    c2 = TamilEnglishCommandRouter.parse("ஜார்விஸ், நிலவரத்தை சொல்")
    assert c2.intent == VoiceIntent.SHOW_STATUS

    c3 = TamilEnglishCommandRouter.parse("ஜார்விஸ், எக்செல் ஏற்றுமதி செய்")
    assert c3.intent == VoiceIntent.EXPORT_RESULTS

def test_english_voice_parsing():
    c1 = TamilEnglishCommandRouter.parse("Jarvis, research Apple Inc.")
    assert c1.intent == VoiceIntent.RESEARCH_COMPANY
    assert "Apple" in c1.company

    c2 = TamilEnglishCommandRouter.parse("Jarvis, find CEO of Zoho")
    assert c2.intent == VoiceIntent.FIND_CEO
    assert c2.company == "Zoho"

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
`
  }
];
