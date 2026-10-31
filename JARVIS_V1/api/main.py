"""
FastAPI application entry point for JARVIS V1.
"""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jarvis.database.database import init_db
from .routes import router

app = FastAPI(
    title="JARVIS V1 Automation API",
    description="Voice-Controlled Company Research & Google Sheets Automation Engine",
    version="1.0.0"
)

# Enable CORS for dashboard and local clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite database on startup
@app.on_event("startup")
def startup_event():
    init_db()

# Mount API routes
app.include_router(router)

# Mount Dashboard static assets if directory exists
dashboard_dir = Path(__file__).resolve().parent.parent / "dashboard"
if dashboard_dir.exists():
    app.mount("/dashboard", StaticFiles(directory=str(dashboard_dir), html=True), name="dashboard")
