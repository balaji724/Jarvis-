"""Email research and verification package for JARVIS V1."""
from .finder import EmailFinder
from .verifier import EmailVerifier

__all__ = ["EmailFinder", "EmailVerifier"]
