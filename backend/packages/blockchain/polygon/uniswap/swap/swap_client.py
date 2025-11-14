"""
Uniswap swap client for Polygon.

Handles swap configuration and preparation for Polygon chain using Uniswap V2 Router 02.
"""

import os
from typing import Any, Dict, Optional

from web3 import Web3
from web3.providers import HTTPProvider

from packages.blockchain.dex.abis import UNISWAP_V2_ROUTER_ABI
from packages.blockchain.polygon.constants import POLYGON_TOKENS

# Default DEX configuration for Polygon (Uniswap V2 Router 02)
UNISWAP_POLYGON_DEX_CONFIG = {
    "name": "Uniswap V2",
    "router_address": "0xedf6066a2b290c185783862c7f4776a2c8077ad1",  # Uniswap V2 Router 02 on Polygon
    "default_fee_percent": 0.3,
}

# RPC URL for Polygon
POLYGON_MAINNET_RPC = os.getenv("POLYGON_MAINNET_RPC", "https://polygon-rpc.com")


def get_amounts_out(
    amount_in: str,
    swap_path: list[str],
    router_address: str,
    token_in_symbol: str,
    rpc_url: str,
) -> Optional[list[int]]:
    """
    Call router.getAmountsOut to get expected output amounts (Uniswap V2 Router 02).

    Args:
        amount_in: Input amount as string (human-readable)
        swap_path: List of token addresses in swap path (EVM format)
        router_address: Router contract address (EVM format)
        token_in_symbol: Token in symbol for decimals
        rpc_url: RPC URL for web3 connection

    Returns:
        List of amounts (in wei/smallest unit) or None if call fails
    """
    try:
        # Get token decimals for amount conversion
        token_in_upper = token_in_symbol.upper()
        # Map MATIC to WMATIC for decimals lookup
        if token_in_upper == "MATIC":
            token_in_upper = "WMATIC"

        if token_in_upper not in POLYGON_TOKENS:
            return None

        decimals = POLYGON_TOKENS[token_in_upper].get("decimals", 18)
        amount_float = float(amount_in)
        amount_in_wei = int(amount_float * (10**decimals))

        # Initialize web3
        w3 = Web3(HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"⚠️ Failed to connect to RPC: {rpc_url}")
            return None

        # Create router contract (V2 Router 02)
        router_contract = w3.eth.contract(
            address=Web3.to_checksum_address(router_address), abi=UNISWAP_V2_ROUTER_ABI
        )

        # Normalize path addresses
        normalized_path = [Web3.to_checksum_address(addr) for addr in swap_path]

        # Call getAmountsOut (V2 router supports this)
        amounts = router_contract.functions.getAmountsOut(amount_in_wei, normalized_path).call()

        print(f"✅ getAmountsOut result: {amounts} for path {swap_path}")
        return amounts
    except Exception as e:
        print(f"⚠️ Error calling getAmountsOut: {e}")
        return None


def get_token_address_polygon(token_symbol: str) -> Optional[str]:
    """
    Get token address for Polygon.

    Args:
        token_symbol: Token symbol (e.g., "USDC", "USDT", "WMATIC", "MATIC")
        Note: "MATIC" is automatically converted to "WMATIC" for swaps

    Returns:
        Token address or None if not found
    """
    token_symbol_upper = token_symbol.upper()

    # Map MATIC to WMATIC for swaps (native MATIC must be wrapped)
    if token_symbol_upper == "MATIC":
        token_symbol_upper = "WMATIC"

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
    Get swap configuration for Polygon chain using Uniswap V2 Router 02.

    Args:
        token_in_symbol: Token symbol to swap from (e.g., "MATIC", "USDC")
        token_out_symbol: Token symbol to swap to (e.g., "USDC", "MATIC")
        amount_in: Amount to swap (human-readable format)
        account_address: Account address for the swap
        slippage_tolerance: Slippage tolerance percentage (default: 0.5)
        dex_name: Optional DEX name (default: uses Uniswap V2 Router 02)

    Returns:
        Dictionary with swap configuration including addresses, paths, etc.
    """
    # Get DEX configuration (Uniswap V2 Router 02)
    dex_config = UNISWAP_POLYGON_DEX_CONFIG
    dex_name_actual = dex_config.get("name", "Uniswap V2")
    router_address = dex_config.get("router_address", "0xedf6066a2b290c185783862c7f4776a2c8077ad1")

    # Normalize token symbols (MATIC -> WMATIC for swaps)
    token_in_normalized = (
        "WMATIC" if token_in_symbol.upper() == "MATIC" else token_in_symbol.upper()
    )
    token_out_normalized = (
        "WMATIC" if token_out_symbol.upper() == "MATIC" else token_out_symbol.upper()
    )

    # Get addresses using normalized symbols (get_token_address_polygon already handles MATIC -> WMATIC)
    token_in_address_normalized = get_token_address_polygon(token_in_normalized)
    token_out_address_normalized = get_token_address_polygon(token_out_normalized)

    # If tokens not found in constants, they should be resolved by Token Research Agent before calling this
    if not token_in_address_normalized or not token_out_address_normalized:
        # Don't raise error - let Token Research Agent resolve it upstream
        print(f"⚠️  Token not found in constants: {token_in_normalized} or {token_out_normalized}")
        # Return None addresses - will be filled by token resolver
        if not token_in_address_normalized:
            token_in_address_normalized = None
        if not token_out_address_normalized:
            token_out_address_normalized = None

    # Ensure we have addresses before building path
    if not token_in_address_normalized or not token_out_address_normalized:
        # Addresses will be filled by token resolver upstream
        # Return minimal config for now
        return {
            "chain": "polygon",
            "token_in_symbol": token_in_normalized,
            "token_in_address": token_in_address_normalized,
            "token_out_symbol": token_out_normalized,
            "token_out_address": token_out_address_normalized,
            "amount_in": amount_in,
            "amount_out": "0",
            "amount_out_min": "0",
            "swap_path": [],
            "router_address": router_address,
            "dex_name": dex_name_actual,
            "slippage_tolerance": slippage_tolerance,
        }

    # Calculate swap path
    # For Polygon, MATIC must be converted to WMATIC for swaps
    swap_path = []

    # Build swap path
    if token_in_normalized == "WMATIC":
        # WMATIC -> Token (direct path, WMATIC is already wrapped)
        swap_path.append(token_in_address_normalized)
        swap_path.append(token_out_address_normalized)
    elif token_out_normalized == "WMATIC":
        # Token -> WMATIC (direct path)
        swap_path.append(token_in_address_normalized)
        swap_path.append(token_out_address_normalized)
    else:
        # Token -> Token (direct path)
        swap_path.append(token_in_address_normalized)
        swap_path.append(token_out_address_normalized)

    # Calculate expected output using router.getAmountsOut
    try:
        amount_float = float(amount_in)
    except (ValueError, TypeError):
        amount_float = 0.01

    # Try to get actual amounts from router
    amounts = get_amounts_out(
        amount_in=amount_in,
        swap_path=swap_path,
        router_address=router_address,
        token_in_symbol=token_in_normalized,
        rpc_url=POLYGON_MAINNET_RPC,
    )

    if amounts and len(amounts) > 0:
        # Get token out decimals
        token_out_decimals = POLYGON_TOKENS.get(token_out_normalized, {}).get("decimals", 18)
        # Last element in amounts array is the output amount
        amount_out_wei = amounts[-1]
        amount_out_float = amount_out_wei / (10**token_out_decimals)
        print(f"✅ Calculated amount_out from router: {amount_out_float} {token_out_normalized}")
        print(
            f"💰 Swap Output: {amount_in} {token_in_normalized} → {amount_out_float:.6f} {token_out_normalized}"
        )
    else:
        # Fallback to simple estimation if router call fails
        print("⚠️ Router getAmountsOut failed, using estimation")
        amount_out_float = amount_float * 0.995
        print(
            f"💰 Swap Output (estimated): {amount_in} {token_in_normalized} → {amount_out_float:.6f} {token_out_normalized}"
        )

    amount_out_min_float = amount_out_float * (1 - slippage_tolerance / 100)
    print(
        f"📊 Minimum output (with {slippage_tolerance}% slippage): {amount_out_min_float:.6f} {token_out_normalized}"
    )

    return {
        "chain": "polygon",
        "token_in_symbol": token_in_symbol.upper(),  # Keep original symbol for display
        "token_in_address": token_in_address_normalized,  # Use normalized address
        "token_out_symbol": token_out_symbol.upper(),  # Keep original symbol for display
        "token_out_address": token_out_address_normalized,  # Use normalized address
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
