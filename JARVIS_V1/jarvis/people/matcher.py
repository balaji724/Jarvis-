"""
Duplicate detection and person record merging for JARVIS V1.
"""

from typing import List, Optional
from jarvis.database.models import PersonRecord
from jarvis.utils.text import normalize_name, compute_similarity

class PeopleMatcher:
    @staticmethod
    def are_same_person(p1: PersonRecord, p2: PersonRecord) -> bool:
        """
        Determines if two person records represent the same individual.
        Compares normalized full name, LinkedIn URL, and designation.
        """
        # Exact LinkedIn match
        if p1.linkedin_url and p2.linkedin_url:
            if p1.linkedin_url.lower().rstrip("/") == p2.linkedin_url.lower().rstrip("/"):
                return True

        n1 = normalize_name(p1.full_name)
        n2 = normalize_name(p2.full_name)

        if not n1 or not n2:
            return False

        if n1 == n2:
            return True

        # Fuzzy match on high threshold
        sim = compute_similarity(n1, n2)
        if sim >= 0.88:
            return True

        # Check First + Last matching if initials differ
        parts1 = n1.split()
        parts2 = n2.split()
        if len(parts1) >= 2 and len(parts2) >= 2:
            if parts1[0] == parts2[0] and parts1[-1] == parts2[-1]:
                return True

        return False

    @staticmethod
    def merge_records(existing: PersonRecord, incoming: PersonRecord) -> PersonRecord:
        """
        Merges two records representing the same person, preserving highest confidence
        and combining evidence and sources.
        """
        merged_sources = list(dict.fromkeys(existing.source_urls + incoming.source_urls))
        merged_evidence = list(dict.fromkeys(existing.evidence + incoming.evidence))

        best_linkedin = existing.linkedin_url or incoming.linkedin_url
        best_email = existing.email or incoming.email
        best_email_status = existing.email_status if existing.email else incoming.email_status
        best_conf = max(existing.confidence, incoming.confidence)

        # Retain more specific designation
        desig = existing.designation
        if len(incoming.designation) > len(existing.designation) and existing.designation.lower() in incoming.designation.lower():
            desig = incoming.designation

        return PersonRecord(
            first_name=existing.first_name or incoming.first_name,
            last_name=existing.last_name or incoming.last_name,
            full_name=existing.full_name,
            designation=desig,
            email=best_email,
            email_status=best_email_status,
            linkedin_url=best_linkedin,
            source_urls=merged_sources,
            evidence=merged_evidence,
            confidence=best_conf,
            verification_status=existing.verification_status
        )

    @staticmethod
    def deduplicate(candidates: List[PersonRecord]) -> List[PersonRecord]:
        """
        Deduplicates a list of candidate records, merging overlaps.
        """
        unique_list: List[PersonRecord] = []
        for cand in candidates:
            matched = False
            for i, u in enumerate(unique_list):
                if PeopleMatcher.are_same_person(u, cand):
                    unique_list[i] = PeopleMatcher.merge_records(u, cand)
                    matched = True
                    break
            if not matched:
                unique_list.append(cand)
        return unique_list
