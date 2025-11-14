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
    """Get all available token symbols for a chain."""
    from packages.blockchain.ethereum.constants import ETHEREUM_TOKENS
    from packages.blockchain.hedera.constants import HEDERA_TOKENS
    from packages.blockchain.polygon.constants import POLYGON_TOKENS

    if chain == CHAIN_HEDERA:
        return list(HEDERA_TOKENS.keys())
    if chain == CHAIN_POLYGON:
        return list(POLYGON_TOKENS.keys())
    if chain == CHAIN_ETHEREUM:
        return list(ETHEREUM_TOKENS.keys())

    # Common tokens across all chains
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
        r"swap\s+(\d+\.?\d*)\s+([A-Za-z]+)\s+to\s+([A-Za-z]+)",
        r"swap\s+([A-Za-z]+)\s+to\s+([A-Za-z]+)",
        r"swap\s+([A-Za-z]+)\s+for\s+([A-Za-z]+)",
        r"(\d+\.?\d*)\s+([A-Za-z]+)\s+to\s+([A-Za-z]+)",
        r"([A-Za-z]+)\s+to\s+([A-Za-z]+)",
        r"([A-Za-z]+)\s+for\s+([A-Za-z]+)",
        r"([A-Za-z]+)\s*->\s*([A-Za-z]+)",
        r"([A-Za-z]+)\s*=>\s*([A-Za-z]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, query_lower)
        if match:
            groups = match.groups()
            if len(groups) == 3:
                token1, token2 = groups[1].upper(), groups[2].upper()
            else:
                token1, token2 = groups[0].upper(), groups[1].upper()
            if token1 in all_tokens and token2 in all_tokens:
                return token1, token2
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
        if token_lower in query_lower:
            if chain and token in chain_tokens:
                found_tokens.append(token)
                token_positions[token] = query_lower.find(token_lower)

    if token_positions:
        found_tokens = sorted(found_tokens, key=lambda t: token_positions.get(t, 999999))

    if len(found_tokens) >= 2:
        return found_tokens[0], found_tokens[1]
    if len(found_tokens) == 1:
        default_out = "USDC" if chain == CHAIN_HEDERA else "USDT"
        return found_tokens[0], default_out
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
        if chain_specified:
            from packages.blockchain.ethereum.constants import ETHEREUM_TOKENS
            from packages.blockchain.hedera.constants import HEDERA_TOKENS
            from packages.blockchain.polygon.constants import POLYGON_TOKENS

            chain_tokens = {}
            if chain == CHAIN_HEDERA:
                chain_tokens = HEDERA_TOKENS
            elif chain == CHAIN_POLYGON:
                chain_tokens = POLYGON_TOKENS
            elif chain == CHAIN_ETHEREUM:
                chain_tokens = ETHEREUM_TOKENS

            if token_in in chain_tokens and token_out in chain_tokens:
                return token_in, token_out
        return token_in, token_out
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
    return {
        "chain": chain,
        "chain_specified": chain_specified,
        "token_in_symbol": token_in or DEFAULT_TOKEN_IN,
        "token_out_symbol": token_out or DEFAULT_TOKEN_OUT,
        "amount_in": amount,
        "account_address": account_address,
        "slippage_tolerance": slippage,
    }
