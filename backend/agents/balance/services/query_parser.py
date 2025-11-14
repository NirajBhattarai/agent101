"""
Query parsing utilities for balance agent.

Handles extraction of account addresses and chain detection from queries.
"""

import re
from typing import Optional

from ..core.constants import (
    CHAIN_ALL,
    CHAIN_ETHEREUM,
    CHAIN_HEDERA,
    CHAIN_POLYGON,
    DEFAULT_ACCOUNT_ADDRESS,
    DEFAULT_CHAIN,
)
from .token_parser import (
    extract_token_symbol,
    is_all_chains_token_query,
    is_popular_tokens_query,
    is_token_specific_query,
)


def extract_hedera_address(query: str) -> Optional[str]:
    """Extract Hedera account address from query."""
    match = re.search(r"0\.0\.\d+", query)
    return match.group() if match else None


def extract_evm_address(query: str) -> Optional[str]:
    """Extract EVM address from query."""
    match = re.search(r"0x[a-fA-F0-9]{40}", query)
    return match.group() if match else None


def extract_account_address(query: str) -> str:
    """Extract account address from query."""
    hedera_addr = extract_hedera_address(query)
    if hedera_addr:
        return hedera_addr
    evm_addr = extract_evm_address(query)
    if evm_addr:
        return evm_addr
    return DEFAULT_ACCOUNT_ADDRESS


def detect_chain_from_address(address: str) -> str:
    """Detect chain from address format."""
    if address.startswith("0.0."):
        return CHAIN_HEDERA
    if address.startswith("0x"):
        return CHAIN_POLYGON  # Default to Polygon for EVM addresses
    return DEFAULT_CHAIN


def detect_chain_from_query(query: str) -> Optional[str]:
    """Detect chain from query text."""
    query_lower = query.lower()
    if "ethereum" in query_lower or ("eth" in query_lower and "hedera" not in query_lower):
        return CHAIN_ETHEREUM
    if "polygon" in query_lower:
        return CHAIN_POLYGON
    if "hedera" in query_lower:
        return CHAIN_HEDERA
    if "all" in query_lower or "all chains" in query_lower:
        return CHAIN_ALL
    return None


def parse_chain(query: str, account_address: str) -> str:
    """Parse chain from query and address."""
    chain = detect_chain_from_query(query)
    if chain:
        return chain
    return detect_chain_from_address(account_address)


def parse_query_intent(query: str) -> dict:
    """
    Parse query to determine intent and extract parameters.

    Returns:
        Dictionary with:
        - account_address: Extracted account address
        - chain: Chain name or "all"
        - token_symbol: Token symbol if specified
        - is_token_specific: Whether query is for a specific token
        - is_popular_tokens: Whether query is for popular tokens
        - is_all_chains_token: Whether query is for token across all chains
    """
    account_address = extract_account_address(query)
    chain = parse_chain(query, account_address)
    token_symbol = extract_token_symbol(query)

    # Adjust chain if token query without chain specification
    if is_all_chains_token_query(query) and token_symbol:
        chain = CHAIN_ALL

    return {
        "account_address": account_address,
        "chain": chain,
        "token_symbol": token_symbol,
        "is_token_specific": is_token_specific_query(query),
        "is_popular_tokens": is_popular_tokens_query(query),
        "is_all_chains_token": is_all_chains_token_query(query),
    }
