"""
Speech-to-Text listener for JARVIS V1.
Captures voice commands from microphone using speech_recognition or text fallbacks.
"""

from typing import Optional
from config import settings
from jarvis.utils.logger import logger

class SpeechToText:
    def __init__(self, timeout: int = None):
        self.timeout = timeout or settings.VOICE_INPUT_TIMEOUT
        self._recognizer = None
        self._microphone = None
        self._has_mic = False

        try:
            import speech_recognition as sr
            self._recognizer = sr.Recognizer()
            # Try initializing default microphone
            self._microphone = sr.Microphone()
            self._has_mic = True
        except Exception as e:
            logger.info(f"Microphone input unavailable ({e}). Voice commands can be entered via prompt/API.")

    def listen_command(self) -> Optional[str]:
        """
        Listens for a voice utterance and transcribes it.
        """
        if not self._has_mic or not self._microphone or not self._recognizer:
            return None

        import speech_recognition as sr
        try:
            with self._microphone as source:
                self._recognizer.adjust_for_ambient_noise(source, duration=0.8)
                logger.info("Jarvis is listening for voice command...")
                audio = self._recognizer.listen(source, timeout=self.timeout, phrase_time_limit=10)
                text = self._recognizer.recognize_google(audio)
                logger.info(f"Voice recognized: '{text}'")
                return text
        except sr.WaitTimeoutError:
            return None
        except sr.UnknownValueError:
            logger.info("Speech was unintelligible.")
            return None
        except Exception as e:
            logger.warning(f"Speech recognition error: {e}")
            return None
