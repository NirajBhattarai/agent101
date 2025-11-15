"""
SaucerSwap swap client.

Handles swap configuration and preparation for Hedera chain using SaucerSwap DEX.
"""

import os
from typing import Any, Optional

from web3 import Web3
from web3.providers import HTTPProvider

from packages.blockchain.dex.abis import UNISWAP_V3_ROUTER_ABI
from packages.blockchain.hedera.constants import HEDERA_TOKENS

# Default DEX configuration for Hedera (SaucerSwap)
SAUCERSWAP_DEX_CONFIG = {
    "name": "SaucerSwap",
    "router_address": "0x00000000000000000000000000000000006715e6",
    "default_fee_percent": 0.3,
}

# RPC URL for Hedera (use hashio.io for JSON-RPC compatibility)
HEDERA_MAINNET_RPC = os.getenv("HEDERA_MAINNET_RPC", "https://mainnet.hashio.io/api")


def get_amounts_out(
    amount_in: str,
    swap_path: list[str],
    router_address: str,
    token_in_symbol: str,
    rpc_url: str,
) -> list[int] | None:
    """
    Call router.getAmountsOut to get expected output amounts.

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
        # For HBAR swaps, use WHBAR decimals (8) since swap path uses WHBAR and WHBAR has 8 decimals
        token_in_upper = token_in_symbol.upper()
        if token_in_upper == "HBAR":
            # HBAR swaps use WHBAR in the path, so use WHBAR decimals (8, same as HBAR)
            whbar_info = HEDERA_TOKENS.get("WHBAR", {})
            decimals = whbar_info.get("decimals", 8)
        elif token_in_upper not in HEDERA_TOKENS:
            return None
        else:
            decimals = HEDERA_TOKENS[token_in_upper].get("decimals", 18)

        amount_float = float(amount_in)
        amount_in_wei = int(amount_float * (10**decimals))

        # Initialize web3
        w3 = Web3(HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"⚠️ Failed to connect to RPC: {rpc_url}")
            return None

        # Create router contract
        router_contract = w3.eth.contract(
            address=Web3.to_checksum_address(router_address), abi=UNISWAP_V3_ROUTER_ABI
        )

        # Normalize path addresses
        normalized_path = [Web3.to_checksum_address(addr) for addr in swap_path]

        # Call getAmountsOut
        amounts = router_contract.functions.getAmountsOut(amount_in_wei, normalized_path).call()

        print(f"✅ getAmountsOut result: {amounts} for path {swap_path}")
        return amounts
    except Exception as e:
        print(f"⚠️ Error calling getAmountsOut: {e}")
        return None


def get_token_address_hedera(token_symbol: str, use_evm: bool = False) -> str | None:
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
    dex_name: str | None = None,
    token_out_decimals: int | None = None,
) -> dict[str, Any]:
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

    # If tokens not found in constants, they should be resolved by Token Research Agent before calling this
    # For now, we'll allow None addresses and let the caller handle it
    if not token_in_address_hedera or not token_out_address_hedera:
        # Don't raise error - let Token Research Agent resolve it upstream
        print(f"⚠️  Token not found in constants: {token_in_symbol} or {token_out_symbol}")
        # Return None addresses - will be filled by token resolver
        if not token_in_address_hedera:
            token_in_address_hedera = None
            token_in_address_evm = None
        if not token_out_address_hedera:
            token_out_address_hedera = None
            token_out_address_evm = None

    # Get DEX configuration (SaucerSwap)
    dex_config = SAUCERSWAP_DEX_CONFIG
    dex_name_actual = dex_config.get("name", "SaucerSwap")
    router_address = dex_config.get("router_address", "0x00000000000000000000000000000000006715e6")

    # Calculate swap path (use EVM addresses for contract calls)
    # For Hedera, common path is WHBAR -> Token (for native HBAR swaps)
    swap_path_evm = []

    # Ensure we have addresses before building path
    if not token_in_address_evm or not token_out_address_evm:
        # Addresses will be filled by token resolver upstream
        # Return minimal config for now
        return {
            "chain": "hedera",
            "token_in_symbol": token_in_symbol.upper(),
            "token_in_address": token_in_address_hedera,
            "token_in_address_evm": token_in_address_evm,
            "token_out_symbol": token_out_symbol.upper(),
            "token_out_address": token_out_address_hedera,
            "token_out_address_evm": token_out_address_evm,
            "amount_in": amount_in,
            "amount_out": "0",
            "amount_out_min": "0",
            "swap_path": [],
            "swap_path_hedera": [],
            "router_address": router_address,
            "dex_name": dex_name_actual,
            "slippage_tolerance": slippage_tolerance,
        }

    if token_in_symbol.upper() == "HBAR":
        # Native HBAR swap: HBAR -> WHBAR -> Token
        whbar_address_evm = get_token_address_hedera("WHBAR", use_evm=True)
        if whbar_address_evm:
            swap_path_evm.append(whbar_address_evm)
        if token_out_address_evm:
            swap_path_evm.append(token_out_address_evm)
    elif token_out_symbol.upper() == "HBAR":
        # Token -> WHBAR -> HBAR
        if token_in_address_evm:
            swap_path_evm.append(token_in_address_evm)
        whbar_address_evm = get_token_address_hedera("WHBAR", use_evm=True)
        if whbar_address_evm:
            swap_path_evm.append(whbar_address_evm)
    else:
        # Token -> Token (may need intermediate path)
        if token_in_address_evm:
            swap_path_evm.append(token_in_address_evm)
        if token_out_address_evm:
            swap_path_evm.append(token_out_address_evm)

    # Calculate expected output using router.getAmountsOut
    try:
        amount_float = float(amount_in)
    except (ValueError, TypeError):
        amount_float = 0.01

    # Try to get actual amounts from router
    amounts = get_amounts_out(
        amount_in=amount_in,
        swap_path=swap_path_evm,
        router_address=router_address,
        token_in_symbol=token_in_symbol,
        rpc_url=HEDERA_MAINNET_RPC,
    )

    if amounts and len(amounts) > 0:
        # Get token out decimals - use provided decimals from token_resolver if available
        if token_out_decimals is None:
            token_out_upper = token_out_symbol.upper()
            token_out_decimals = HEDERA_TOKENS.get(token_out_upper, {}).get("decimals", 18)

        # Last element in amounts array is the output amount
        amount_out_wei = amounts[-1]
        amount_out_float = amount_out_wei / (10**token_out_decimals)
        print(f"✅ Calculated amount_out from router: {amount_out_float} {token_out_symbol}")
        print(f"   Amount out (wei): {amount_out_wei}, Decimals: {token_out_decimals}")
        print(
            f"💰 Swap Output: {amount_in} {token_in_symbol.upper()} → {amount_out_float:.6f} {token_out_symbol.upper()}"
        )
    else:
        # Fallback to simple estimation if router call fails
        print("⚠️ Router getAmountsOut failed, using estimation")
        amount_out_float = amount_float * 0.995
        print(
            f"💰 Swap Output (estimated): {amount_in} {token_in_symbol.upper()} → {amount_out_float:.6f} {token_out_symbol.upper()}"
        )

    amount_out_min_float = amount_out_float * (1 - slippage_tolerance / 100)
    print(
        f"📊 Minimum output (with {slippage_tolerance}% slippage): {amount_out_min_float:.6f} {token_out_symbol.upper()}"
    )

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
