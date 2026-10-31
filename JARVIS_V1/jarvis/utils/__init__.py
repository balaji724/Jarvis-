"""Utility modules for logging, text, and URL parsing."""
from .logger import setup_logger, log_step
from .urls import normalize_domain, clean_url, is_valid_url, extract_domain_from_url
from .text import normalize_text, normalize_name, compute_similarity

__all__ = [
    "setup_logger",
    "log_step",
    "normalize_domain",
    "clean_url",
    "is_valid_url",
    "extract_domain_from_url",
    "normalize_text",
    "normalize_name",
    "compute_similarity",
]
