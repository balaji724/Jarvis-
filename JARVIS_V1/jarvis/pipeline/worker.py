"""
ResearchWorker executes the complete step-by-step pipeline for a single target company.
"""

import uuid
from typing import List, Tuple
from datetime import datetime, timezone
from jarvis.database.models import (
    CompanyInput,
    CompanyResult,
    PipelineJobStatus,
    VerificationStatus,
    EmailStatus
)
from jarvis.company.finder import CompanyFinder
from jarvis.people.finder import PeopleFinder
from jarvis.utils.logger import log_step, logger
from .retry import retry_with_backoff

class ResearchWorker:
    def __init__(
        self,
        company_finder: CompanyFinder = None,
        people_finder: PeopleFinder = None
    ):
        self.company_finder = company_finder or CompanyFinder()
        self.people_finder = people_finder or PeopleFinder()

    def process_company(self, item: CompanyInput) -> Tuple[CompanyInput, List[CompanyResult], str]:
        """
        Executes the 12-stage research pipeline for an input company row.
        Returns: (item, results, final_status_string)
        """
        run_id = uuid.uuid4().hex[:8]
        company_name = item.company_name.strip()
        log_step(run_id, company_name, "START_JOB", "PROCESSING")

        # 1. Company Discovery & Domain Verification
        try:
            discovered = self._discover_company_with_retry(company_name, item.city, item.country)
            log_step(
                run_id,
                company_name,
                "COMPANY_DISCOVERY",
                "SUCCESS" if discovered.domain else "NOT_FOUND",
                confidence=discovered.confidence
            )
        except Exception as e:
            log_step(run_id, company_name, "COMPANY_DISCOVERY", "FAILED", error=str(e))
            return item, [], PipelineJobStatus.FAILED.value

        if not discovered.domain:
            log_step(run_id, company_name, "DOMAIN_VERIFICATION", "NOT_FOUND")
            # If domain cannot be verified, create a NOT_FOUND output record
            not_found_res = CompanyResult(
                company=company_name,
                city=item.city,
                country=item.country,
                domain="NOT_FOUND",
                first_name="",
                last_name="",
                full_name="NOT_FOUND",
                designation=item.target_role,
                email=None,
                email_status=EmailStatus.NOT_FOUND.value,
                linkedin_url=None,
                source_urls="; ".join(discovered.source_urls),
                confidence=0,
                verification_status=VerificationStatus.NOT_FOUND.value,
                run_id=run_id
            )
            return item, [not_found_res], PipelineJobStatus.NEEDS_REVIEW.value

        log_step(run_id, company_name, "DOMAIN_VERIFICATION", "SUCCESS", confidence=discovered.confidence)

        # 2. Decision Maker Search & Extraction
        try:
            people = self.people_finder.find_decision_makers(
                company_name=company_name,
                official_domain=discovered.domain,
                city=item.city,
                country=item.country,
                target_role=item.target_role or "CEO",
                max_people=item.max_people or 1
            )
            log_step(
                run_id,
                company_name,
                "DECISION_MAKER_SEARCH",
                "SUCCESS" if people else "NOT_FOUND",
                confidence=people[0].confidence if people else 0
            )
        except Exception as e:
            log_step(run_id, company_name, "DECISION_MAKER_SEARCH", "FAILED", error=str(e))
            return item, [], PipelineJobStatus.FAILED.value

        if not people:
            no_person = CompanyResult(
                company=company_name,
                city=item.city,
                country=item.country,
                domain=discovered.domain,
                first_name="",
                last_name="",
                full_name="NOT_FOUND",
                designation=item.target_role,
                email=None,
                email_status=EmailStatus.NOT_FOUND.value,
                linkedin_url=None,
                source_urls="; ".join(discovered.source_urls),
                confidence=discovered.confidence // 2,
                verification_status=VerificationStatus.NEEDS_REVIEW.value,
                run_id=run_id
            )
            return item, [no_person], PipelineJobStatus.NEEDS_REVIEW.value

        # Build Output Rows
        results: List[CompanyResult] = []
        overall_confidence = 0
        for p in people:
            combined_sources = list(dict.fromkeys(discovered.source_urls + p.source_urls))
            res = CompanyResult(
                company=company_name,
                city=item.city,
                country=item.country,
                domain=discovered.domain,
                first_name=p.first_name,
                last_name=p.last_name,
                full_name=p.full_name,
                designation=p.designation,
                email=p.email,
                email_status=p.email_status.value if hasattr(p.email_status, "value") else str(p.email_status),
                linkedin_url=p.linkedin_url,
                source_urls="; ".join(combined_sources),
                confidence=p.confidence,
                verification_status=p.verification_status.value if hasattr(p.verification_status, "value") else str(p.verification_status),
                run_id=run_id
            )
            results.append(res)
            overall_confidence = max(overall_confidence, p.confidence)

        final_status = PipelineJobStatus.COMPLETED.value if overall_confidence >= 75 else PipelineJobStatus.NEEDS_REVIEW.value
        log_step(run_id, company_name, "COMPLETE_JOB", final_status, confidence=overall_confidence)

        return item, results, final_status

    @retry_with_backoff(max_attempts=3, initial_delay=1.0)
    def _discover_company_with_retry(self, company_name: str, city: str, country: str):
        return self.company_finder.find_company(company_name, city, country)
