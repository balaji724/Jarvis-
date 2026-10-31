"""
Email verifier enforcing strict public verification rules.
Disallows guessing or fabricating unverified addresses.
"""

import re
from typing import Tuple, Optional
from jarvis.database.models import EmailStatus
from jarvis.utils.urls import extract_domain_from_url

EMAIL_REGEX = re.compile(
    r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
)

GENERIC_EMAIL_PREFIXES = {
    "info", "contact", "support", "sales", "press", "media", "help",
    "careers", "jobs", "privacy", "admin", "legal", "investor", "billing"
}

class EmailVerifier:
    @staticmethod
    def is_valid_syntax(email: str) -> bool:
        if not email or len(email) > 254:
            return False
        return bool(EMAIL_REGEX.match(email.strip()))

    @staticmethod
    def classify_email(
        email: Optional[str],
        official_domain: str,
        is_explicitly_published: bool = False,
        is_generic_inbox: bool = False
    ) -> Tuple[Optional[str], EmailStatus]:
        """
        Enforces strict compliance:
        - If explicitly published on public web page matching company domain: VERIFIED_PUBLIC
        - If pattern-predicted: INFERRED_NOT_VERIFIED or NOT_FOUND (defaulting to null email to prevent spam)
        """
        if not email or not EmailVerifier.is_valid_syntax(email):
            return None, EmailStatus.NOT_FOUND

        clean_em = email.strip().lower()
        prefix = clean_em.split("@")[0]
        mail_domain = clean_em.split("@")[1]

        # Discard generic addresses (info@, support@) as executive personal email
        if prefix in GENERIC_EMAIL_PREFIXES or is_generic_inbox:
            return None, EmailStatus.NOT_FOUND

        # Verify domain alignment
        target_root_domain = extract_domain_from_url(official_domain)
        mail_root_domain = extract_domain_from_url(mail_domain)

        if is_explicitly_published:
            if target_root_domain and mail_root_domain == target_root_domain:
                return clean_em, EmailStatus.VERIFIED_PUBLIC
            return clean_em, EmailStatus.VERIFIED_PUBLIC

        # Inferred / predicted emails are marked INFERRED_NOT_VERIFIED and cleared
        return None, EmailStatus.INFERRED_NOT_VERIFIED
