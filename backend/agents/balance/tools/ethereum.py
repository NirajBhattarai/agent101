"""Ethereum balance tool using packages/blockchain."""

from typing import Optional

from web3 import Web3

from packages.blockchain.dex.abis.erc20 import ERC20_ABI
from packages.blockchain.ethereum.balance import (
    get_multiple_token_balances_ethereum,
    get_native_eth_balance,
    get_token_balance_ethereum,
)
from packages.blockchain.ethereum.constants import ETHEREUM_TOKENS


def _resolve_token_symbol_from_address(token_address: str) -> str | None:
    """Resolve token symbol from token address."""
    token_address_upper = token_address.upper()
    if token_address_upper in ETHEREUM_TOKENS:
        return token_address_upper

    token_address_lower = token_address.lower()
    for symbol, token_data in ETHEREUM_TOKENS.items():
        if token_data["address"].lower() == token_address_lower:
            return symbol

    return None


def _resolve_token_address(token_address: str) -> str:
    """Resolve token symbol to address if needed."""
    if token_address.upper() in ETHEREUM_TOKENS:
        return ETHEREUM_TOKENS[token_address.upper()]["address"]
    return token_address


def _fetch_token_balance_data(w3: Web3, account_address: str, token_address: str) -> dict:
    """Fetch token balance data from contract (for unknown tokens)."""
    try:
        token_contract = w3.eth.contract(address=token_address, abi=ERC20_ABI)
        balance_raw = token_contract.functions.balanceOf(account_address).call()

        try:
            decimals = token_contract.functions.decimals().call()
        except Exception:
            decimals = 18

        try:
            symbol = token_contract.functions.symbol().call()
        except Exception:
            symbol = "UNKNOWN"

        balance_float = balance_raw / (10**decimals)
        return {
            "token_type": "token",
            "token_symbol": symbol,
            "token_address": token_address,
            "balance": str(balance_float),
            "balance_raw": str(balance_raw),
            "decimals": decimals,
        }
    except Exception as e:
        return {
            "token_type": "token",
            "token_symbol": "UNKNOWN",
            "token_address": token_address,
            "balance": "0",
            "balance_raw": "0",
            "decimals": 18,
            "error": str(e),
        }


def _get_token_balance(w3: Web3, account_address: str, token_address: str) -> dict:
    """Get token balance for account using packages/blockchain."""
    token_symbol = _resolve_token_symbol_from_address(token_address)

    if token_symbol:
        result = get_token_balance_ethereum(account_address, token_symbol)
        if "error" not in result:
            return {
                "token_type": "token",
                "token_symbol": result["token_symbol"],
                "token_address": result["token_address"],
                "balance": result["balance"],
                "balance_raw": result["balance_raw"],
                "decimals": result["decimals"],
            }
        else:
            return {
                "token_type": "token",
                "token_symbol": result["token_symbol"],
                "token_address": ETHEREUM_TOKENS[token_symbol]["address"],
                "balance": "0",
                "balance_raw": "0",
                "decimals": result.get("decimals", 18),
                "error": result.get("error", "Unknown error"),
            }

    # Fallback for unknown tokens
    token_address = _resolve_token_address(token_address)
    if not w3.is_address(token_address):
        return {
            "token_type": "token",
            "token_symbol": "UNKNOWN",
            "token_address": token_address,
            "balance": "0",
            "balance_raw": "0",
            "decimals": 18,
            "error": f"Invalid token address: {token_address}",
        }

    token_address = w3.to_checksum_address(token_address)
    return _fetch_token_balance_data(w3, account_address, token_address)


def _get_all_token_balances(w3: Web3, account_address: str) -> list:
    """Get balances for all tokens in ETHEREUM_TOKENS."""
    token_symbols = list(ETHEREUM_TOKENS.keys())
    results = get_multiple_token_balances_ethereum(account_address, token_symbols)

    balances = []
    for i, result in enumerate(results):
        token_symbol = token_symbols[i]

        if "error" not in result:
            balances.append(
                {
                    "token_type": "token",
                    "token_symbol": result["token_symbol"],
                    "token_address": result["token_address"],
                    "balance": result["balance"],
                    "balance_raw": result["balance_raw"],
                    "decimals": result["decimals"],
                }
            )
        else:
            balances.append(
                {
                    "token_type": "token",
                    "token_symbol": result.get("token_symbol", token_symbol),
                    "token_address": ETHEREUM_TOKENS.get(token_symbol, {}).get("address", "0x0"),
                    "balance": "0",
                    "balance_raw": "0",
                    "decimals": 18,
                    "error": result.get("error", "Unknown error"),
                }
            )
    return balances


def get_balance_ethereum(account_address: str, token_address: str | None = None) -> dict:
    """
    Get token balance for an account on Ethereum.

    Args:
        account_address: The wallet address to check balance for
        token_address: Optional token address. If not provided, returns native ETH
                      and all token balances. Can be a token symbol (e.g., 'USDC')
                      or token address.

    Returns:
        Dictionary with balance information including native and token balances.
    """
    if not account_address or not isinstance(account_address, str):
        return {
            "type": "balance",
            "chain": "ethereum",
            "account_address": str(account_address) if account_address else "unknown",
            "error": "Invalid account address provided",
            "balances": [],
            "total_usd_value": "$0.00",
        }

    try:
        import os

        from web3.providers import HTTPProvider

        rpc_url = os.getenv("ETHEREUM_MAINNET_RPC", "https://eth.llamarpc.com")
        w3 = Web3(HTTPProvider(rpc_url))

        if not w3.is_connected():
            raise ConnectionError("Failed to connect to Ethereum RPC")

        if not w3.is_address(account_address):
            raise ValueError(f"Invalid account address: {account_address}")

        account_address = w3.to_checksum_address(account_address)

        balances = []

        # Check if token_address is "ETH" (native token)
        token_address_upper = token_address.upper() if token_address else None
        is_eth_query = (
            token_address_upper == "ETH"
            or token_address_upper == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        )

        if token_address:
            # Specific token query
            if is_eth_query:
                # Only return native ETH balance
                native_balance = get_native_eth_balance(account_address)
                if isinstance(native_balance, dict):
                    balances.append(native_balance)
            else:
                # Get specific token balance (not ETH)
                token_balance = _get_token_balance(w3, account_address, token_address)
                if isinstance(token_balance, dict):
                    balances.append(token_balance)
        else:
            # Get all balances (native ETH + all tokens)
            native_balance = get_native_eth_balance(account_address)
            if isinstance(native_balance, dict):
                balances.append(native_balance)
            all_balances = _get_all_token_balances(w3, account_address)
            if isinstance(all_balances, list):
                balances.extend(all_balances)

        return {
            "type": "balance",
            "chain": "ethereum",
            "account_address": account_address,
            "balances": balances,
            "total_usd_value": "$0.00",
        }
    except Exception as e:
        return {
            "type": "balance",
            "chain": "ethereum",
            "account_address": str(account_address) if account_address else "unknown",
            "error": str(e),
            "balances": [],
            "total_usd_value": "$0.00",
        }
