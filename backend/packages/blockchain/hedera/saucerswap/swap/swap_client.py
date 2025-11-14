"""
SaucerSwap swap client.

Handles swap configuration and preparation for Hedera chain using SaucerSwap DEX.
"""

import os
from typing import Any, Dict, Optional

from packages.blockchain.hedera.constants import HEDERA_TOKENS

# Default DEX configuration for Hedera (SaucerSwap)
SAUCERSWAP_DEX_CONFIG = {
    "name": "SaucerSwap",
    "router_address": "0x00000000000000000000000000000000006715e6",
    "default_fee_percent": 0.3,
}

# RPC URL for Hedera
HEDERA_MAINNET_RPC = os.getenv("HEDERA_MAINNET_RPC", "https://mainnet-public.mirrornode.hedera.com")


def get_token_address_hedera(token_symbol: str, use_evm: bool = False) -> Optional[str]:
    """
    Get token address for Hedera.

    Args:
        token_symbol: Token symbol (e.g., "HBAR", "USDC")
        use_evm: If True, return EVM address (0x...), else return Hedera token ID (0.0.123456)

    Returns:
        Token address or None if not found
    """
    token_symbol_upper = token_symbol.upper()
    if token_symbol_upper not in HEDERA_TOKENS:
        return None

    token_info = HEDERA_TOKENS[token_symbol_upper]
    if use_evm:
        return token_info["address"]
    return token_info["tokenid"]


def get_swap_hedera(
    token_in_symbol: str,
    token_out_symbol: str,
    amount_in: str,
    account_address: str,
    slippage_tolerance: float = 0.5,
    dex_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Get swap configuration for Hedera chain using SaucerSwap.

    Args:
        token_in_symbol: Token symbol to swap from (e.g., "HBAR", "USDC")
        token_out_symbol: Token symbol to swap to (e.g., "USDC", "HBAR")
        amount_in: Amount to swap (human-readable format)
        account_address: Account address for the swap
        slippage_tolerance: Slippage tolerance percentage (default: 0.5)
        dex_name: Optional DEX name (default: uses SaucerSwap)

    Returns:
        Dictionary with swap configuration including addresses, paths, etc.
    """
    # Get token addresses (Hedera format for balance checking)
    token_in_address_hedera = get_token_address_hedera(token_in_symbol, use_evm=False)
    token_out_address_hedera = get_token_address_hedera(token_out_symbol, use_evm=False)

    # Get EVM addresses (for contract calls)
    token_in_address_evm = get_token_address_hedera(token_in_symbol, use_evm=True)
    token_out_address_evm = get_token_address_hedera(token_out_symbol, use_evm=True)

    if not token_in_address_hedera or not token_out_address_hedera:
        raise ValueError(
            f"Token not found: {token_in_symbol} or {token_out_symbol} not in HEDERA_TOKENS"
        )

    # Get DEX configuration (SaucerSwap)
    dex_config = SAUCERSWAP_DEX_CONFIG
    dex_name_actual = dex_config.get("name", "SaucerSwap")
    router_address = dex_config.get("router_address", "0x00000000000000000000000000000000006715e6")

    # Calculate swap path (use EVM addresses for contract calls)
    # For Hedera, common path is WHBAR -> Token (for native HBAR swaps)
    swap_path_evm = []

    if token_in_symbol.upper() == "HBAR":
        # Native HBAR swap: HBAR -> WHBAR -> Token
        whbar_address_evm = get_token_address_hedera("WHBAR", use_evm=True)
        if whbar_address_evm:
            swap_path_evm.append(whbar_address_evm)
        swap_path_evm.append(token_out_address_evm)
    elif token_out_symbol.upper() == "HBAR":
        # Token -> WHBAR -> HBAR
        swap_path_evm.append(token_in_address_evm)
        whbar_address_evm = get_token_address_hedera("WHBAR", use_evm=True)
        if whbar_address_evm:
            swap_path_evm.append(whbar_address_evm)
    else:
        # Token -> Token (may need intermediate path)
        swap_path_evm.append(token_in_address_evm)
        swap_path_evm.append(token_out_address_evm)

    # Calculate estimated output (mock for now - in production, query DEX pools)
    try:
        amount_float = float(amount_in)
    except (ValueError, TypeError):
        amount_float = 0.01

    # Simple estimation: 0.5% fee
    amount_out_float = amount_float * 0.995
    amount_out_min_float = amount_out_float * (1 - slippage_tolerance / 100)

    return {
        "chain": "hedera",
        "token_in_symbol": token_in_symbol.upper(),
        "token_in_address": token_in_address_hedera,  # Hedera format for balance checking
        "token_in_address_evm": token_in_address_evm,  # EVM format for contract calls
        "token_out_symbol": token_out_symbol.upper(),
        "token_out_address": token_out_address_hedera,  # Hedera format for balance checking
        "token_out_address_evm": token_out_address_evm,  # EVM format for contract calls
        "amount_in": amount_in,
        "amount_out": f"{amount_out_float:.6f}",
        "amount_out_min": f"{amount_out_min_float:.6f}",
        "swap_path": swap_path_evm,  # EVM addresses for contract calls
        "swap_path_hedera": [
            token_in_address_hedera,
            token_out_address_hedera,
        ],  # Hedera format for reference
        "dex_name": dex_name_actual,
        "router_address": router_address,
        "slippage_tolerance": slippage_tolerance,
        "swap_fee_percent": dex_config.get("default_fee_percent", 0.3),
        "rpc_url": HEDERA_MAINNET_RPC,
    }
