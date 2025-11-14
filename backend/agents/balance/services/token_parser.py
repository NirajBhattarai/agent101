"""Token parsing utilities for balance agent.

Handles extraction of token symbols and detection of token-specific queries.
"""

import re
from typing import Optional

# Common token symbols (uppercase)
POPULAR_TOKENS = [
    "BTC",
    "ETH",
    "USDT",
    "USDC",
    "BNB",
    "SOL",
    "XRP",
    "DOGE",
    "ADA",
    "MATIC",
    "DOT",
    "LINK",
    "WBTC",
    "UNI",
    "DAI",
    "HBAR",
    "AVAX",
    "ATOM",
    "ALGO",
    "NEAR",
]


def extract_token_symbol(query: str) -> Optional[str]:
    """
    Extract token symbol from query.

    Args:
        query: User query string

    Returns:
        Token symbol if found, None otherwise
    """
    query_upper = query.upper()

    # Check for explicit token mentions
    for token in POPULAR_TOKENS:
        # Look for token as standalone word or after "get", "check", "show", etc.
        pattern = rf"\b{re.escape(token)}\b"
        if re.search(pattern, query_upper):
            return token

    # Check for common patterns like "get USDT", "USDT balance", etc.
    token_patterns = [
        r"\b(get|check|show|fetch|find)\s+([A-Z]{2,10})\b",
        r"\b([A-Z]{2,10})\s+(balance|token|coin)\b",
        r"\b(balance|token|coin)\s+([A-Z]{2,10})\b",
    ]

    for pattern in token_patterns:
        match = re.search(pattern, query_upper)
        if match:
            potential_token = match.group(2) if match.lastindex >= 2 else match.group(1)
            if potential_token and len(potential_token) >= 2:
                return potential_token

    return None


def is_token_specific_query(query: str) -> bool:
    """
    Check if query is asking for a specific token balance.

    Args:
        query: User query string

    Returns:
        True if query is token-specific, False otherwise
    """
    token_symbol = extract_token_symbol(query)
    return token_symbol is not None


def is_popular_tokens_query(query: str) -> bool:
    """
    Check if query is asking for popular tokens.

    Args:
        query: User query string

    Returns:
        True if query is asking for popular tokens, False otherwise
    """
    query_lower = query.lower()
    popular_keywords = [
        "popular tokens",
        "trending tokens",
        "top tokens",
        "best tokens",
        "popular coins",
        "trending coins",
        "top coins",
    ]

    return any(keyword in query_lower for keyword in popular_keywords)


def is_all_chains_token_query(query: str) -> bool:
    """
    Check if query is asking for a token across all chains.

    Args:
        query: User query string

    Returns:
        True if query is asking for token on all chains, False otherwise
    """
    query_lower = query.lower()
    token_symbol = extract_token_symbol(query)

    if not token_symbol:
        return False

    # Check if chain is NOT specified
    chain_keywords = ["ethereum", "polygon", "hedera", "bsc", "chain", "network"]
    has_chain_specification = any(keyword in query_lower for keyword in chain_keywords)

    # If token is mentioned but no chain is specified, it's likely an all-chains query
    return not has_chain_specification

