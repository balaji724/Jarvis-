"""
Text processing and fuzzy matching utilities for JARVIS V1.
"""

import re
import unicodedata
from difflib import SequenceMatcher
from typing import List

LEGAL_SUFFIXES = [
    r'\binc\.?\b', r'\bincorporated\b',
    r'\bcorp\.?\b', r'\bcorporation\b',
    r'\bllc\.?\b', r'\bl\.l\.c\.?\b',
    r'\bltd\.?\b', r'\blimited\b',
    r'\bpvt\.?\b', r'\bprivate\b',
    r'\bco\.?\b', r'\bcompany\b',
    r'\bholdings?\b', r'\bgroup\b',
    r'\btechnologies\b', r'\btech\b',
    r'\bsolutions\b', r'\bservices\b'
]

def normalize_text(text: str) -> str:
    """
    Normalizes arbitrary text by lowercasing, removing extra spaces and special accents.
    """
    if not text:
        return ""
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = text.lower()
    text = re.sub(r'[\r\n\t]+', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def strip_company_legal_suffix(company_name: str) -> str:
    """
    Removes legal entity suffixes like 'Inc', 'LLC', 'Pvt Ltd' for accurate semantic matching.
    """
    norm = normalize_text(company_name)
    for suffix in LEGAL_SUFFIXES:
        norm = re.sub(suffix, '', norm, flags=re.IGNORECASE)
    norm = re.sub(r'[^\w\s]', '', norm)
    return re.sub(r'\s+', ' ', norm).strip()

def normalize_name(name: str) -> str:
    """
    Normalizes a person's name: removes titles (Dr., Mr., Ms., Prof.), punctuation, and whitespace.
    """
    if not name:
        return ""
    cleaned = normalize_text(name)
    # Remove honorifics
    cleaned = re.sub(r'\b(mr|mrs|ms|dr|prof|sir|madam)\.?\b', '', cleaned)
    # Remove punctuation
    cleaned = re.sub(r'[^\w\s]', '', cleaned)
    return re.sub(r'\s+', ' ', cleaned).strip()

def compute_similarity(str1: str, str2: str) -> float:
    """
    Computes normalized similarity ratio between two strings from 0.0 to 1.0.
    """
    s1 = normalize_text(str1)
    s2 = normalize_text(str2)
    if not s1 or not s2:
        return 0.0
    if s1 == s2:
        return 1.0
    return SequenceMatcher(None, s1, s2).ratio()

def company_matches_tokens(search_term: str, target: str) -> bool:
    """
    Checks if tokens of core company name appear meaningfully in target text.
    """
    base_search = strip_company_legal_suffix(search_term)
    base_target = strip_company_legal_suffix(target)
    if not base_search:
        return False
    if base_search in base_target or base_target in base_search:
        return True
    return compute_similarity(base_search, base_target) >= 0.70
