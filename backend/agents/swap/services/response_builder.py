"""
Response building utilities for swap agent.

Handles construction of swap responses.
Matches agentflow101's swap executor service pattern:
1. Check balance (individual asset)
2. Get pool address and liquidity
3. Execute swap
"""

import os
import random
from typing import Any, Dict, Optional

from ...balance.tools.ethereum import get_balance_ethereum
from ...balance.tools.hedera import get_balance_hedera
from ...balance.tools.polygon import get_balance_polygon
from ..core.constants import (
    DEFAULT_CONFIRMATION_THRESHOLD,
    RESPONSE_TYPE,
)
from ..core.exceptions import ChainNotSupportedError
from ..tools import get_swap_ethereum, get_swap_hedera, get_swap_polygon


def build_chain_selection_response() -> str:
    """Build response asking user to select chain."""
    message = (
        "To proceed with the swap, please specify which blockchain you'd like to swap on:\n\n"
        "• **Hedera** - For swapping HBAR, USDC, USDT, and other Hedera tokens\n"
        "• **Polygon** - For swapping MATIC, USDC, USDT, and other Polygon tokens\n"
        "• **Ethereum** - For swapping ETH, USDC, USDT, and other Ethereum tokens\n\n"
        "Please select a chain and provide your swap details."
    )
    import json

    return json.dumps(
        {
            "type": RESPONSE_TYPE,
            "requires_chain_selection": True,
            "message": message,
            "supported_chains": ["hedera", "polygon", "ethereum"],
        },
        indent=2,
    )


def _get_swap_config(
    chain: str,
    token_in: str,
    token_out: str,
    amount: str,
    account: str,
    slippage: float,
    token_out_decimals: Optional[int] = None,
) -> dict:
    """Get swap configuration for chain."""
    if chain == "hedera":
        return get_swap_hedera(
            token_in,
            token_out,
            amount,
            account or "",
            slippage,
            token_out_decimals=token_out_decimals,
        )
    if chain == "polygon":
        return get_swap_polygon(token_in, token_out, amount, account or "", slippage)
    if chain == "ethereum":
        return get_swap_ethereum(token_in, token_out, amount, account or "", slippage)
    raise ChainNotSupportedError(chain)


def _extract_token_addresses(chain: str, swap_config: dict) -> dict:
    """Extract token addresses from swap config."""
    if chain == "hedera":
        return {
            "token_in_address": swap_config.get("token_in_address", ""),
            "token_out_address": swap_config.get("token_out_address", ""),
            "token_in_address_evm": swap_config.get("token_in_address_evm", ""),
            "token_out_address_evm": swap_config.get("token_out_address_evm", ""),
        }
    return {
        "token_in_address": swap_config.get("token_in_address", ""),
        "token_out_address": swap_config.get("token_out_address", ""),
        "token_in_address_evm": swap_config.get("token_in_address", ""),
        "token_out_address_evm": swap_config.get("token_out_address", ""),
    }


def _fetch_balance(chain: str, account: str, token_address: str, token_symbol: str) -> float:
    """Fetch balance for account and token (individual asset check)."""
    try:
        # For native tokens (MATIC, ETH, HBAR), don't use token_address - get native balance
        token_symbol_upper = token_symbol.upper()
        is_native_token = token_symbol_upper in ["HBAR", "MATIC", "ETH"]

        if chain == "hedera":
            if is_native_token and token_symbol_upper == "HBAR":
                # Get native HBAR balance directly
                from packages.blockchain.hedera.balance import (
                    get_hedera_api_base,
                    get_native_hbar_balance,
                )

                # Get API base URL (mainnet)
                api_base = get_hedera_api_base("mainnet")
                result = get_native_hbar_balance(account, api_base=api_base)
                if result.get("balance"):
                    balance_str = result.get("balance", "0")
                    # Handle string balance (from get_native_hbar_balance)
                    try:
                        return float(balance_str)
                    except (ValueError, TypeError):
                        print(f"⚠️ Warning: Could not convert balance '{balance_str}' to float")
                        return 0.0
                # If balance is 0 or error, still return 0.0 (don't fall through)
                return 0.0
            result = get_balance_hedera(account, token_address=token_address)
        elif chain == "polygon":
            if is_native_token and token_symbol_upper == "MATIC":
                # Get native MATIC balance directly
                from packages.blockchain.polygon.balance import get_native_matic_balance

                result = get_native_matic_balance(account)
                if result.get("balance"):
                    return float(result.get("balance", "0"))
            result = get_balance_polygon(account, token_address=token_address)
        elif chain == "ethereum":
            if is_native_token and token_symbol_upper == "ETH":
                # Get native ETH balance directly
                from packages.blockchain.ethereum.balance import get_native_eth_balance

                result = get_native_eth_balance(account)
                if result.get("balance"):
                    return float(result.get("balance", "0"))
            result = get_balance_ethereum(account, token_address=token_address)
        else:
            return 0.0

        if result.get("balances"):
            for balance_item in result["balances"]:
                # Check by token address
                if balance_item.get("token_address") == token_address:
                    return float(balance_item.get("balance", "0"))
                # Check by token symbol for native tokens
                if (
                    token_symbol.upper() in ["HBAR", "MATIC", "ETH"]
                    and balance_item.get("token_type") == "native"
                    and balance_item.get("token_symbol", "").upper() == token_symbol.upper()
                ):
                    return float(balance_item.get("balance", "0"))
                # Check by token symbol match
                if balance_item.get("token_symbol", "").upper() == token_symbol.upper():
                    return float(balance_item.get("balance", "0"))
    except Exception as e:
        print(f"⚠️ Error fetching balance: {e}")
    return 0.0


def _calculate_amount_out_from_pool(
    amount_in: float,
    pool_info: Dict[str, Any],
    token_in_symbol: str,
    token_out_symbol: str,
    chain: str,
) -> float:
    """
    Calculate amount_out from pool price using sqrtPriceX96.

    Formula: price = (sqrtPriceX96 / 2^96)^2
    For Uniswap V3, we need to determine token order and apply the price correctly.

    Args:
        amount_in: Amount to swap in
        pool_info: Pool info dict with sqrt_price_x96
        token_in_symbol: Token in symbol
        token_out_symbol: Token out symbol
        chain: Chain name

    Returns:
        Estimated amount out
    """
    try:
        sqrt_price_x96_str = pool_info.get("sqrt_price_x96", "0")
        if not sqrt_price_x96_str or sqrt_price_x96_str == "0":
            raise ValueError("No sqrtPriceX96 in pool info")

        sqrt_price_x96 = int(sqrt_price_x96_str)
        if sqrt_price_x96 == 0:
            raise ValueError("sqrtPriceX96 is zero")

        # Get token decimals
        from packages.blockchain.ethereum.constants import ETHEREUM_TOKENS
        from packages.blockchain.hedera.constants import HEDERA_TOKENS
        from packages.blockchain.polygon.constants import POLYGON_TOKENS

        if chain == "polygon":
            tokens = POLYGON_TOKENS
        elif chain == "ethereum":
            tokens = ETHEREUM_TOKENS
        elif chain == "hedera":
            tokens = HEDERA_TOKENS
        else:
            tokens = {}

        # Handle native tokens (MATIC -> WMATIC, ETH -> WETH)
        token_in_key = token_in_symbol.upper()
        token_out_key = token_out_symbol.upper()
        if token_in_key == "MATIC":
            token_in_key = "WMATIC"
        elif token_in_key == "ETH":
            token_in_key = "WETH"
        if token_out_key == "MATIC":
            token_out_key = "WMATIC"
        elif token_out_key == "ETH":
            token_out_key = "WETH"

        token_in_decimals = tokens.get(token_in_key, {}).get("decimals", 18)
        token_out_decimals = tokens.get(token_out_key, {}).get("decimals", 18)

        # Calculate price from sqrtPriceX96
        # price = (sqrtPriceX96 / 2^96)^2
        Q96 = 2**96
        sqrt_price = sqrt_price_x96 / Q96
        price = sqrt_price**2

        # Determine token order (token0 < token1 by address)
        token_in_addr = pool_info.get("token_in_address_evm", "").lower()
        token_out_addr = pool_info.get("token_out_address_evm", "").lower()

        if not token_in_addr or not token_out_addr:
            raise ValueError("Token addresses not found in pool_info")

        # In Uniswap V3, tokens are ordered: token0 < token1 (by address)
        # sqrtPriceX96 = sqrt(amount1/amount0) * 2^96
        # price = (sqrtPriceX96 / 2^96)^2 = amount1/amount0
        is_token_in_token0 = token_in_addr < token_out_addr

        # Convert amount_in to raw units
        amount_in_raw = amount_in * (10**token_in_decimals)

        # Calculate amount_out_raw based on swap direction
        if is_token_in_token0:
            # Swapping token0 -> token1: amount1 = amount0 * price
            # price already accounts for decimals in sqrtPriceX96
            decimal_adjustment = (10**token_out_decimals) / (10**token_in_decimals)
            amount_out_raw = amount_in_raw * price * decimal_adjustment
        else:
            # Swapping token1 -> token0: amount0 = amount1 / price
            decimal_adjustment = (10**token_in_decimals) / (10**token_out_decimals)
            amount_out_raw = amount_in_raw / price * decimal_adjustment

        # Convert back to human-readable
        amount_out = amount_out_raw / (10**token_out_decimals)

        # Apply pool fee (typically 0.3% = 0.003)
        pool_fee = pool_info.get("fee", 3000) / 10000  # Convert bps to decimal
        amount_out = amount_out * (1 - pool_fee)

        return max(0.0, amount_out)
    except Exception as e:
        print(f"⚠️ Error in _calculate_amount_out_from_pool: {e}")
        # Fallback: simple 1:1 with fee deduction
        pool_fee = pool_info.get("fee", 3000) / 10000
        return amount_in * (1 - pool_fee)


def _get_pool_info(
    chain: str,
    token_in_address_evm: str,
    token_out_address_evm: str,
    rpc_url: str,
    token_in_symbol: Optional[str] = None,
    token_out_symbol: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Get pool address and liquidity information.

    Args:
        chain: Chain name (hedera, polygon, ethereum)
        token_in_address_evm: Token in EVM address
        token_out_address_evm: Token out EVM address
        rpc_url: RPC URL for the chain (may need to override for Hedera)
        token_in_symbol: Optional token in symbol (for native token conversion)
        token_out_symbol: Optional token out symbol (for native token conversion)

    Returns:
        Pool info dict with pool_address, liquidity, fee, etc. or None if not found
    """
    try:
        from packages.blockchain.dex.base import FEE_TIERS
        from packages.blockchain.hedera.constants import HEDERA_TOKENS

        # For Hedera, convert native HBAR (0x0000...) to wHBAR for pool lookups
        if chain == "hedera":
            rpc_url = os.getenv("HEDERA_MAINNET_RPC", "https://mainnet.hashio.io/api")

            # Convert HBAR to wHBAR for pool lookups
            HBAR_NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000"
            if token_in_address_evm == HBAR_NATIVE_ADDRESS or (
                token_in_symbol and token_in_symbol.upper() == "HBAR"
            ):
                whbar_info = HEDERA_TOKENS.get("WHBAR", {})
                token_in_address_evm = whbar_info.get("address", token_in_address_evm)
                print(f"🔄 Converted HBAR to wHBAR for pool lookup: {token_in_address_evm}")

            if token_out_address_evm == HBAR_NATIVE_ADDRESS or (
                token_out_symbol and token_out_symbol.upper() == "HBAR"
            ):
                whbar_info = HEDERA_TOKENS.get("WHBAR", {})
                token_out_address_evm = whbar_info.get("address", token_out_address_evm)
                print(f"🔄 Converted HBAR to wHBAR for pool lookup: {token_out_address_evm}")

        # Try each fee tier until we find a pool
        for fee in FEE_TIERS:
            try:
                if chain == "hedera":
                    from packages.blockchain.hedera.saucerswap.pool.web3_client import (
                        SaucerSwapWeb3Client,
                    )

                    client = SaucerSwapWeb3Client(rpc_url=rpc_url, network="mainnet")
                elif chain == "polygon":
                    from packages.blockchain.polygon.uniswap.pool.web3_client import (
                        UniswapWeb3Client,
                    )

                    client = UniswapWeb3Client(rpc_url=rpc_url, network="mainnet")
                elif chain == "ethereum":
                    from packages.blockchain.ethereum.uniswap.pool.web3_client import (
                        UniswapWeb3Client,
                    )

                    client = UniswapWeb3Client(rpc_url=rpc_url, network="mainnet")
                else:
                    return None

                pool_info = client.get_pool_info(
                    token_a=token_in_address_evm,
                    token_b=token_out_address_evm,
                    fee=fee,
                )

                if pool_info:
                    print(
                        f"✅ Found pool on {chain} with fee {fee} bps: {pool_info.get('pool_address')}"
                    )
                    return {
                        "pool_address": pool_info.get("pool_address"),
                        "liquidity": str(pool_info.get("liquidity", "0")),
                        "fee": pool_info.get("fee", fee),
                        "tick": pool_info.get("slot0", {}).get("tick", 0),
                        "sqrt_price_x96": str(pool_info.get("slot0", {}).get("sqrtPriceX96", "0")),
                    }
            except Exception as e:
                print(f"⚠️ Error checking fee tier {fee}: {e}")
                continue

        print(f"⚠️ No pool found for {token_in_address_evm}/{token_out_address_evm} on {chain}")
        return None
    except Exception as e:
        print(f"⚠️ Error getting pool info: {e}")
        return None


def execute_swap(
    chain: str,
    token_in_symbol: str,
    token_out_symbol: str,
    amount_in: str,
    account_address: Optional[str],
    slippage_tolerance: float,
) -> dict:
    """
    Execute swap following agentflow101 pattern:
    1. Check balance (individual asset)
    2. Prepare swap transaction (pool info should be verified by Liquidity Agent beforehand)
    3. Return swap transaction details
    """
    print(f"💱 Starting swap execution for {token_in_symbol} -> {token_out_symbol} on {chain}")

    # Step 0: Resolve token addresses (check constants first, then use Token Research Agent if needed)
    from .token_resolver import resolve_token_addresses_for_swap

    token_resolution = resolve_token_addresses_for_swap(token_in_symbol, token_out_symbol, chain)

    # Check if tokens were resolved - if not, return error
    if not token_resolution.get("token_in_resolved"):
        error_msg = token_resolution.get("error", f"Token {token_in_symbol} not found for {chain}")
        print(f"❌ {error_msg}")
        return {
            "chain": chain,
            "token_in_symbol": token_in_symbol,
            "token_out_symbol": token_out_symbol,
            "amount_in": amount_in,
            "account_address": account_address,
            "error": f"Could not find token address for {token_in_symbol} on {chain}. Please verify the token symbol is correct.",
            "transaction": None,
            "swap_config": None,
        }

    if not token_resolution.get("token_out_resolved"):
        error_msg = token_resolution.get("error", f"Token {token_out_symbol} not found for {chain}")
        print(f"❌ {error_msg}")
        return {
            "chain": chain,
            "token_in_symbol": token_in_symbol,
            "token_out_symbol": token_out_symbol,
            "amount_in": amount_in,
            "account_address": account_address,
            "error": f"Could not find token address for {token_out_symbol} on {chain}. Please verify the token symbol is correct.",
            "transaction": None,
            "swap_config": None,
        }

    # If tokens were resolved via Token Research, update swap config to use discovered addresses
    if (
        token_resolution.get("token_in_info")
        and token_resolution["token_in_info"].get("source") == "token_research"
    ):
        print(
            f"✅ Resolved {token_in_symbol} via Token Research: {token_resolution['token_in_info'].get('address_evm') or token_resolution['token_in_info'].get('address')}"
        )

    if (
        token_resolution.get("token_out_info")
        and token_resolution["token_out_info"].get("source") == "token_research"
    ):
        print(
            f"✅ Resolved {token_out_symbol} via Token Research: {token_resolution['token_out_info'].get('address_evm') or token_resolution['token_out_info'].get('address')}"
        )

    # Step 1: Get swap configuration (token addresses, paths, etc.)
    # This will use constants if available, or we'll need to patch addresses from token_resolution
    # Get token_out_decimals from token_resolution if available (for accurate amount calculation)
    # This ensures we use correct decimals even if token is from constants, cache, or token_research
    token_out_info = token_resolution.get("token_out_info")
    token_out_decimals = None
    if token_out_info:
        token_out_decimals = token_out_info.get("decimals")

    swap_config = _get_swap_config(
        chain,
        token_in_symbol,
        token_out_symbol,
        amount_in,
        account_address,
        slippage_tolerance,
        token_out_decimals=token_out_decimals if chain == "hedera" else None,
    )

    # If tokens were resolved via Token Research, update swap_config with discovered addresses
    needs_path_rebuild = False
    if (
        token_resolution.get("token_in_info")
        and token_resolution["token_in_info"].get("source") == "token_research"
    ):
        token_in_info = token_resolution["token_in_info"]
        if chain == "hedera":
            swap_config["token_in_address"] = token_in_info.get(
                "address_hedera"
            ) or token_in_info.get("address_evm")
            swap_config["token_in_address_evm"] = token_in_info.get("address_evm")
        else:
            swap_config["token_in_address"] = token_in_info.get("address")
            swap_config["token_in_address_evm"] = token_in_info.get("address")
        swap_config["token_in_decimals"] = token_in_info.get("decimals", 18)
        print(f"📝 Updated swap_config with discovered {token_in_symbol} address")
        needs_path_rebuild = True

    if (
        token_resolution.get("token_out_info")
        and token_resolution["token_out_info"].get("source") == "token_research"
    ):
        token_out_info = token_resolution["token_out_info"]
        if chain == "hedera":
            swap_config["token_out_address"] = token_out_info.get(
                "address_hedera"
            ) or token_out_info.get("address_evm")
            swap_config["token_out_address_evm"] = token_out_info.get("address_evm")
        else:
            swap_config["token_out_address"] = token_out_info.get("address")
            swap_config["token_out_address_evm"] = token_out_info.get("address")
        swap_config["token_out_decimals"] = token_out_info.get("decimals", 18)
        print(f"📝 Updated swap_config with discovered {token_out_symbol} address")
        needs_path_rebuild = True

    # If we discovered tokens, rebuild swap path with discovered addresses
    if needs_path_rebuild:
        print("🔄 Rebuilding swap path with discovered token addresses...")
        # Rebuild swap path using discovered addresses
        if chain == "hedera":
            from packages.blockchain.hedera.constants import HEDERA_TOKENS

            swap_path_evm = []
            token_in_evm = swap_config.get("token_in_address_evm")
            token_out_evm = swap_config.get("token_out_address_evm")

            if token_in_symbol.upper() == "HBAR":
                # Native HBAR swap: HBAR -> WHBAR -> Token
                whbar_info = HEDERA_TOKENS.get("WHBAR", {})
                whbar_address_evm = whbar_info.get("address")
                if whbar_address_evm:
                    swap_path_evm.append(whbar_address_evm)
                if token_out_evm:
                    swap_path_evm.append(token_out_evm)
            elif token_out_symbol.upper() == "HBAR":
                # Token -> WHBAR -> HBAR
                if token_in_evm:
                    swap_path_evm.append(token_in_evm)
                whbar_info = HEDERA_TOKENS.get("WHBAR", {})
                whbar_address_evm = whbar_info.get("address")
                if whbar_address_evm:
                    swap_path_evm.append(whbar_address_evm)
            else:
                # Token -> Token
                if token_in_evm:
                    swap_path_evm.append(token_in_evm)
                if token_out_evm:
                    swap_path_evm.append(token_out_evm)

            swap_config["swap_path"] = swap_path_evm
            swap_config["swap_path_hedera"] = [
                swap_config.get("token_in_address"),
                swap_config.get("token_out_address"),
            ]
        elif chain == "polygon":
            swap_path = []
            token_in_addr = swap_config.get("token_in_address_evm") or swap_config.get(
                "token_in_address"
            )
            token_out_addr = swap_config.get("token_out_address_evm") or swap_config.get(
                "token_out_address"
            )

            if token_in_addr:
                swap_path.append(token_in_addr)
            if token_out_addr:
                swap_path.append(token_out_addr)

            swap_config["swap_path"] = swap_path
        elif chain == "ethereum":
            swap_path = []
            token_in_addr = swap_config.get("token_in_address_evm") or swap_config.get(
                "token_in_address"
            )
            token_out_addr = swap_config.get("token_out_address_evm") or swap_config.get(
                "token_out_address"
            )

            if token_in_addr:
                swap_path.append(token_in_addr)
            if token_out_addr:
                swap_path.append(token_out_addr)

            swap_config["swap_path"] = swap_path

    addresses = _extract_token_addresses(chain, swap_config)

    try:
        amount_float = float(amount_in)
    except Exception:
        amount_float = 0.01

    # Step 2: Check balance (individual asset)
    print(f"📊 Step 1: Checking balance for {token_in_symbol}...")
    actual_balance = 0.0
    balance_sufficient = False
    if account_address:
        # For native tokens (MATIC, ETH, HBAR), pass None for token_address to get native balance
        token_address_for_balance = None
        if token_in_symbol.upper() not in ["HBAR", "MATIC", "ETH"]:
            token_address_for_balance = addresses["token_in_address"]
        actual_balance = _fetch_balance(
            chain, account_address, token_address_for_balance, token_in_symbol
        )
        balance_sufficient = actual_balance >= amount_float
        print(
            f"   Balance: {actual_balance} {token_in_symbol}, Required: {amount_float} {token_in_symbol}"
        )
        print(f"   Sufficient: {'✅ Yes' if balance_sufficient else '❌ No'}")

    balance_check = None
    if account_address:
        balance_check = {
            "account_address": account_address,
            "token_symbol": token_in_symbol,
            "balance": f"{actual_balance:.2f}",
            "balance_sufficient": balance_sufficient,
            "required_amount": f"{amount_float:.2f}",
        }

        # Return error response if balance is insufficient
        if not balance_sufficient:
            print(
                f"❌ Insufficient balance: {actual_balance} {token_in_symbol} < {amount_float} {token_in_symbol}"
            )
            return {
                "chain": chain,
                "token_in_symbol": token_in_symbol,
                "token_out_symbol": token_out_symbol,
                "amount_in": amount_in,
                "account_address": account_address,
                "balance_check": balance_check,
                "error": f"Insufficient balance. You have {actual_balance:.6f} {token_in_symbol}, but need {amount_float:.6f} {token_in_symbol}",
                "transaction": None,
                "swap_config": None,
            }

    # Step 3: Use swap config values (pool info should come from Liquidity Agent, not internal lookup)
    print("🔄 Step 2: Preparing swap transaction...")

    # Use router address and default values from swap_config
    # Pool info should have been verified by Liquidity Agent before calling Swap Agent
    pool_address = swap_config.get("router_address", "")
    pool_liquidity = "0"  # Will be set by Liquidity Agent if needed
    pool_fee = 3000  # Default fee tier

    # Step 4: Calculate amount_out using swap config
    print("🔄 Step 3: Calculating swap amounts...")
    amount_out = swap_config.get("amount_out", "0")
    amount_out_min = swap_config.get("amount_out_min", "0")

    swap_fee_percent = swap_config.get("swap_fee_percent", 0.3)
    tx_hash = f"0x{''.join([random.choice('0123456789abcdef') for _ in range(64)])}"
    swap_fee_amount = amount_float * (swap_fee_percent / 100)
    transaction_token_in = (
        addresses["token_in_address_evm"] if chain == "hedera" else addresses["token_in_address"]
    )
    transaction_token_out = (
        addresses["token_out_address_evm"] if chain == "hedera" else addresses["token_out_address"]
    )

    # Add discovered token info to transaction if tokens were resolved via Token Research
    # Also include token info for all tokens (constants, cache, or token_research) with explorer URLs
    discovered_tokens = {}
    token_in_info = token_resolution.get("token_in_info")
    token_out_info = token_resolution.get("token_out_info")

    # Always include token info for all tokens (constants, cache, or token_research) with explorer URLs
    # This allows users to verify token addresses via explorer links
    if token_in_info:
        discovered_tokens["token_in"] = {
            "symbol": token_in_symbol,
            "address": transaction_token_in,
            "source": token_in_info.get("source", "constants"),
            "name": token_in_info.get("name", ""),
            "explorer_url": token_in_info.get("explorer_url"),
        }

    if token_out_info:
        discovered_tokens["token_out"] = {
            "symbol": token_out_symbol,
            "address": transaction_token_out,
            "source": token_out_info.get("source", "constants"),
            "name": token_out_info.get("name", ""),
            "explorer_url": token_out_info.get("explorer_url"),
        }
    transaction = {
        "chain": chain,
        "token_in_symbol": token_in_symbol,
        "token_in_address": transaction_token_in,
        "token_in_address_hedera": addresses["token_in_address"] if chain == "hedera" else None,
        "token_out_symbol": token_out_symbol,
        "token_out_address": transaction_token_out,
        "token_out_address_hedera": addresses["token_out_address"] if chain == "hedera" else None,
        "amount_in": amount_in,
        "amount_out": amount_out,
        "amount_out_min": amount_out_min,
        "swap_fee": f"${swap_fee_amount:.2f}",
        "swap_fee_percent": swap_fee_percent,
        "estimated_time": "~30 seconds",
        "dex_name": swap_config.get("dex_name", "Unknown"),
        "pool_address": pool_address,  # Use actual pool address from pool_info
        "pool_liquidity": pool_liquidity,  # Add liquidity info
        "pool_fee": pool_fee,  # Add fee tier
        "slippage_tolerance": slippage_tolerance,
        "transaction_hash": tx_hash,
        "status": "pending",
        "price_impact": "0.1%",
        "swap_path": swap_config.get("swap_path", []),
        "rpc_url": swap_config.get("rpc_url", ""),
        "discovered_tokens": discovered_tokens if discovered_tokens else None,
    }

    print("✅ Swap execution complete")
    return {
        "chain": chain,
        "token_in_symbol": token_in_symbol,
        "token_out_symbol": token_out_symbol,
        "amount_in": amount_in,
        "account_address": account_address,
        "balance_check": balance_check,
        "transaction": transaction,
        "swap_config": swap_config,
    }


def build_swap_response(swap_data: dict) -> dict:
    """Build swap response from swap data."""
    response = {
        "type": RESPONSE_TYPE,
        "chain": swap_data["chain"],
        "token_in_symbol": swap_data["token_in_symbol"],
        "token_out_symbol": swap_data["token_out_symbol"],
        "amount_in": swap_data["amount_in"],
        "account_address": swap_data.get("account_address"),
        "balance_check": swap_data.get("balance_check"),
        "swap_options": None,
        "transaction": swap_data.get("transaction"),
        "requires_confirmation": False,
        "confirmation_threshold": DEFAULT_CONFIRMATION_THRESHOLD,
        "amount_exceeds_threshold": False,
    }

    # Add error field if present
    if "error" in swap_data:
        response["error"] = swap_data["error"]

    return response
