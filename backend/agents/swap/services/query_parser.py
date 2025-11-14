"""
Query parsing utilities for swap agent.

Handles extraction of swap parameters from user queries.
"""

import re
from typing import Optional, Tuple

from ..core.constants import (
    CHAIN_ETHEREUM,
    CHAIN_HEDERA,
    CHAIN_POLYGON,
    DEFAULT_AMOUNT,
    DEFAULT_CHAIN,
    DEFAULT_SLIPPAGE,
    DEFAULT_TOKEN_IN,
    DEFAULT_TOKEN_OUT,
)


def extract_account_address(query: str) -> Optional[str]:
    """Extract account address from query."""
    hedera_match = re.search(r"0\.0\.\d+", query)
    if hedera_match:
        return hedera_match.group()
    evm_match = re.search(r"0x[a-fA-F0-9]{40}", query)
    if evm_match:
        return evm_match.group()
    return None


def extract_chain(query: str) -> Tuple[str, bool]:
    """Extract chain from query. Returns (chain, chain_specified)."""
    query_lower = query.lower()
    if "hedera" in query_lower:
        return CHAIN_HEDERA, True
    if "polygon" in query_lower:
        return CHAIN_POLYGON, True
    if "ethereum" in query_lower or "eth" in query_lower:
        return CHAIN_ETHEREUM, True
    return DEFAULT_CHAIN, False


def _get_all_token_symbols(chain: str) -> list:
    """Get all available token symbols for a chain, including discovered tokens."""
    from packages.blockchain.ethereum.constants import ETHEREUM_TOKENS
    from packages.blockchain.hedera.constants import HEDERA_TOKENS
    from packages.blockchain.polygon.constants import POLYGON_TOKENS
    from packages.blockchain.token_discovery import get_all_tokens_for_chain

    # Get tokens from cache first
    cached_tokens = get_all_tokens_for_chain(chain)
    cached_symbols = [token["symbol"] for token in cached_tokens]

    # Also get from constants
    if chain == CHAIN_HEDERA:
        constant_symbols = list(HEDERA_TOKENS.keys())
    elif chain == CHAIN_POLYGON:
        constant_symbols = list(POLYGON_TOKENS.keys())
    elif chain == CHAIN_ETHEREUM:
        constant_symbols = list(ETHEREUM_TOKENS.keys())
    else:
        constant_symbols = []

    # Combine and deduplicate
    all_symbols = list(set(cached_symbols + constant_symbols))

    if all_symbols:
        return all_symbols

    # Fallback to common tokens if nothing found
    common_tokens = [
        "HBAR",
        "USDC",
        "USDT",
        "MATIC",
        "ETH",
        "WBTC",
        "DAI",
        "WMATIC",
        "WHBAR",
        "WETH",
        "LINK",
        "AAVE",
        "UNI",
        "CRV",
        "SAUCE",
    ]
    return common_tokens


def _match_token_patterns(query_lower: str, all_tokens: list) -> Optional[Tuple[str, str]]:
    """Match token swap patterns. Returns (token_in, token_out) or None."""
    patterns = [
        r"help\s+to\s+swap\s+(\d+\.?\d*)\s+([A-Za-z]+)\s+to\s+([A-Za-z]+)",  # "help to swap 0.2 usdc to aster"
        r"swap\s+(\d+\.?\d*)\s+([A-Za-z]+)\s+to\s+([A-Za-z]+)",
        r"swap\s+([A-Za-z]+)\s+to\s+([A-Za-z]+)",
        r"swap\s+([A-Za-z]+)\s+for\s+([A-Za-z]+)",
        r"(\d+\.?\d*)\s+([A-Za-z]+)\s+to\s+([A-Za-z]+)",
        r"([A-Za-z]+)\s+to\s+([A-Za-z]+)",
        r"([A-Za-z]+)\s+for\s+([A-Za-z]+)",
        r"([A-Za-z]+)\s+with\s+([A-Za-z]+)",  # "swap usdc with matic"
        r"([A-Za-z]+)\s*->\s*([A-Za-z]+)",
        r"([A-Za-z]+)\s*=>\s*([A-Za-z]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, query_lower)
        if match:
            groups = match.groups()
            # Normalize MATIC/WMATIC - treat them as the same (only for Polygon)
            # But don't restrict to all_tokens - allow any tokens (Token Research Agent will resolve them)
            original_token1 = groups[1 if len(groups) == 3 else 0].upper()
            original_token2 = groups[2 if len(groups) == 3 else 1].upper()

            # Always return matched tokens - token resolver will handle finding addresses
            # even if they're not in constants (will use Token Research Agent)
            return original_token1, original_token2
    return None


def _find_tokens_by_position(
    query_lower: str, all_tokens: list, chain: str
) -> Tuple[Optional[str], Optional[str]]:
    """Find tokens by their position in query."""
    from packages.blockchain.ethereum.constants import ETHEREUM_TOKENS
    from packages.blockchain.hedera.constants import HEDERA_TOKENS
    from packages.blockchain.polygon.constants import POLYGON_TOKENS

    found_tokens = []
    token_positions = {}

    chain_tokens = {}
    if chain == CHAIN_HEDERA:
        chain_tokens = HEDERA_TOKENS
    elif chain == CHAIN_POLYGON:
        chain_tokens = POLYGON_TOKENS
    elif chain == CHAIN_ETHEREUM:
        chain_tokens = ETHEREUM_TOKENS

    for token in all_tokens:
        token_lower = token.lower()
        # Use word boundaries to avoid matching "polygon" when looking for tokens
        # But allow MATIC to match even if "polygon" is in the query
        if token_lower == "polygon":
            continue  # Skip "polygon" as it's a chain name, not a token
        if token_lower in query_lower:
            if chain and token in chain_tokens:
                found_tokens.append(token)
                token_positions[token] = query_lower.find(token_lower)
        # Also check for MATIC normalization (MATIC = WMATIC for Polygon)
        elif chain == CHAIN_POLYGON and token_lower == "wmatic" and "matic" in query_lower:
            # If query has "matic" but token list has "wmatic", add wmatic
            if "WMATIC" in chain_tokens:
                found_tokens.append("WMATIC")
                token_positions["WMATIC"] = query_lower.find("matic")

    if token_positions:
        found_tokens = sorted(found_tokens, key=lambda t: token_positions.get(t, 999999))

    if len(found_tokens) >= 2:
        return found_tokens[0], found_tokens[1]
    if len(found_tokens) == 1:
        # Don't use hardcoded defaults - return None for token_out if only one token found
        # This will allow the pattern matching in extract_token_symbols to catch tokens not in all_tokens
        # The pattern matching will extract tokens like "ASTER" even if not in the token list
        return found_tokens[0], None
    return None, None


def extract_token_symbols(
    query: str, chain: str, chain_specified: bool
) -> Tuple[Optional[str], Optional[str]]:
    """Extract token symbols from query."""
    all_tokens = _get_all_token_symbols(chain)
    query_lower = query.lower()
    matched = _match_token_patterns(query_lower, all_tokens)
    if matched:
        token_in, token_out = matched
        # Always return matched tokens - token resolver will handle finding addresses
        # even if they're not in constants (will use Token Research Agent)
        return token_in, token_out

    # Try to find tokens by position in query (for tokens not in common list)
    # Extract tokens from patterns like "X to Y" or "X for Y" - case insensitive
    # Only exclude common English words and chain names, not token symbols
    excluded_words = {
        "POLYGON",
        "ETHEREUM",
        "HEDERA",
        "TO",
        "FOR",
        "ON",
        "IN",
        "AT",
        "IS",
        "IT",
        "THE",
        "AND",
        "OR",
        "SWAP",
        "HELP",
        "WITH",
    }

    # Try to match swap patterns like "X to Y" or "X for Y" - case insensitive
    # Order matters: most specific patterns first
    swap_patterns = [
        r"help\s+to\s+swap\s+(\d+\.?\d*)\s+([A-Za-z]{2,10})\s+to\s+([A-Za-z]{2,10})",  # "help to swap 0.2 usdc to aster"
        r"swap\s+(\d+\.?\d*)\s+([A-Za-z]{2,10})\s+to\s+([A-Za-z]{2,10})",  # "swap 0.2 usdc to aster"
        r"swap\s+([A-Za-z]{2,10})\s+to\s+([A-Za-z]{2,10})",  # "swap usdc to aster"
        r"(\d+\.?\d*)\s+([A-Za-z]{2,10})\s+to\s+([A-Za-z]{2,10})",  # "0.2 usdc to aster"
        r"([A-Za-z]{2,10})\s+to\s+([A-Za-z]{2,10})",  # "usdc to aster" (fallback, may match unwanted things)
        r"([A-Za-z]{2,10})\s+for\s+([A-Za-z]{2,10})",  # "usdc for aster"
    ]

    for pattern in swap_patterns:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            groups = match.groups()
            # Extract tokens - handle patterns with amount or without
            if len(groups) == 3:
                # Pattern has amount: groups[0] = amount, groups[1] = token1, groups[2] = token2
                token1 = groups[1].upper() if groups[1] else None
                token2 = groups[2].upper() if groups[2] else None
            elif len(groups) == 2:
                # Pattern without amount: groups[0] = token1, groups[1] = token2
                token1 = groups[0].upper() if groups[0] else None
                token2 = groups[1].upper() if groups[1] else None
            else:
                continue

            print(
                f"🔍 Pattern matched: {pattern}, tokens: {token1}, {token2}, excluded: {token1 in excluded_words or token2 in excluded_words}"
            )

            if token1 and token2 and token1 not in excluded_words and token2 not in excluded_words:
                print(f"✅ Matched tokens via fallback patterns: {token1} -> {token2}")
                return token1, token2

    # Fallback to position-based extraction
    return _find_tokens_by_position(query_lower, all_tokens, chain if chain_specified else None)


def extract_amount(query: str) -> str:
    """Extract amount from query."""
    amount_match = re.search(r"(\d+\.?\d*)", query)
    return amount_match.group(1) if amount_match else DEFAULT_AMOUNT


def extract_slippage(query: str) -> float:
    """Extract slippage tolerance from query."""
    slippage_match = re.search(r"slippage[:\s=]+(\d+\.?\d*)", query.lower())
    return float(slippage_match.group(1)) if slippage_match else DEFAULT_SLIPPAGE


def parse_swap_query(query: str) -> dict:
    """Parse swap query and extract all parameters."""
    if not query or not query.strip():
        query = (
            f"Swap {DEFAULT_AMOUNT} {DEFAULT_TOKEN_IN} to {DEFAULT_TOKEN_OUT} on {DEFAULT_CHAIN}"
        )
    account_address = extract_account_address(query)
    chain, chain_specified = extract_chain(query)
    token_in, token_out = extract_token_symbols(query, chain, chain_specified)
    amount = extract_amount(query)
    slippage = extract_slippage(query)

    # Debug logging
    print("🔍 Parsed swap query:")
    print(f"   Query: {query}")
    print(f"   Chain: {chain} (specified: {chain_specified})")
    print(f"   Token In: {token_in} (default: {DEFAULT_TOKEN_IN})")
    print(f"   Token Out: {token_out} (default: {DEFAULT_TOKEN_OUT})")
    print(f"   Amount: {amount}")

    return {
        "chain": chain,
        "chain_specified": chain_specified,
        "token_in_symbol": token_in or DEFAULT_TOKEN_IN,
        "token_out_symbol": token_out or DEFAULT_TOKEN_OUT,
        "amount_in": amount,
        "account_address": account_address,
        "slippage_tolerance": slippage,
    }
