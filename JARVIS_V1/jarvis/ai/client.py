"""
AIClient wrapper for OpenAI Responses API with structured JSON output support.
"""

from typing import Any, Dict, Optional, Type
from pydantic import BaseModel
import openai
from config import settings
from jarvis.utils.logger import logger

class AIClient:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self._client = None
        if self.api_key:
            self._client = openai.OpenAI(api_key=self.api_key)

    def is_available(self) -> bool:
        return bool(self._client and self.api_key.strip())

    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[BaseModel]
    ) -> Optional[BaseModel]:
        """
        Calls OpenAI API with structured response format to parse directly into a Pydantic model.
        """
        if not self.is_available():
            logger.warning("OpenAI API key not configured. Using fallback parsing.")
            return None

        try:
            # Using OpenAI beta/parse or chat completions with response_format
            completion = self._client.beta.chat.completions.parse(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format=response_model,
                temperature=0.1
            )
            parsed = completion.choices[0].message.parsed
            return parsed
        except Exception as e:
            logger.error(f"OpenAI structured parsing failed: {e}")
            return None
