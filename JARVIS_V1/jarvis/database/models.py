"""
Pydantic data models for inputs, outputs, validation, and domain state.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class EmailStatus(str, Enum):
    VERIFIED_PUBLIC = "VERIFIED_PUBLIC"
    INFERRED_NOT_VERIFIED = "INFERRED_NOT_VERIFIED"
    NOT_FOUND = "NOT_FOUND"

class VerificationStatus(str, Enum):
    VERIFIED = "VERIFIED"
    HIGH_CONFIDENCE = "HIGH_CONFIDENCE"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    FAILED = "FAILED"
    NOT_FOUND = "NOT_FOUND"

class PipelineJobStatus(str, Enum):
    PENDING = "Pending"
    PROCESSING = "Processing"
    COMPLETED = "Completed"
    NEEDS_REVIEW = "Needs Review"
    FAILED = "Failed"

class CompanyInput(BaseModel):
    """Represents a row read from the 'Input' worksheet."""
    company_name: str = Field(..., alias="Company Name")
    city: str = Field(default="", alias="City")
    country: str = Field(default="", alias="Country")
    target_role: str = Field(default="CEO", alias="Target Role")
    max_people: int = Field(default=1, alias="Max People")
    status: str = Field(default="Pending", alias="Status")
    row_index: Optional[int] = Field(default=None, description="1-based sheet row index")

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }

    @field_validator("max_people", mode="before")
    def parse_max_people(cls, v):
        try:
            return max(1, int(v))
        except Exception:
            return 1

class ConfidenceBreakdown(BaseModel):
    official_company_source: int = 0
    authoritative_source: int = 0
    two_independent_sources: int = 0
    exact_company_domain_match: int = 0
    role_match: int = 0
    location_match: int = 0
    total: int = 0

class PersonRecord(BaseModel):
    """Represents a single decision maker identified with evidence."""
    first_name: str = Field(default="")
    last_name: str = Field(default="")
    full_name: str = Field(...)
    designation: str = Field(...)
    email: Optional[str] = Field(default=None)
    email_status: EmailStatus = Field(default=EmailStatus.NOT_FOUND)
    linkedin_url: Optional[str] = Field(default=None)
    source_urls: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    confidence: int = Field(default=0, ge=0, le=100)
    verification_status: VerificationStatus = Field(default=VerificationStatus.NEEDS_REVIEW)

class CompanyResult(BaseModel):
    """Represents a row to be written to the 'Output' worksheet."""
    company: str
    city: str = ""
    country: str = ""
    domain: str = ""
    first_name: str = ""
    last_name: str = ""
    full_name: str = ""
    designation: str = ""
    email: Optional[str] = None
    email_status: str = EmailStatus.NOT_FOUND.value
    linkedin_url: Optional[str] = None
    source_urls: str = ""
    confidence: int = 0
    verification_status: str = VerificationStatus.NEEDS_REVIEW.value
    run_id: str
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))

    def to_sheet_row(self) -> List[str]:
        return [
            self.company,
            self.city,
            self.country,
            self.domain,
            self.first_name,
            self.last_name,
            self.full_name,
            self.designation,
            self.email or "NOT_FOUND",
            self.email_status,
            self.linkedin_url or "NOT_FOUND",
            self.source_urls,
            str(self.confidence),
            self.verification_status,
            self.run_id,
            self.updated_at,
        ]
