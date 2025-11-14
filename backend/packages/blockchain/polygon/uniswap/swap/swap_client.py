"""
Uniswap swap client for Polygon.

Handles swap configuration and preparation for Polygon chain using Uniswap V3.
"""

import os
from typing import Any, Dict, Optional

from packages.blockchain.polygon.constants import POLYGON_TOKENS

# Default DEX configuration for Polygon (Uniswap V3)
UNISWAP_POLYGON_DEX_CONFIG = {
    "name": "Uniswap V3",
    "router_address": "0xE592427A0AEce92De3Edee1F18E0157C05861564",  # Uniswap V3 Router
    "default_fee_percent": 0.3,
}

# RPC URL for Polygon
POLYGON_MAINNET_RPC = os.getenv("POLYGON_MAINNET_RPC", "https://polygon-rpc.com")


def get_token_address_polygon(token_symbol: str) -> Optional[str]:
    """
    Get token address for Polygon.

    Args:
        token_symbol: Token symbol (e.g., "USDC", "USDT", "WMATIC")

    Returns:
        Token address or None if not found
    """
    token_symbol_upper = token_symbol.upper()
    if token_symbol_upper not in POLYGON_TOKENS:
        return None

    token_info = POLYGON_TOKENS[token_symbol_upper]
    return token_info["address"]


def get_swap_polygon(
    token_in_symbol: str,
    token_out_symbol: str,
    amount_in: str,
    account_address: str,
    slippage_tolerance: float = 0.5,
    dex_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Get swap configuration for Polygon chain using Uniswap V3.

    Args:
        token_in_symbol: Token symbol to swap from (e.g., "MATIC", "USDC")
        token_out_symbol: Token symbol to swap to (e.g., "USDC", "MATIC")
        amount_in: Amount to swap (human-readable format)
        account_address: Account address for the swap
        slippage_tolerance: Slippage tolerance percentage (default: 0.5)
        dex_name: Optional DEX name (default: uses Uniswap V3)

    Returns:
        Dictionary with swap configuration including addresses, paths, etc.
    """
    # Get token addresses
    token_in_address = get_token_address_polygon(token_in_symbol)
    token_out_address = get_token_address_polygon(token_out_symbol)

    if not token_in_address or not token_out_address:
        raise ValueError(
            f"Token not found: {token_in_symbol} or {token_out_symbol} not in POLYGON_TOKENS"
        )

    # Get DEX configuration (Uniswap V3)
    dex_config = UNISWAP_POLYGON_DEX_CONFIG
    dex_name_actual = dex_config.get("name", "Uniswap V3")
    router_address = dex_config.get("router_address", "0xE592427A0AEce92De3Edee1F18E0157C05861564")

    # Calculate swap path
    # For Polygon, direct path for most swaps
    swap_path = []

    if token_in_symbol.upper() == "MATIC":
        # Native MATIC swap: MATIC -> WMATIC -> Token
        wmatic_address = get_token_address_polygon("WMATIC")
        if wmatic_address:
            swap_path.append(wmatic_address)
        swap_path.append(token_out_address)
    elif token_out_symbol.upper() == "MATIC":
        # Token -> WMATIC -> MATIC
        swap_path.append(token_in_address)
        wmatic_address = get_token_address_polygon("WMATIC")
        if wmatic_address:
            swap_path.append(wmatic_address)
    else:
        # Token -> Token (direct path)
        swap_path.append(token_in_address)
        swap_path.append(token_out_address)

    # Calculate estimated output (mock for now - in production, query DEX pools)
    try:
        amount_float = float(amount_in)
    except (ValueError, TypeError):
        amount_float = 0.01

    # Simple estimation: 0.5% fee
    amount_out_float = amount_float * 0.995
    amount_out_min_float = amount_out_float * (1 - slippage_tolerance / 100)

    return {
        "chain": "polygon",
        "token_in_symbol": token_in_symbol.upper(),
        "token_in_address": token_in_address,
        "token_out_symbol": token_out_symbol.upper(),
        "token_out_address": token_out_address,
        "amount_in": amount_in,
        "amount_out": f"{amount_out_float:.6f}",
        "amount_out_min": f"{amount_out_min_float:.6f}",
        "swap_path": swap_path,
        "dex_name": dex_name_actual,
        "router_address": router_address,
        "slippage_tolerance": slippage_tolerance,
        "swap_fee_percent": dex_config.get("default_fee_percent", 0.3),
        "rpc_url": POLYGON_MAINNET_RPC,
    }
