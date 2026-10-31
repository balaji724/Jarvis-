"""
SearchManager coordinates queries, caches results in SQLite, and interfaces with providers.
"""

from typing import List, Optional
from config import settings
from jarvis.database.cache import SearchCache
from jarvis.utils.logger import logger
from .base import BaseSearchProvider, SearchResponse, SearchResultItem
from .tavily_provider import TavilySearchProvider

class SearchManager:
    def __init__(self, provider: Optional[BaseSearchProvider] = None, cache_enabled: bool = True):
        self.provider = provider or TavilySearchProvider()
        self.cache_enabled = cache_enabled
        self.cache = SearchCache() if cache_enabled else None

    def search(self, query: str, max_results: Optional[int] = None) -> List[SearchResultItem]:
        """
        Executes query with caching. Returns normalized list of SearchResultItem.
        """
        limit = max_results or settings.MAX_SEARCH_RESULTS
        cleaned_query = query.strip()

        # Check Cache
        if self.cache_enabled and self.cache:
            cached_data = self.cache.get(cleaned_query)
            if cached_data and "results" in cached_data:
                logger.info(f"[CACHE HIT] Query: '{cleaned_query}' ({len(cached_data['results'])} items)")
                return [SearchResultItem(**item) for item in cached_data["results"]]

        logger.info(f"[SEARCH QUERY] Executing: '{cleaned_query}' via {self.provider.__class__.__name__}")
        response: SearchResponse = self.provider.search(cleaned_query, max_results=limit)

        # Store in Cache
        if self.cache_enabled and self.cache and response.results:
            self.cache.set(cleaned_query, {
                "query": cleaned_query,
                "provider": response.provider,
                "results": [r.model_dump() for r in response.results]
            })

        return response.results
