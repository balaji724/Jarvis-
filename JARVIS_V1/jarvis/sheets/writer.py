"""
Google Sheets Writer for JARVIS V1.
Creates/formats 'Output' tab, writes enriched results, and updates row statuses in 'Input'.
"""

from typing import List, Optional
from config import settings
from jarvis.database.models import CompanyResult, PipelineJobStatus
from jarvis.utils.logger import logger
from .client import SheetsClient

OUTPUT_HEADERS = [
    "Company",
    "City",
    "Country",
    "Domain",
    "First Name",
    "Last Name",
    "Full Name",
    "Designation",
    "Email",
    "Email Status",
    "LinkedIn URL",
    "Source URLs",
    "Confidence",
    "Verification Status",
    "Run ID",
    "Updated At",
]

class SheetsWriter:
    def __init__(self, client: Optional[SheetsClient] = None, sheet_id: Optional[str] = None):
        self.client = client or SheetsClient()
        self.sheet_id = sheet_id or settings.GOOGLE_SHEET_ID
        self.output_tab = settings.OUTPUT_TAB
        self.input_tab = settings.INPUT_TAB

    def ensure_output_sheet(self) -> bool:
        """
        Ensures the Output tab exists and has the required headers.
        """
        if not self.sheet_id:
            return False

        service = self.client.get_service()
        if not service:
            return False

        try:
            # Check sheet metadata
            spreadsheet = service.spreadsheets().get(spreadsheetId=self.sheet_id).execute()
            sheet_names = [s["properties"]["title"] for s in spreadsheet.get("sheets", [])]

            if self.output_tab not in sheet_names:
                # Create Output tab
                add_sheet_body = {
                    "requests": [
                        {
                            "addSheet": {
                                "properties": {
                                    "title": self.output_tab,
                                    "gridProperties": {
                                        "frozenRowCount": 1
                                    }
                                }
                            }
                        }
                    ]
                }
                service.spreadsheets().batchUpdate(
                    spreadsheetId=self.sheet_id,
                    body=add_sheet_body
                ).execute()

                # Write headers
                service.spreadsheets().values().update(
                    spreadsheetId=self.sheet_id,
                    range=f"{self.output_tab}!A1:P1",
                    valueInputOption="RAW",
                    body={"values": [OUTPUT_HEADERS]}
                ).execute()
                logger.info(f"Created '{self.output_tab}' tab in Google Sheet.")
            return True
        except Exception as e:
            logger.error(f"Failed to ensure output sheet: {e}")
            return False

    def write_results(self, results: List[CompanyResult]) -> bool:
        """
        Appends a list of CompanyResult rows to the Output tab.
        """
        if not results or not self.sheet_id:
            return False

        self.ensure_output_sheet()
        service = self.client.get_service()
        if not service:
            return False

        rows = [r.to_sheet_row() for r in results]
        try:
            service.spreadsheets().values().append(
                spreadsheetId=self.sheet_id,
                range=f"{self.output_tab}!A:P",
                valueInputOption="RAW",
                insertDataOption="INSERT_ROWS",
                body={"values": rows}
            ).execute()
            logger.info(f"Appended {len(rows)} rows to '{self.output_tab}' tab.")
            return True
        except Exception as e:
            logger.error(f"Error appending results to Google Sheets: {e}")
            return False

    def update_input_status(self, row_index: int, status: str) -> bool:
        """
        Updates the 'Status' column (Column F) of a specific row in the Input tab.
        """
        if not self.sheet_id or not row_index:
            return False

        service = self.client.get_service()
        if not service:
            return False

        try:
            cell = f"{self.input_tab}!F{row_index}"
            service.spreadsheets().values().update(
                spreadsheetId=self.sheet_id,
                range=cell,
                valueInputOption="RAW",
                body={"values": [[status]]}
            ).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to update input row {row_index} status to '{status}': {e}")
            return False
