"""
Google Sheets API client and OAuth authentication manager.
"""

from pathlib import Path
from typing import Optional
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build, Resource
from config import settings
from jarvis.utils.logger import logger

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets"
]

class SheetsClient:
    def __init__(
        self,
        credentials_path: Optional[str] = None,
        token_path: Optional[str] = None
    ):
        self.credentials_path = credentials_path or settings.GOOGLE_CREDENTIALS_PATH
        self.token_path = token_path or settings.GOOGLE_TOKEN_PATH
        self._service: Optional[Resource] = None

    def is_configured(self) -> bool:
        return Path(self.credentials_path).exists() or Path(self.token_path).exists()

    def get_service(self) -> Optional[Resource]:
        """
        Authenticates via OAuth 2.0 and returns the Google Sheets API Resource.
        """
        if self._service:
            return self._service

        creds = None
        token_file = Path(self.token_path)
        creds_file = Path(self.credentials_path)

        if token_file.exists():
            try:
                creds = Credentials.from_authorized_user_file(str(token_file), SCOPES)
            except Exception as e:
                logger.warning(f"Failed to load cached OAuth token from {token_file}: {e}")

        # Refresh or run local OAuth flow
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                except Exception as e:
                    logger.warning(f"Could not refresh OAuth token: {e}")
                    creds = None

            if not creds:
                if not creds_file.exists():
                    logger.warning(
                        f"OAuth credentials file '{self.credentials_path}' not found. "
                        "Please download OAuth client JSON from Google Cloud Console."
                    )
                    return None

                flow = InstalledAppFlow.from_client_secrets_file(str(creds_file), SCOPES)
                creds = flow.run_local_server(port=0)

            # Save the valid credentials for subsequent runs
            try:
                with open(str(token_file), "w", encoding="utf-8") as token_out:
                    token_out.write(creds.to_json())
            except Exception as e:
                logger.warning(f"Could not write token cache file: {e}")

        try:
            self._service = build("sheets", "v4", credentials=creds)
            return self._service
        except Exception as e:
            logger.error(f"Failed to build Google Sheets service: {e}")
            return None
