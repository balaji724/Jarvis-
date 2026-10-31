"""
JARVIS 2.0 — Bilingual Tamil + English Voice Command Router.
Parses natural language speech commands in both Tamil and English into strongly typed intent payloads.
"""

import re
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class VoiceIntent(str, Enum):
    RESEARCH_COMPANY = "RESEARCH_COMPANY"
    FIND_CEO = "FIND_CEO"
    FIND_CTO = "FIND_CTO"
    FIND_CFO = "FIND_CFO"
    FIND_PEOPLE = "FIND_PEOPLE"
    PROCESS_FILE = "PROCESS_FILE"
    PROCESS_SHEET = "PROCESS_SHEET"
    PROCESS_PENDING = "PROCESS_PENDING"
    PROCESS_COMPANY = "PROCESS_COMPANY"
    SHOW_STATUS = "SHOW_STATUS"
    PAUSE = "PAUSE"
    RESUME = "RESUME"
    STOP = "STOP"
    EXPORT_EXCEL = "EXPORT_EXCEL"
    UNKNOWN = "UNKNOWN"

class ParsedCommand(BaseModel):
    intent: VoiceIntent
    company: Optional[str] = None
    role: Optional[str] = "CEO"
    max_people: int = 1
    language: str = "en"
    raw_text: str
    response_speech_tamil: str = ""
    response_speech_english: str = ""

WORD_NUMBER_MAP = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
}

class CommandRouter:
    @staticmethod
    def parse(text: str) -> ParsedCommand:
        raw = text.strip()
        cleaned = re.sub(r'^(jarvis|hey jarvis|ok jarvis|please jarvis|ஜார்விஸ்)[,\s]*', '', raw, flags=re.IGNORECASE).strip()
        lower = cleaned.lower()
        is_tamil = bool(re.search(r'[\u0B80-\u0BFF]', raw))

        # --- Tamil NLP Parser ---
        if is_tamil:
            if any(w in raw for w in ["நிறுத்து", "நிறுத்துங்கள்"]):
                return ParsedCommand(
                    intent=VoiceIntent.STOP,
                    language="ta",
                    raw_text=raw,
                    response_speech_tamil="ஜார்விஸ் செயல்பாடுகள் நிறுத்தப்பட்டன.",
                    response_speech_english="Jarvis operations stopped."
                )

            if any(w in raw for w in ["நிலவரம்", "நிலை", "ரிப்போர்ட்"]):
                return ParsedCommand(
                    intent=VoiceIntent.SHOW_STATUS,
                    language="ta",
                    raw_text=raw,
                    response_speech_tamil="ஜார்விஸ் தயார் நிலையில் உள்ளது. அனைத்து தொகுதிகளும் இயங்குகின்றன.",
                    response_speech_english="Jarvis status: all systems operational."
                )

            if any(w in raw for w in ["எக்செல்", "கோப்பு", "ஃபைல்"]):
                return ParsedCommand(
                    intent=VoiceIntent.PROCESS_FILE,
                    language="ta",
                    raw_text=raw,
                    response_speech_tamil="ஜார்விஸ் எக்செல் கோப்பில் உள்ள நிறுவனங்களை செயலாக்குகிறது.",
                    response_speech_english="Jarvis is processing companies from the file."
                )

            if any(w in raw for w in ["ஏற்றுமதி", "பதிவிறக்கு"]):
                return ParsedCommand(
                    intent=VoiceIntent.EXPORT_EXCEL,
                    language="ta",
                    raw_text=raw,
                    response_speech_tamil="ஜார்விஸ் ஆய்வு முடிவுகளை எக்செல் வடிவத்தில் ஏற்றுமதி செய்கிறது.",
                    response_speech_english="Jarvis is exporting results to Excel."
                )

            # Match: "[நிறுவனம்] நிறுவனத்தை ஆராய்"
            m_res = re.search(r'(?:ஜார்விஸ்,?\s*)?([^\s,]+(?:\s+[^\s,]+)?)\s+(?:நிறுவனத்தை\s+ஆராய்|ஆராய்ச்சி\s+செய்|பற்றி\s+ஆராய்)', raw)
            if m_res:
                comp = m_res.group(1).replace("நிறுவனம்", "").replace("கம்பெனி", "").strip()
                return ParsedCommand(
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
                return ParsedCommand(
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
            return ParsedCommand(
                intent=VoiceIntent.PAUSE,
                language="en",
                raw_text=raw,
                response_speech_tamil="செயல்பாடுகள் தற்காலிகமாக நிறுத்தப்பட்டன.",
                response_speech_english="Jarvis execution paused."
            )
        if "resume" in lower or "continue" in lower:
            return ParsedCommand(
                intent=VoiceIntent.RESUME,
                language="en",
                raw_text=raw,
                response_speech_tamil="செயல்பாடுகள் மீண்டும் தொடர்கின்றன.",
                response_speech_english="Jarvis execution resumed."
            )
        if "stop" in lower or "abort" in lower or "cancel" in lower:
            return ParsedCommand(
                intent=VoiceIntent.STOP,
                language="en",
                raw_text=raw,
                response_speech_tamil="செயல்பாடுகள் நிறுத்தப்பட்டன.",
                response_speech_english="Jarvis execution terminated."
            )
        if "export excel" in lower or "download excel" in lower or "export to excel" in lower or "export the results" in lower:
            return ParsedCommand(
                intent=VoiceIntent.EXPORT_EXCEL,
                language="en",
                raw_text=raw,
                response_speech_tamil="ஆய்வு முடிவுகள் எக்செல் கோப்பாக பதிவிறக்கப்படுகிறது.",
                response_speech_english="Jarvis is preparing your Excel export."
            )
        if "process my excel" in lower or "process excel" in lower or "process my file" in lower:
            return ParsedCommand(
                intent=VoiceIntent.PROCESS_FILE,
                language="en",
                raw_text=raw,
                response_speech_tamil="எக்செல் கோப்பு செயலாக்கப்படுகிறது.",
                response_speech_english="Jarvis is processing pending companies from file."
            )
        if "process my google sheet" in lower or "process sheet" in lower or "sync sheet" in lower:
            return ParsedCommand(
                intent=VoiceIntent.PROCESS_SHEET,
                language="en",
                raw_text=raw,
                response_speech_tamil="கூகுள் ஷீட்ஸ் செயலாக்கப்படுகிறது.",
                response_speech_english="Jarvis is processing your Google Sheet."
            )
        if "process pending" in lower:
            return ParsedCommand(
                intent=VoiceIntent.PROCESS_PENDING,
                language="en",
                raw_text=raw,
                response_speech_tamil="நிலுவையில் உள்ள நிறுவனங்கள் செயலாக்கப்படுகின்றன.",
                response_speech_english="Jarvis is processing pending companies."
            )
        if "status" in lower or "show status" in lower:
            return ParsedCommand(
                intent=VoiceIntent.SHOW_STATUS,
                language="en",
                raw_text=raw,
                response_speech_tamil="ஜார்விஸ் தயார் நிலையில் உள்ளது.",
                response_speech_english="Jarvis status: All intelligence engines are online."
            )

        # "research <Company>"
        m_res = re.search(r'(?:research|investigate|analyze)\s+([a-zA-Z0-9\s&.-]+)', lower)
        if m_res:
            comp = m_res.group(1).replace("about", "").replace("for", "").strip().title()
            return ParsedCommand(
                intent=VoiceIntent.RESEARCH_COMPANY,
                company=comp,
                role="CEO",
                language="en",
                raw_text=raw,
                response_speech_tamil=f"ஜார்விஸ் {comp} நிறுவனத்தை ஆராய்கிறது.",
                response_speech_english=f"Jarvis is researching {comp}."
            )

        # "find <role> of <company>"
        m_role = re.search(r'find\s+(?:the\s+)?(ceo|cto|cfo|founder|president)\s+(?:of|at|for)\s+([a-zA-Z0-9\s&.-]+)', lower)
        if m_role:
            role = m_role.group(1).upper()
            comp = m_role.group(2).strip().title()
            return ParsedCommand(
                intent=VoiceIntent.FIND_PEOPLE,
                company=comp,
                role=role,
                max_people=1,
                language="en",
                raw_text=raw,
                response_speech_tamil=f"ஜார்விஸ் {comp} நிறுவனத்தின் {role} அதிகாரியை தேடுகிறது.",
                response_speech_english=f"Jarvis is locating the {role} of {comp}."
            )

        return ParsedCommand(
            intent=VoiceIntent.UNKNOWN,
            language="ta" if is_tamil else "en",
            raw_text=raw,
            response_speech_tamil="மன்னிக்கவும், கட்டளையை அடையாளம் காண முடியவில்லை.",
            response_speech_english="Command not recognized. Please repeat or type your instruction."
        )
