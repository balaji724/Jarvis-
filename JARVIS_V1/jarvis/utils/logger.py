"""
Structured logging module for JARVIS V1.
Logs to both console and logs/jarvis.log with strict credential masking.
"""

import logging
import re
from pathlib import Path
from typing import Optional
from config import settings

# Sensitive patterns that must never appear in logs
SENSITIVE_PATTERNS = [
    re.compile(r'(?i)(api[_-]?key|token|client[_-]?secret|password|secret)[\s:=]+([a-zA-Z0-9_\-\.]{8,})'),
    re.compile(r'ya29\.[a-zA-Z0-9_\-]+'),
    re.compile(r'sk-[a-zA-Z0-9]{20,}'),
    re.compile(r'tvly-[a-zA-Z0-9]{20,}'),
]

class SafeFormatter(logging.Formatter):
    """Custom formatter to redact secrets from log records."""
    def format(self, record: logging.LogRecord) -> str:
        msg = super().format(record)
        for pat in SENSITIVE_PATTERNS:
            msg = pat.sub(r'\1=***REDACTED***', msg)
        return msg

def setup_logger(name: str = "JARVIS") -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    log_dir = Path(settings.LOGS_DIR)
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "jarvis.log"

    formatter = SafeFormatter("%(asctime)s | %(levelname)s | %(message)s", datefmt="%Y-%m-%d %H:%M:%S")

    # File handler
    file_handler = logging.FileHandler(str(log_file), encoding="utf-8")
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    return logger

logger = setup_logger()

def log_step(
    run_id: str,
    company: str,
    step: str,
    status: str,
    confidence: Optional[int] = None,
    error: Optional[str] = None
):
    """
    Standard format step logger required by specification:
    TIMESTAMP | RUN=xxx | COMPANY=yyy | STEP=zzz | STATUS=aaa | CONFIDENCE=bbb | ERROR=ccc
    """
    conf_str = f" | CONFIDENCE={confidence}" if confidence is not None else ""
    err_str = f" | ERROR={error}" if error else ""
    log_msg = f"RUN={run_id} | COMPANY={company} | STEP={step} | STATUS={status}{conf_str}{err_str}"
    
    if status in ("FAILED", "ERROR"):
        logger.error(log_msg)
    elif status == "NEEDS_REVIEW":
        logger.warning(log_msg)
    else:
        logger.info(log_msg)
