"""
Configuration module for JARVIS V1.
Handles loading environment variables with fallback defaults and type validation.
"""

from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent

class Settings(BaseSettings):
    # AI Model Settings
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key for structured Responses API")
    OPENAI_MODEL: str = Field(default="gpt-5.6-luna", description="Model name for extraction and verification")

    # Search Provider Settings
    TAVILY_API_KEY: str = Field(default="", description="Tavily Search API key")
    MAX_SEARCH_RESULTS: int = Field(default=6, description="Max search results per query")

    # Google Sheets Settings
    GOOGLE_SHEET_ID: str = Field(default="", description="Google Sheets Spreadsheet ID")
    GOOGLE_CREDENTIALS_PATH: str = Field(default="credentials.json", description="Path to OAuth client secrets")
    GOOGLE_TOKEN_PATH: str = Field(default="token.json", description="Path to cached user OAuth token")
    INPUT_TAB: str = Field(default="Input", description="Worksheet name for input queries")
    OUTPUT_TAB: str = Field(default="Output", description="Worksheet name for results")

    # Execution & Performance
    MAX_WORKERS: int = Field(default=5, description="Maximum concurrent company research workers")
    CACHE_TTL_HOURS: int = Field(default=168, description="SQLite Cache time-to-live in hours (default 7 days)")
    REQUEST_TIMEOUT: int = Field(default=20, description="HTTP request timeout in seconds")

    # Confidence Thresholds
    MIN_CONFIDENCE: int = Field(default=75, description="Minimum confidence score required for high-confidence match")

    # Voice / Audio Settings
    TTS_VOICE_RATE: int = Field(default=180, description="Words per minute for text to speech")
    TTS_VOLUME: float = Field(default=1.0, description="Volume level between 0.0 and 1.0")
    VOICE_INPUT_TIMEOUT: int = Field(default=8, description="Microphone silence timeout in seconds")

    # Paths
    SQLITE_DB_PATH: str = Field(default=str(BASE_DIR / "data" / "cache" / "jarvis.db"))
    EXPORTS_DIR: str = Field(default=str(BASE_DIR / "data" / "exports"))
    LOGS_DIR: str = Field(default=str(BASE_DIR / "logs"))

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist
Path(settings.SQLITE_DB_PATH).parent.mkdir(parents=True, exist_ok=True)
Path(settings.EXPORTS_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.LOGS_DIR).mkdir(parents=True, exist_ok=True)
