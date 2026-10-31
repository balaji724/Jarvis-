"""
SQLite caching layer for web searches and fetched web pages.
Supports configurable TTL (default 7 days).
"""

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from config import settings
from .database import get_db_connection

def hash_key(key: str) -> str:
    return hashlib.sha256(key.strip().encode("utf-8")).hexdigest()

class SearchCache:
    """Caches search API results to reduce duplicate network and quota usage."""
    def __init__(self, ttl_hours: int = None):
        self.ttl_hours = ttl_hours or settings.CACHE_TTL_HOURS

    def get(self, query: str) -> Optional[Dict[str, Any]]:
        ck = hash_key(query)
        now_iso = datetime.now(timezone.utc).isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT response FROM search_cache WHERE cache_key = ? AND expires_at > ?",
                (ck, now_iso)
            )
            row = cursor.fetchone()
            if row:
                try:
                    return json.loads(row["response"])
                except Exception:
                    return None
        return None

    def set(self, query: str, response_data: Dict[str, Any]) -> None:
        ck = hash_key(query)
        now = datetime.now(timezone.utc)
        expires = (now + timedelta(hours=self.ttl_hours)).isoformat()
        resp_json = json.dumps(response_data)
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO search_cache (cache_key, query, response, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(cache_key) DO UPDATE SET
                    response=excluded.response,
                    expires_at=excluded.expires_at
                """,
                (ck, query, resp_json, now.isoformat(), expires)
            )
            conn.commit()

class PageCache:
    """Caches extracted page texts."""
    def __init__(self, ttl_hours: int = None):
        self.ttl_hours = ttl_hours or settings.CACHE_TTL_HOURS

    def get(self, url: str) -> Optional[Dict[str, str]]:
        uh = hash_key(url)
        now_iso = datetime.now(timezone.utc).isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT title, content FROM page_cache WHERE url_hash = ? AND expires_at > ?",
                (uh, now_iso)
            )
            row = cursor.fetchone()
            if row:
                return {"title": row["title"], "content": row["content"]}
        return None

    def set(self, url: str, content: str, title: str = "") -> None:
        uh = hash_key(url)
        now = datetime.now(timezone.utc)
        expires = (now + timedelta(hours=self.ttl_hours)).isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO page_cache (url_hash, url, title, content, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(url_hash) DO UPDATE SET
                    title=excluded.title,
                    content=excluded.content,
                    expires_at=excluded.expires_at
                """,
                (uh, url, title, content, now.isoformat(), expires)
            )
            conn.commit()
