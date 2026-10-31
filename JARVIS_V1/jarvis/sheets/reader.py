"""
Google Sheets Reader for JARVIS V1.
Reads target companies from the 'Input' worksheet and extracts pending rows.
"""

from typing import List, Optional
from config import settings
from jarvis.database.models import CompanyInput
from jarvis.utils.logger import logger
from .client import SheetsClient

EXPECTED_INPUT_HEADERS = ["Company Name", "City", "Country", "Target Role", "Max People", "Status"]

class SheetsReader:
    def __init__(self, client: Optional[SheetsClient] = None, sheet_id: Optional[str] = None):
        self.client = client or SheetsClient()
        self.sheet_id = sheet_id or settings.GOOGLE_SHEET_ID
        self.input_tab = settings.INPUT_TAB

    def read_all_rows(self) -> List[CompanyInput]:
        """
        Reads all company rows from the Input worksheet.
        """
        if not self.sheet_id:
            logger.warning("GOOGLE_SHEET_ID not provided in configuration.")
            return []

        service = self.client.get_service()
        if not service:
            return []

        try:
            range_name = f"{self.input_tab}!A1:F"
            result = service.spreadsheets().values().get(
                spreadsheetId=self.sheet_id,
                range=range_name
            ).execute()

            values = result.get("values", [])
            if not values or len(values) < 2:
                logger.info("No data rows found in Input sheet.")
                return []

            headers = [h.strip() for h in values[0]]
            # Map column indices
            col_map = {name: idx for idx, name in enumerate(headers)}

            items: List[CompanyInput] = []
            for r_idx, row in enumerate(values[1:], start=2):
                # Ensure row has enough cells
                def get_val(name: str, default: str = "") -> str:
                    idx = col_map.get(name)
                    if idx is not None and idx < len(row):
                        return row[idx].strip()
                    return default

                company_name = get_val("Company Name")
                if not company_name:
                    continue

                items.append(
                    CompanyInput(
                        company_name=company_name,
                        city=get_val("City"),
                        country=get_val("Country"),
                        target_role=get_val("Target Role", "CEO"),
                        max_people=int(get_val("Max People", "1") or "1"),
                        status=get_val("Status", "Pending"),
                        row_index=r_idx
                    )
                )

            return items
        except Exception as e:
            logger.error(f"Error reading from Google Sheets: {e}")
            return []

    def get_pending_companies(self, limit: Optional[int] = None) -> List[CompanyInput]:
        """
        Filters input companies for rows with Status == 'Pending' or empty.
        """
        all_rows = self.read_all_rows()
        pending = [r for r in all_rows if (r.status.lower() in ("pending", "") or not r.status)]
        if limit:
            return pending[:limit]
        return pending
