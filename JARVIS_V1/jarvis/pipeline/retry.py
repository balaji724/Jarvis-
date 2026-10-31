"""
Exponential backoff retry decorator and utilities for JARVIS V1.
"""

import time
import functools
from typing import Callable, Type, Tuple
from jarvis.utils.logger import logger

def retry_with_backoff(
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,)
):
    """
    Retries an operation with exponential backoff on temporary network failures.
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            delay = initial_delay
            last_err = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except retryable_exceptions as e:
                    last_err = e
                    if attempt == max_attempts:
                        logger.error(f"Function {func.__name__} failed permanently on attempt {attempt}: {e}")
                        raise
                    logger.warning(
                        f"Attempt {attempt}/{max_attempts} for {func.__name__} failed: {e}. Retrying in {delay:.1f}s..."
                    )
                    time.sleep(delay)
                    delay *= backoff_factor
            if last_err:
                raise last_err
        return wrapper
    return decorator
