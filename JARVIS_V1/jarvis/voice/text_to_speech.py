"""
Text-to-Speech engine for JARVIS V1.
Provides audible feedback with graceful fallback for headless servers or containers.
"""

from typing import Optional
from config import settings
from jarvis.utils.logger import logger

class TextToSpeech:
    def __init__(self):
        self._engine = None
        self._available = False
        try:
            import pyttsx3
            self._engine = pyttsx3.init()
            self._engine.setProperty("rate", settings.TTS_VOICE_RATE)
            self._engine.setProperty("volume", settings.TTS_VOLUME)
            self._available = True
        except Exception as e:
            logger.info(f"Local audio driver not initialized ({e}). Running in audio-console mode.")

    def speak(self, text: str) -> None:
        """
        Announces message via speech synthesizer, echoing to logger/console.
        """
        logger.info(f"[JARVIS SPEAKS]: \"{text}\"")
        if self._available and self._engine:
            try:
                self._engine.say(text)
                self._engine.runAndWait()
            except Exception as e:
                logger.warning(f"TTS runAndWait error: {e}")

_global_tts: Optional[TextToSpeech] = None

def speak(text: str) -> None:
    global _global_tts
    if _global_tts is None:
        _global_tts = TextToSpeech()
    _global_tts.speak(text)
