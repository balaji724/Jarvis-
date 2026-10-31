"""
People extractor coordinates AI parsing and rule-based verification.
"""

from typing import List, Optional
from jarvis.ai.extractor import AIExtractor
from jarvis.database.models import PersonRecord
from jarvis.utils.logger import logger
from .verifier import PeopleVerifier

class PeopleExtractor:
    def __init__(self, ai_extractor: Optional[AIExtractor] = None):
        self.extractor = ai_extractor or AIExtractor()

    def extract_and_verify(
        self,
        company_name: str,
        city: str,
        country: str,
        target_role: str,
        max_people: int,
        search_snippets: List[dict]
    ) -> List[PersonRecord]:
        """
        Extracts candidates and filters through PeopleVerifier.
        """
        raw_candidates = self.extractor.extract_candidates(
            company_name=company_name,
            city=city,
            country=country,
            target_role=target_role,
            max_people=max_people,
            search_snippets=search_snippets
        )

        valid_people: List[PersonRecord] = []
        for p in raw_candidates:
            ok, reason = PeopleVerifier.is_valid_person(p, target_role)
            if ok:
                valid_people.append(p)
            else:
                logger.info(f"Rejected candidate '{p.full_name}': {reason}")

        return valid_people
