"""Hedera balance tool using packages/blockchain."""

from typing import Optional

from packages.blockchain.hedera.balance import (
    get_account_identifier_for_api,
    get_hedera_api_base,
    get_multiple_token_balances_hedera,
    get_native_hbar_balance,
    get_token_balance_hedera,
    resolve_hedera_account_id,
)
from packages.blockchain.hedera.constants import HEDERA_TOKENS


def _resolve_token_symbol_from_id(token_id: str) -> Optional[str]:
    """Resolve token symbol from token ID."""
    token_id_upper = token_id.upper()
    if token_id_upper in HEDERA_TOKENS:
        return token_id_upper

    for symbol, token_data in HEDERA_TOKENS.items():
        if token_data["tokenid"] == token_id:
            return symbol

    return None


def _resolve_token_address(token_address: str) -> str:
    """Resolve token symbol to address if needed."""
    if token_address.upper() in HEDERA_TOKENS:
        return HEDERA_TOKENS[token_address.upper()]["tokenid"]
    return token_address


def _get_specific_token_balance(api_base: str, account_identifier: str, token_id: str) -> dict:
    """Get balance for a specific token using packages/blockchain."""
    token_symbol = _resolve_token_symbol_from_id(token_id)

    # Resolve account ID (handles both EVM and Hedera formats)
    account_id = resolve_hedera_account_id(account_identifier, api_base)

    if token_symbol:
        result = get_token_balance_hedera(account_id, token_symbol)
        if "error" not in result and "token_address" in result:
            return {
                "token_type": "token",
                "token_symbol": result["token_symbol"],
                "token_address": result["token_address"],
                "balance": result["balance"],
                "balance_raw": result["balance_raw"],
                "decimals": result["decimals"],
            }
        elif "error" not in result:
            return {
                "token_type": "token",
                "token_symbol": result["token_symbol"],
                "token_address": HEDERA_TOKENS[token_symbol]["tokenid"],
                "balance": "0",
                "balance_raw": "0",
                "decimals": HEDERA_TOKENS[token_symbol].get("decimals", 6),
            }
        else:
            return {
                "token_type": "token",
                "token_symbol": result.get("token_symbol", token_symbol),
                "token_address": HEDERA_TOKENS[token_symbol]["tokenid"],
                "balance": "0",
                "balance_raw": "0",
                "decimals": HEDERA_TOKENS[token_symbol].get("decimals", 6),
                "error": result.get("error", "Unknown error"),
            }

    # Fallback for unknown tokens
    try:
        result = get_token_balance_hedera(account_id, token_id)
        if "error" not in result and "token_address" in result:
            return {
                "token_type": "token",
                "token_symbol": result["token_symbol"],
                "token_address": result["token_address"],
                "balance": result["balance"],
                "balance_raw": result["balance_raw"],
                "decimals": result["decimals"],
            }
        symbol = token_id.split(".")[-1] if "." in token_id else token_id
        return {
            "token_type": "token",
            "token_symbol": symbol,
            "token_address": token_id,
            "balance": "0",
            "balance_raw": "0",
            "decimals": 6,
            "error": result.get("error", "Token not found"),
        }
    except Exception as e:
        symbol = token_id.split(".")[-1] if "." in token_id else token_id
        return {
            "token_type": "token",
            "token_symbol": symbol,
            "token_address": token_id,
            "balance": "0",
            "balance_raw": "0",
            "decimals": 6,
            "error": str(e),
        }


def _get_all_token_balances(api_base: str, account_identifier: str) -> list:
    """Get balances for all tokens in HEDERA_TOKENS."""
    # Resolve account ID (handles both EVM and Hedera formats)
    account_id = resolve_hedera_account_id(account_identifier, api_base)

    token_symbols = [symbol for symbol in HEDERA_TOKENS.keys() if symbol != "HBAR"]

    results = get_multiple_token_balances_hedera(account_id, token_symbols)

    balances = []
    for i, result in enumerate(results):
        token_symbol = token_symbols[i]

        if "error" not in result and "token_address" in result:
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
        elif "error" not in result:
            balances.append(
                {
                    "token_type": "token",
                    "token_symbol": result.get("token_symbol", token_symbol),
                    "token_address": HEDERA_TOKENS[token_symbol]["tokenid"],
                    "balance": "0",
                    "balance_raw": "0",
                    "decimals": HEDERA_TOKENS[token_symbol].get("decimals", 6),
                }
            )
        else:
            balances.append(
                {
                    "token_type": "token",
                    "token_symbol": result.get("token_symbol", token_symbol),
                    "token_address": HEDERA_TOKENS.get(token_symbol, {}).get("tokenid", "0.0.0"),
                    "balance": "0",
                    "balance_raw": "0",
                    "decimals": 6,
                    "error": result.get("error", "Unknown error"),
                }
            )
    return balances


def get_balance_hedera(
    account_address: str, token_address: Optional[str] = None
) -> dict:
    """
    Get token balance for an account on Hedera chain.

    Args:
        account_address: The Hedera account ID (e.g., '0.0.123456') or EVM address (0x...)
        token_address: Optional token address. If not provided, returns native HBAR
                      and all token balances. Can be a token symbol (e.g., 'USDC')
                      or token address.

    Returns:
        Dictionary with balance information including native and token balances.
    """
    if not account_address or not isinstance(account_address, str):
        return {
            "type": "balance",
            "chain": "hedera",
            "account_address": str(account_address) if account_address else "unknown",
            "error": "Invalid account address provided",
            "balances": [],
            "total_usd_value": "$0.00",
        }

    try:
        # Always use mainnet
        api_base = get_hedera_api_base("mainnet")

        # Resolve account ID (handles both EVM and Hedera formats)
        account_id = resolve_hedera_account_id(account_address, api_base)

        # Get account identifier for API calls (prefers EVM format if available)
        account_identifier = get_account_identifier_for_api(account_address, account_id)

        balances = []
        
        # Check if token_address is "HBAR" (native token)
        token_address_upper = token_address.upper() if token_address else None
        is_hbar_query = token_address_upper == "HBAR" or token_address_upper == "0.0.0"
        
        if token_address:
            # Specific token query
            if is_hbar_query:
                # Only return native HBAR balance
                native_balance = get_native_hbar_balance(account_identifier, api_base)
                if isinstance(native_balance, dict):
                    balances.append(native_balance)
            else:
                # Get specific token balance (not HBAR)
                token_id = _resolve_token_address(token_address)
                token_balance = _get_specific_token_balance(api_base, account_identifier, token_id)
                if isinstance(token_balance, dict):
                    balances.append(token_balance)
        else:
            # Get all balances (native HBAR + all tokens)
            native_balance = get_native_hbar_balance(account_identifier, api_base)
            if isinstance(native_balance, dict):
                balances.append(native_balance)
            all_balances = _get_all_token_balances(api_base, account_identifier)
            if isinstance(all_balances, list):
                balances.extend(all_balances)

        # Use account_id for the response (resolved format)
        final_account_id = account_id if account_id else account_address

        return {
            "type": "balance",
            "chain": "hedera",
            "account_address": final_account_id,
            "balances": balances,
            "total_usd_value": "$0.00",
        }
    except Exception as e:
        return {
            "type": "balance",
            "chain": "hedera",
            "account_address": str(account_address) if account_address else "unknown",
            "error": str(e),
            "balances": [],
            "total_usd_value": "$0.00",
        }
