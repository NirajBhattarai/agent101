"""Query parser for Token Research Agent."""

import re


def parse_token_research_query(query: str) -> dict:
    """
    Parse token research query to extract intent.

    Args:
        query: User query string

    Returns:
        Dictionary with parsed query information:
        - query_type: "search", "discovery", or "address"
        - token_symbol: Token symbol if searching for specific token
        - chain: Chain name if specified
    """
    query_lower = query.lower()

    # Check for token discovery queries
    discovery_patterns = [
        r"discover.*token",
        r"find.*popular.*token",
        r"get.*popular.*token",
        r"trending.*token",
        r"top.*token",
    ]
    is_discovery = any(re.search(pattern, query_lower) for pattern in discovery_patterns)

    # Check for token search queries
    search_patterns = [
        r"search.*token",
        r"find.*token",
        r"look.*up.*token",
        r"token.*address",
        r"contract.*address",
    ]
    is_search = any(re.search(pattern, query_lower) for pattern in search_patterns)

    # Extract token symbol
    token_symbol = None
    token_patterns = [
        r"\b([A-Z]{2,10})\b",  # Uppercase token symbols (2-10 chars)
        r"token\s+([A-Z]{2,10})",  # "token USDT"
        r"([A-Z]{2,10})\s+token",  # "USDT token"
    ]
    for pattern in token_patterns:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            potential_symbol = match.group(1).upper()
            # Filter out common words that aren't tokens
            if potential_symbol not in ["THE", "FOR", "AND", "TO", "ON", "IN", "AT", "IS", "IT"]:
                token_symbol = potential_symbol
                break

    # Extract chain name
    chain = None
    chain_patterns = [
        r"\b(ethereum|polygon|hedera|bsc)\b",
        r"on\s+(ethereum|polygon|hedera|bsc)",
    ]
    for pattern in chain_patterns:
        match = re.search(pattern, query_lower)
        if match:
            chain = match.group(1).lower()
            break

    # Determine query type
    if is_discovery:
        query_type = "discovery"
    elif is_search or token_symbol:
        query_type = "search"
    else:
        query_type = "discovery"  # Default to discovery

    return {
        "query_type": query_type,
        "token_symbol": token_symbol,
        "chain": chain,
        "is_discovery": is_discovery,
        "is_search": is_search,
    }
