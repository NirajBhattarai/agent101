"""
Query parser for Sentiment Agent
Extracts parameters from user queries
"""

import re
from typing import Tuple

from ..core.constants import DEFAULT_ASSET, DEFAULT_DAYS, DEFAULT_THRESHOLD, DEFAULT_TOP_N


def extract_asset(query: str) -> str:
    """Extract cryptocurrency asset from query."""
    query_lower = query.lower()

    # Common cryptocurrency mappings
    crypto_map = {
        "bitcoin": "bitcoin",
        "btc": "bitcoin",
        "ethereum": "ethereum",
        "eth": "ethereum",
        "hedera": "hedera",
        "hbar": "hedera",
        "polygon": "polygon",
        "matic": "polygon",
        "usdc": "usd-coin",
        "usdt": "tether",
        "dai": "dai",
        "wbtc": "wrapped-bitcoin",
    }

    # Check for explicit mentions
    for key, value in crypto_map.items():
        if key in query_lower:
            return value

    # Try to extract from patterns like "for bitcoin", "for BTC", etc.
    patterns = [
        r"for\s+(\w+)",
        r"(\w+)\s+sentiment",
        r"(\w+)\s+social",
        r"(\w+)\s+dominance",
    ]

    for pattern in patterns:
        match = re.search(pattern, query_lower)
        if match:
            asset = match.group(1).lower()
            if asset in crypto_map:
                return crypto_map[asset]

    return DEFAULT_ASSET


def extract_days(query: str) -> int:
    """Extract number of days from query."""
    query_lower = query.lower()

    # Look for explicit day numbers
    day_patterns = [
        r"(\d+)\s+days?",
        r"past\s+(\d+)",
        r"last\s+(\d+)",
        r"(\d+)\s+day",
    ]

    for pattern in day_patterns:
        match = re.search(pattern, query_lower)
        if match:
            days = int(match.group(1))
            if 1 <= days <= 365:
                return days

    # Look for week/month patterns
    if "week" in query_lower or "7 days" in query_lower:
        return 7
    if "month" in query_lower or "30 days" in query_lower:
        return 30

    return DEFAULT_DAYS


def extract_threshold(query: str) -> float:
    """Extract threshold percentage from query."""
    query_lower = query.lower()

    # Look for percentage patterns
    threshold_patterns = [
        r"(\d+(?:\.\d+)?)\s*%",
        r"threshold\s+of\s+(\d+(?:\.\d+)?)",
    ]

    for pattern in threshold_patterns:
        match = re.search(pattern, query_lower)
        if match:
            threshold = float(match.group(1))
            if 0 <= threshold <= 1000:
                return threshold

    return DEFAULT_THRESHOLD


def extract_top_n(query: str) -> int:
    """Extract top N value from query."""
    query_lower = query.lower()

    # Look for "top N" patterns
    top_patterns = [
        r"top\s+(\d+)",
        r"(\d+)\s+trending",
    ]

    for pattern in top_patterns:
        match = re.search(pattern, query_lower)
        if match:
            top_n = int(match.group(1))
            if 1 <= top_n <= 50:
                return top_n

    return DEFAULT_TOP_N


def parse_sentiment_query(query: str) -> Tuple[str, int]:
    """Parse sentiment balance query."""
    asset = extract_asset(query)
    days = extract_days(query)
    return asset, days


def parse_social_volume_query(query: str) -> Tuple[str, int]:
    """Parse social volume query."""
    asset = extract_asset(query)
    days = extract_days(query)
    return asset, days


def parse_social_shift_query(query: str) -> Tuple[str, float, int]:
    """Parse social shift query."""
    asset = extract_asset(query)
    threshold = extract_threshold(query)
    days = extract_days(query)
    return asset, threshold, days


def parse_trending_words_query(query: str) -> Tuple[int, int]:
    """Parse trending words query."""
    days = extract_days(query)
    top_n = extract_top_n(query)
    return days, top_n


def parse_social_dominance_query(query: str) -> Tuple[str, int]:
    """Parse social dominance query."""
    asset = extract_asset(query)
    days = extract_days(query)
    return asset, days
