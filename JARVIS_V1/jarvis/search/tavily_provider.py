"""
Tavily Search Provider implementation for JARVIS V1.
Uses Tavily API to fetch high-signal search answers and source snippets.
"""

from typing import Optional
import httpx
from config import settings
from jarvis.utils.logger import logger
from .base import BaseSearchProvider, SearchResponse, SearchResultItem

class TavilySearchProvider(BaseSearchProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.TAVILY_API_KEY
        self.endpoint = "https://api.tavily.com/search"

    def is_available(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def search(self, query: str, max_results: int = 5) -> SearchResponse:
        if not self.is_available():
            logger.warning("Tavily API key is missing. Returning empty search response.")
            return SearchResponse(query=query, results=[], provider="tavily_missing_key")

        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": max_results,
            "search_depth": "advanced",
            "include_answer": True,
            "include_raw_content": False,
        }

        try:
            with httpx.Client(timeout=settings.REQUEST_TIMEOUT) as client:
                res = client.post(self.endpoint, json=payload)
                res.raise_for_status()
                data = res.json()

            items = []
            for r in data.get("results", []):
                items.append(
                    SearchResultItem(
                        title=r.get("title", ""),
                        url=r.get("url", ""),
                        content=r.get("content", ""),
                        score=float(r.get("score", 0.0)),
                        source_type="tavily"
                    )
                )

            return SearchResponse(
                query=query,
                results=items,
                provider="tavily"
            )

        except httpx.HTTPStatusError as e:
            logger.error(f"Tavily HTTP error {e.response.status_code} for query '{query}': {e}")
            return SearchResponse(query=query, results=[], provider="tavily_error")
        except Exception as e:
            logger.error(f"Unexpected Tavily search error for query '{query}': {e}")
            return SearchResponse(query=query, results=[], provider="tavily_error")
