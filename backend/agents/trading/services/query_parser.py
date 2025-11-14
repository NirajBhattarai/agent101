"""
Query parser for Trading Agent
Extracts asset and parameters from user queries
"""

import re
from typing import Tuple

from ..core.constants import ASSET_MAPPING, DEFAULT_ASSET, DEFAULT_DAYS


def extract_asset(query: str) -> str:
    """Extract cryptocurrency asset from query."""
    query_lower = query.lower()

    # Check for explicit mentions
    for asset_key, asset_id in ASSET_MAPPING.items():
        if asset_key in query_lower:
            return asset_id

    # Default to bitcoin if unclear
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


def parse_trading_query(query: str) -> Tuple[str, int]:
    """Parse trading query to extract asset and days."""
    asset = extract_asset(query)
    days = extract_days(query)
    return asset, days
