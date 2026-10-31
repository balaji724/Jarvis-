"""
Base abstraction for search providers in JARVIS V1.
Allows plugging in Tavily, Google Custom Search, Bing, or Serper seamlessly.
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel, Field

class SearchResultItem(BaseModel):
    title: str = Field(default="")
    url: str = Field(...)
    content: str = Field(default="")
    score: float = Field(default=0.0)
    source_type: Optional[str] = Field(default="web")

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem] = Field(default_factory=list)
    provider: str = Field(default="unknown")

class BaseSearchProvider(ABC):
    """Abstract interface that all search engine implementations must follow."""

    @abstractmethod
    def search(self, query: str, max_results: int = 5) -> SearchResponse:
        """Execute a web search and return standard SearchResponse."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if required API credentials/dependencies are present."""
        pass
