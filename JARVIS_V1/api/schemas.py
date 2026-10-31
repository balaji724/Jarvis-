"""
Pydantic API request/response schemas for JARVIS V1 endpoints.
"""

from typing import List, Optional
from pydantic import BaseModel, Field

class ResearchCompanyRequest(BaseModel):
    company: str = Field(..., example="Zoho")
    city: Optional[str] = Field(default="", example="Chennai")
    country: Optional[str] = Field(default="", example="India")
    role: Optional[str] = Field(default="CEO", example="CEO")
    max_people: Optional[int] = Field(default=1, example=1)

class JobActionResponse(BaseModel):
    status: str
    message: str

class HealthResponse(BaseModel):
    status: str
    version: str
    database_ok: bool
    tavily_configured: bool
    openai_configured: bool
    sheets_configured: bool

class PipelineStatusResponse(BaseModel):
    total_companies: int
    completed: int
    processing: int
    needs_review: int
    failed: int
    remaining: int
    current_company: str
    current_step: str
    confidence: int
    state: str
