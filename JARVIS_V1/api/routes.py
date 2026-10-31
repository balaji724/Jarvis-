"""
FastAPI router definition implementing all required JARVIS V1 endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from config import settings
from jarvis.database.database import get_db_connection, init_db
from jarvis.database.models import CompanyResult
from jarvis.pipeline.orchestrator import Orchestrator
from .schemas import (
    ResearchCompanyRequest,
    JobActionResponse,
    HealthResponse,
    PipelineStatusResponse
)

router = APIRouter()
orchestrator = Orchestrator()

@router.get("/health", response_model=HealthResponse)
def get_health():
    db_ok = True
    try:
        init_db()
    except Exception:
        db_ok = False

    return HealthResponse(
        status="healthy" if db_ok else "degraded",
        version="1.0.0",
        database_ok=db_ok,
        tavily_configured=bool(settings.TAVILY_API_KEY),
        openai_configured=bool(settings.OPENAI_API_KEY),
        sheets_configured=bool(settings.GOOGLE_SHEET_ID)
    )

@router.get("/status", response_model=PipelineStatusResponse)
def get_status():
    return orchestrator.get_status()

@router.post("/jobs/start", response_model=JobActionResponse)
def start_jobs(background_tasks: BackgroundTasks, limit: Optional[int] = None):
    background_tasks.add_task(orchestrator.process_pending_companies, limit=limit)
    return JobActionResponse(status="accepted", message="Pipeline started for pending sheet rows.")

@router.post("/jobs/pause", response_model=JobActionResponse)
def pause_jobs():
    orchestrator.pause()
    return JobActionResponse(status="paused", message="Pipeline execution paused.")

@router.post("/jobs/resume", response_model=JobActionResponse)
def resume_jobs():
    orchestrator.resume()
    return JobActionResponse(status="resumed", message="Pipeline execution resumed.")

@router.post("/jobs/stop", response_model=JobActionResponse)
def stop_jobs():
    orchestrator.stop()
    return JobActionResponse(status="stopped", message="Pipeline execution terminated.")

@router.post("/research/company")
def research_company(req: ResearchCompanyRequest):
    results = orchestrator.process_single_company(
        company_name=req.company,
        city=req.city or "",
        country=req.country or "",
        target_role=req.role or "CEO",
        max_people=req.max_people or 1,
        dry_run=False
    )
    return {
        "company": req.company,
        "count": len(results),
        "results": [r.model_dump() for r in results]
    }

@router.get("/results")
def list_results(limit: int = 50):
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM discovered_people ORDER BY id DESC LIMIT ?",
            (limit,)
        ).fetchall()
        return [dict(r) for r in rows]

@router.get("/results/{company}")
def get_company_results(company: str):
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM discovered_people WHERE LOWER(company) = LOWER(?) ORDER BY id DESC",
            (company,)
        ).fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail=f"No results found for company '{company}'")
        return [dict(r) for r in rows]

@router.post("/export/excel")
def trigger_excel_export():
    path = orchestrator.export_excel()
    return {"status": "success", "file_path": path}
