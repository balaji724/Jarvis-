"""
SQLite database connection and schema initialization.
"""

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from config import settings

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS search_cache (
    cache_key TEXT PRIMARY KEY,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS page_cache (
    url_hash TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT DEFAULT '',
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    target_role TEXT DEFAULT 'CEO',
    status TEXT NOT NULL,
    confidence INTEGER DEFAULT 0,
    results_count INTEGER DEFAULT 0,
    error_message TEXT DEFAULT '',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discovered_people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    company TEXT NOT NULL,
    domain TEXT DEFAULT '',
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    full_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    email TEXT DEFAULT NULL,
    email_status TEXT DEFAULT 'NOT_FOUND',
    linkedin_url TEXT DEFAULT NULL,
    source_urls TEXT DEFAULT '',
    confidence INTEGER DEFAULT 0,
    verification_status TEXT DEFAULT 'NEEDS_REVIEW',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

def init_db(db_path: str = None) -> None:
    path = db_path or settings.SQLITE_DB_PATH
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.executescript(SCHEMA_SQL)
        conn.commit()

@contextmanager
def get_db_connection(db_path: str = None):
    path = db_path or settings.SQLITE_DB_PATH
    conn = sqlite3.connect(path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
