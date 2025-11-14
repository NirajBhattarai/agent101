"""
Query parsing utilities for liquidity agent.

Handles extraction of token addresses and chain detection from queries.
"""

import re
from typing import Optional
from ..core.constants import (
    CHAIN_ETHEREUM,
    CHAIN_POLYGON,
    CHAIN_HEDERA,
    CHAIN_ALL,
)
from .token_resolver import resolve_token_pair


def detect_chain_from_query(query: str) -> Optional[str]:
    """Detect chain from query text."""
    query_lower = query.lower()
    # Check for "all" first to avoid false matches with token symbols
    if "all" in query_lower or "all chains" in query_lower:
        return CHAIN_ALL
    if "ethereum" in query_lower:
        return CHAIN_ETHEREUM
    if "polygon" in query_lower:
        return CHAIN_POLYGON
    if "hedera" in query_lower:
        return CHAIN_HEDERA
    # Only match "eth" if it's clearly referring to the chain, not a token
    # Check for patterns like "on eth" or "ethereum" but not just "eth" as a token
    if " on eth" in query_lower or " eth " in query_lower or " eth," in query_lower:
        if "hedera" not in query_lower:
            return CHAIN_ETHEREUM
    return None


def parse_chain(query: str) -> str:
    """Parse chain from query."""
    chain = detect_chain_from_query(query)
    if chain:
        return chain
    return CHAIN_ALL  # Default to all chains


def extract_token_symbols(query: str) -> tuple[Optional[str], Optional[str]]:
    """
    Extract token symbols from query without resolving to addresses.
    Returns raw symbols (e.g., "ETH", "USDT") or addresses if found.
    """
    # Pattern for EVM addresses (0x followed by 40 hex chars)
    evm_pattern = r"0x[a-fA-F0-9]{40}"
    addresses = re.findall(evm_pattern, query)
    
    # If we found addresses, return them
    if len(addresses) >= 2:
        return addresses[0], addresses[1]
    elif len(addresses) == 1:
        return addresses[0], None
    
    # If no addresses found, try to extract token symbols
    query_upper = query.upper()
    
    # Token symbol pattern (2-10 uppercase letters/numbers)
    symbol_pattern = r"\b([A-Z0-9]{2,10})\b"
    symbols = re.findall(symbol_pattern, query_upper)
    
    # Filter out common non-token words
    excluded_words = {
        "FOR", "AND", "THE", "GET", "FIND", "SHOW", "LIQUIDITY", "POOL", "PAIR",
        "CHAIN", "ETHEREUM", "POLYGON", "HEDERA", "ALL", "MAINNET",
        "TESTNET", "FEE", "TIER", "BPS", "WITH", "ON", "OF", "TO", "FROM"
    }
    
    # Extract potential token symbols
    potential_tokens = [s for s in symbols if s not in excluded_words and len(s) >= 2]
    
    if len(potential_tokens) >= 2:
        return potential_tokens[0], potential_tokens[1]
    
    return None, None


def extract_token_addresses(query: str) -> tuple[Optional[str], Optional[str]]:
    """
    Extract token addresses from query.
    First tries to find EVM addresses, then tries to resolve token symbols.
    For "all" chains, returns symbols instead of resolving (to allow per-chain resolution).
    """
    # Pattern for EVM addresses (0x followed by 40 hex chars)
    evm_pattern = r"0x[a-fA-F0-9]{40}"
    addresses = re.findall(evm_pattern, query)
    
    # If we found addresses, use them
    if len(addresses) >= 2:
        return addresses[0], addresses[1]
    elif len(addresses) == 1:
        return addresses[0], None
    
    # Detect chain from query
    chain_detected = detect_chain_from_query(query)
    chain = chain_detected if chain_detected else CHAIN_ALL
    
    # Extract symbols
    token_a_symbol, token_b_symbol = extract_token_symbols(query)
    
    if not token_a_symbol or not token_b_symbol:
        return None, None
    
    # For "all" chains, return symbols so agent can resolve per-chain
    # For specific chains, resolve immediately
    if chain == CHAIN_ALL:
        return token_a_symbol, token_b_symbol
    
    # Resolve symbols to addresses for specific chain
    token_a, token_b = resolve_token_pair(token_a_symbol, token_b_symbol, chain)
    
    if token_a and token_b:
        return token_a, token_b
    
    return None, None


def extract_fee_tier(query: str) -> Optional[int]:
    """Extract fee tier from query."""
    # Look for fee mentions: 500, 3000, 10000 or 0.05%, 0.3%, 1%
    fee_patterns = [
        (r"\b(500|3000|10000)\b", lambda x: int(x)),
        (r"0\.05%", lambda x: 500),
        (r"0\.3%", lambda x: 3000),
        (r"1%", lambda x: 10000),
    ]
    
    for pattern, converter in fee_patterns:
        match = re.search(pattern, query)
        if match:
            return converter(match.group(1) if match.groups() else match.group(0))
    return None

