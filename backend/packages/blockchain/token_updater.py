"""
Utility to update token constants with discovered tokens.

Merges discovered tokens from token_discovery into the chain-specific constants.
"""

from typing import Optional

from packages.blockchain.token_discovery import get_cached_tokens


def update_ethereum_tokens() -> dict:
    """
    Get Ethereum tokens including discovered tokens from cache.

    Returns:
        Updated dictionary of Ethereum tokens
    """
    from packages.blockchain.ethereum.constants import ETHEREUM_TOKENS

    # Start with existing tokens
    updated_tokens = ETHEREUM_TOKENS.copy()

    # Add discovered tokens from cache
    cached_tokens = get_cached_tokens()
    for symbol, token_data in cached_tokens.items():
        eth_address = token_data.get("ethereum")
        if eth_address and symbol not in updated_tokens:
            updated_tokens[symbol] = {
                "address": eth_address,
                "decimals": token_data.get("decimals", {}).get("ethereum", 18),
            }

    return updated_tokens


def update_polygon_tokens() -> dict:
    """
    Get Polygon tokens including discovered tokens from cache.

    Returns:
        Updated dictionary of Polygon tokens
    """
    from packages.blockchain.polygon.constants import POLYGON_TOKENS

    # Start with existing tokens
    updated_tokens = POLYGON_TOKENS.copy()

    # Add discovered tokens from cache
    cached_tokens = get_cached_tokens()
    for symbol, token_data in cached_tokens.items():
        polygon_address = token_data.get("polygon")
        if polygon_address and symbol not in updated_tokens:
            updated_tokens[symbol] = {
                "address": polygon_address,
                "decimals": token_data.get("decimals", {}).get("polygon", 18),
            }

    return updated_tokens


def update_hedera_tokens() -> dict:
    """
    Get Hedera tokens including discovered tokens from cache.

    Returns:
        Updated dictionary of Hedera tokens
    """
    from packages.blockchain.hedera.constants import HEDERA_TOKENS

    # Start with existing tokens
    updated_tokens = HEDERA_TOKENS.copy()

    # Add discovered tokens from cache
    cached_tokens = get_cached_tokens()
    for symbol, token_data in cached_tokens.items():
        hedera_address = token_data.get("hedera")
        if hedera_address and symbol not in updated_tokens:
            # For Hedera, addresses can be EVM format (0x...) or TokenId (0.0.123456)
            # We'll store both formats
            updated_tokens[symbol] = {
                "address": hedera_address,
                "decimals": token_data.get("decimals", {}).get("hedera", 8),
                "tokenid": hedera_address,  # If it's already in TokenId format
            }
            # If it's EVM format, we might need to convert, but for now store as-is

    return updated_tokens


def get_token_address_for_swap(symbol: str, chain: str) -> str | None:
    """
    Get token address for swap operations, using both constants and cache.

    Args:
        symbol: Token symbol (e.g., "USDC")
        chain: Chain name ("ethereum", "polygon", "hedera")

    Returns:
        Token address or None if not found
    """
    symbol_upper = symbol.upper()

    # First check cache
    from packages.blockchain.token_discovery import get_token_for_chain

    cached_token = get_token_for_chain(symbol_upper, chain)
    if cached_token:
        return cached_token["address"]

    # Fallback to constants
    if chain == "ethereum":
        from packages.blockchain.ethereum.constants import ETHEREUM_TOKENS

        if symbol_upper in ETHEREUM_TOKENS:
            return ETHEREUM_TOKENS[symbol_upper]["address"]
    elif chain == "polygon":
        from packages.blockchain.polygon.constants import POLYGON_TOKENS

        if symbol_upper in POLYGON_TOKENS:
            return POLYGON_TOKENS[symbol_upper]["address"]
    elif chain == "hedera":
        from packages.blockchain.hedera.constants import HEDERA_TOKENS

        if symbol_upper in HEDERA_TOKENS:
            token_data = HEDERA_TOKENS[symbol_upper]
            # Return EVM address if available, otherwise tokenid
            return token_data.get("address") or token_data.get("tokenid")

    return None
