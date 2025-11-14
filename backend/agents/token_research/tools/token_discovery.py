"""Token discovery tools for Token Research Agent."""

from packages.blockchain.token_discovery import (
    discover_and_cache_popular_tokens,
    get_popular_ethereum_tokens,
    get_token_addresses_across_chains,
)

__all__ = [
    "discover_popular_tokens",
    "get_token_addresses_across_chains",
    "get_popular_ethereum_tokens",
]


def discover_popular_tokens(limit: int = 5) -> dict:
    """
    Discover popular tokens from Ethereum and map them across all chains.

    Args:
        limit: Maximum number of tokens to discover (default: 5 to avoid rate limits)

    Returns:
        Dictionary mapping token symbols to their chain addresses
    """
    return discover_and_cache_popular_tokens(limit=limit)
