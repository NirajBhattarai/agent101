"""
Token resolver service for converting token symbols to addresses.

Handles symbol-to-address resolution for Ethereum, Polygon, and Hedera chains.
Uses both constants and discovered tokens from cache.
"""

from typing import Optional

from packages.blockchain.ethereum.constants import ETHEREUM_TOKENS
from packages.blockchain.hedera.constants import HEDERA_TOKENS
from packages.blockchain.polygon.constants import POLYGON_TOKENS
from packages.blockchain.token_updater import get_token_address_for_swap

# Special mappings: Native tokens -> Wrapped tokens for DEX pools
SYMBOL_ALIASES = {
    "ETH": "WETH",  # On Ethereum and Polygon, ETH maps to WETH for DEX pools
    "ETHER": "WETH",
    "ETHERUM": "WETH",
    "MATIC": "WMATIC",  # On Polygon, MATIC maps to WMATIC for DEX pools
    "HBAR": "WHBAR",  # On Hedera, HBAR maps to WHBAR for DEX pools (if needed)
}


def resolve_token_symbol(symbol: str, chain: str) -> str | None:
    """
    Resolve a token symbol to its address for a specific chain.
    Uses both constants and discovered tokens from cache.

    Args:
        symbol: Token symbol (e.g., "ETH", "USDT", "WETH")
        chain: Chain name ("ethereum", "polygon", "hedera")

    Returns:
        Token address (0x...) or None if not found
    """
    # Normalize symbol
    symbol_upper = symbol.upper().strip()

    # Check for aliases first
    if symbol_upper in SYMBOL_ALIASES:
        symbol_upper = SYMBOL_ALIASES[symbol_upper]

    # Try to get from cache or constants
    address = get_token_address_for_swap(symbol_upper, chain.lower())
    if address:
        return address

    # Fallback to original logic for backward compatibility
    chain_lower = chain.lower()

    if chain_lower == "ethereum":
        if symbol_upper in ETHEREUM_TOKENS:
            return ETHEREUM_TOKENS[symbol_upper]["address"]
    elif chain_lower == "polygon":
        if symbol_upper in POLYGON_TOKENS:
            return POLYGON_TOKENS[symbol_upper]["address"]
        # Also check Ethereum tokens for common ones
        if symbol_upper in ETHEREUM_TOKENS:
            return ETHEREUM_TOKENS[symbol_upper]["address"]
    elif chain_lower == "hedera":
        if symbol_upper in HEDERA_TOKENS:
            return HEDERA_TOKENS[symbol_upper]["address"]

    return None


def resolve_token_pair(
    token_a: str, token_b: str, chain: str = "all"
) -> tuple[str | None, str | None]:
    """
    Resolve a token pair (symbols or addresses) to addresses.

    Args:
        token_a: Token A (symbol or address)
        token_b: Token B (symbol or address)
        chain: Chain name ("ethereum", "polygon", "hedera", "all")

    Returns:
        Tuple of (token_a_address, token_b_address) or (None, None) if not found
    """
    # Check if already addresses
    if token_a and token_a.startswith("0x") and len(token_a) == 42:
        resolved_a = token_a
    else:
        # Try to resolve as symbol
        if chain == "all":
            # Try all chains, prefer Ethereum (most common)
            resolved_a = (
                resolve_token_symbol(token_a, "ethereum")
                or resolve_token_symbol(token_a, "polygon")
                or resolve_token_symbol(token_a, "hedera")
            )
        else:
            resolved_a = resolve_token_symbol(token_a, chain)

    if token_b and token_b.startswith("0x") and len(token_b) == 42:
        resolved_b = token_b
    else:
        # Try to resolve as symbol
        if chain == "all":
            # Try all chains, prefer Ethereum (most common)
            resolved_b = (
                resolve_token_symbol(token_b, "ethereum")
                or resolve_token_symbol(token_b, "polygon")
                or resolve_token_symbol(token_b, "hedera")
            )
        else:
            resolved_b = resolve_token_symbol(token_b, chain)

    return resolved_a, resolved_b
