"""
Orchestrator coordinates concurrency, queue processing, sheets synchronization, and Excel export.
"""

import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

from config import settings
from jarvis.database.models import CompanyInput, CompanyResult, PipelineJobStatus
from jarvis.database.database import get_db_connection
from jarvis.sheets.reader import SheetsReader
from jarvis.sheets.writer import SheetsWriter
from jarvis.utils.logger import logger
from jarvis.voice.text_to_speech import speak
from .worker import ResearchWorker

class Orchestrator:
    def __init__(
        self,
        max_workers: Optional[int] = None,
        reader: Optional[SheetsReader] = None,
        writer: Optional[SheetsWriter] = None,
        worker: Optional[ResearchWorker] = None
    ):
        self.max_workers = max_workers or settings.MAX_WORKERS
        self.reader = reader or SheetsReader()
        self.writer = writer or SheetsWriter()
        self.worker = worker or ResearchWorker()

        self._is_paused = threading.Event()
        self._is_paused.set()  # set means running; clear means paused
        self._is_stopped = threading.Event()
        self._lock = threading.Lock()

        self.stats = {
            "total_companies": 0,
            "completed": 0,
            "processing": 0,
            "needs_review": 0,
            "failed": 0,
            "remaining": 0,
            "current_company": "Idle",
            "current_step": "Standby",
            "confidence": 0,
            "state": "STOPPED",
        }
        self.recent_results: List[CompanyResult] = []

    def pause(self) -> None:
        self._is_paused.clear()
        self.stats["state"] = "PAUSED"
        logger.info("Pipeline paused.")
        speak("Jarvis is paused.")

    def resume(self) -> None:
        self._is_paused.set()
        self.stats["state"] = "RUNNING"
        logger.info("Pipeline resumed.")
        speak("Jarvis is resuming operations.")

    def stop(self) -> None:
        self._is_stopped.set()
        self._is_paused.set()
        self.stats["state"] = "STOPPED"
        logger.info("Pipeline stopped.")
        speak("Jarvis operations stopped.")

    def get_status(self) -> Dict:
        with self._lock:
            return dict(self.stats)

    def process_pending_companies(self, limit: Optional[int] = None, dry_run: bool = False) -> List[CompanyResult]:
        """
        Reads pending companies from Input sheet and processes with concurrent workers.
        """
        self._is_stopped.clear()
        self._is_paused.set()
        self.stats["state"] = "RUNNING"

        pending_items = self.reader.get_pending_companies(limit=limit)
        total = len(pending_items)
        logger.info(f"Loaded {total} pending companies from Google Sheets.")

        with self._lock:
            self.stats["total_companies"] = total
            self.stats["remaining"] = total
            self.stats["completed"] = 0
            self.stats["failed"] = 0
            self.stats["needs_review"] = 0

        if not pending_items:
            speak("No pending companies found in Google Sheet.")
            self.stats["state"] = "IDLE"
            return []

        speak(f"Jarvis is processing {total} companies.")
        all_results: List[CompanyResult] = []

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_item = {
                executor.submit(self._worker_task, item, dry_run): item
                for item in pending_items
            }

            for future in as_completed(future_to_item):
                if self._is_stopped.is_set():
                    logger.warning("Pipeline stop requested. Terminating pending tasks.")
                    break

                try:
                    item, results, status = future.result()
                    with self._lock:
                        all_results.extend(results)
                        self.recent_results.extend(results)
                        if status == PipelineJobStatus.COMPLETED.value:
                            self.stats["completed"] += 1
                        elif status == PipelineJobStatus.NEEDS_REVIEW.value:
                            self.stats["needs_review"] += 1
                        else:
                            self.stats["failed"] += 1

                        self.stats["remaining"] = max(0, self.stats["remaining"] - 1)
                        if results:
                            self.stats["confidence"] = results[0].confidence

                    # Persist to SQLite
                    self._persist_results_sqlite(results)

                except Exception as e:
                    logger.error(f"Worker task error: {e}")
                    with self._lock:
                        self.stats["failed"] += 1
                        self.stats["remaining"] = max(0, self.stats["remaining"] - 1)

        self.stats["state"] = "COMPLETED"
        speak(f"Processing complete. {self.stats['completed']} verified, {self.stats['needs_review']} need review.")
        return all_results

    def process_single_company(
        self,
        company_name: str,
        city: str = "",
        country: str = "",
        target_role: str = "CEO",
        max_people: int = 1,
        dry_run: bool = False
    ) -> List[CompanyResult]:
        """
        Processes a single target company immediately.
        """
        item = CompanyInput(
            company_name=company_name,
            city=city,
            country=country,
            target_role=target_role,
            max_people=max_people,
            status="Pending"
        )
        _, results, _ = self._worker_task(item, dry_run=dry_run)
        self._persist_results_sqlite(results)
        return results

    def _worker_task(self, item: CompanyInput, dry_run: bool = False):
        # Wait if paused
        self._is_paused.wait()
        if self._is_stopped.is_set():
            return item, [], PipelineJobStatus.FAILED.value

        with self._lock:
            self.stats["current_company"] = item.company_name
            self.stats["current_step"] = "Executing Research"

        # Update input status to Processing in Google Sheet
        if not dry_run and item.row_index:
            self.writer.update_input_status(item.row_index, PipelineJobStatus.PROCESSING.value)

        item, results, status = self.worker.process_company(item)

        # Write output results to Google Sheet
        if not dry_run:
            if results:
                self.writer.write_results(results)
            if item.row_index:
                self.writer.update_input_status(item.row_index, status)

        return item, results, status

    def _persist_results_sqlite(self, results: List[CompanyResult]):
        if not results:
            return
        try:
            with get_db_connection() as conn:
                for r in results:
                    conn.execute(
                        """
                        INSERT INTO discovered_people
                        (run_id, company, domain, first_name, last_name, full_name, designation,
                         email, email_status, linkedin_url, source_urls, confidence, verification_status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (r.run_id, r.company, r.domain, r.first_name, r.last_name, r.full_name,
                         r.designation, r.email, r.email_status, r.linkedin_url, r.source_urls,
                         r.confidence, r.verification_status)
                    )
                conn.commit()
        except Exception as e:
            logger.error(f"Error persisting results to SQLite: {e}")

    def export_excel(self, output_path: Optional[str] = None) -> str:
        """
        Exports accumulated research results to a formatted Excel workbook with:
        - Bold headers
        - Autofilter
        - Freeze top row
        - Adjusted column widths
        - Readable URLs
        """
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        export_dir = Path(settings.EXPORTS_DIR)
        export_dir.mkdir(parents=True, exist_ok=True)
        filename = output_path or str(export_dir / f"jarvis_results_{ts}.xlsx")

        # Load from SQLite or recent_results
        with get_db_connection() as conn:
            df = pd.read_sql_query(
                "SELECT company, domain, first_name, last_name, full_name, designation, "
                "email, email_status, linkedin_url, source_urls, confidence, verification_status, "
                "run_id, created_at FROM discovered_people ORDER BY id DESC",
                conn
            )

        if df.empty and self.recent_results:
            df = pd.DataFrame([r.model_dump() for r in self.recent_results])

        if df.empty:
            df = pd.DataFrame(columns=[
                "company", "domain", "first_name", "last_name", "full_name",
                "designation", "email", "email_status", "linkedin_url",
                "source_urls", "confidence", "verification_status", "run_id"
            ])

        # Write with OpenPyXL formatting
        with pd.ExcelWriter(filename, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="JARVIS_Results", index=False)
            ws = writer.sheets["JARVIS_Results"]

            # Freeze top row
            ws.freeze_panes = "A2"

            # Header style: Bold, Dark Navy background, white text
            header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
            header_fill = PatternFill(start_color="1B365D", end_color="1B365D", fill_type="solid")
            for col in range(1, len(df.columns) + 1):
                cell = ws.cell(row=1, column=col)
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = Alignment(horizontal="center", vertical="center")

            # Enable auto-filter
            ws.auto_filter.ref = ws.dimensions

            # Auto-fit column widths
            for col in ws.columns:
                max_len = 0
                col_letter = get_column_letter(col[0].column)
                for cell in col:
                    val_str = str(cell.value or "")
                    if len(val_str) > max_len:
                        max_len = len(val_str)
                ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 45)

        logger.info(f"Excel export created successfully at: {filename}")
        speak("Excel export generated.")
        return filename
