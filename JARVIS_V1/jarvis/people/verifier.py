"""
Validation rules to ensure candidate entities are real human leaders and not webpage artifacts.
"""

from typing import Tuple
from jarvis.database.models import PersonRecord
from jarvis.utils.text import normalize_name

FALSE_POSITIVE_NAMES = {
    "privacy policy", "terms of service", "cookie settings", "about us",
    "contact us", "read more", "sign in", "learn more", "our team",
    "press release", "newsroom", "board members", "executive team",
    "customer support", "investor relations", "home page", "site map"
}

VALID_ROLES = [
    "ceo", "chief executive officer", "founder", "co-founder",
    "managing director", "director", "president", "cto",
    "chief technology officer", "cfo", "chief financial officer",
    "coo", "chief operating officer", "cmo", "head", "vp", "vice president"
]

class PeopleVerifier:
    @staticmethod
    def is_valid_person(person: PersonRecord, target_role: str = "") -> Tuple[bool, str]:
        """
        Validates person name and designation viability.
        """
        name_clean = normalize_name(person.full_name)
        if not name_clean:
            return False, "Empty or missing name"

        if name_clean in FALSE_POSITIVE_NAMES:
            return False, f"Name '{person.full_name}' is a website navigation artifact"

        parts = name_clean.split()
        if len(parts) < 2:
            return False, f"Name '{person.full_name}' lacks distinct first and last name"

        if any(len(p) > 25 for p in parts):
            return False, "Abnormally long token in name"

        desig_clean = person.designation.lower()
        if not any(role in desig_clean for role in VALID_ROLES):
            return False, f"Designation '{person.designation}' is not an executive role"

        return True, "Valid"
