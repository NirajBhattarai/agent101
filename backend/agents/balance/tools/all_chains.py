"""All chains balance tool."""

import concurrent.futures

from .ethereum import get_balance_ethereum
from .hedera import get_balance_hedera
from .polygon import get_balance_polygon


def get_balance_all_chains(account_address: str, token_address: str | None = None) -> dict:
    """
    Get token balance for an account across all supported chains.
    Executes chain queries in parallel for better performance.

    Args:
        account_address: The wallet/account address to check balance for.
                        Note: Polygon/Ethereum use 0x format, Hedera uses 0.0.123 format.
                        This function will try both formats, but it's recommended
                        to use chain-specific addresses when possible.
        token_address: Optional token address or symbol

    Returns:
        Dictionary with balance information across all chains.
    """
    try:
        # Execute chain queries in parallel using ThreadPoolExecutor
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            polygon_future = executor.submit(get_balance_polygon, account_address, token_address)
            hedera_future = executor.submit(get_balance_hedera, account_address, token_address)
            ethereum_future = executor.submit(get_balance_ethereum, account_address, token_address)

            # Wait for all results with timeout
            try:
                polygon_result = polygon_future.result(timeout=30)
                hedera_result = hedera_future.result(timeout=30)
                ethereum_result = ethereum_future.result(timeout=30)
            except concurrent.futures.TimeoutError:
                # Handle timeout - get partial results
                polygon_result = _build_chain_error("polygon", account_address, "Request timeout")
                hedera_result = _build_chain_error("hedera", account_address, "Request timeout")
                ethereum_result = _build_chain_error("ethereum", account_address, "Request timeout")
            except Exception as e:
                # Handle other exceptions
                polygon_result = _build_chain_error("polygon", account_address, str(e))
                hedera_result = _build_chain_error("hedera", account_address, str(e))
                ethereum_result = _build_chain_error("ethereum", account_address, str(e))

        return _build_success_response(
            account_address, token_address, polygon_result, hedera_result, ethereum_result
        )
    except Exception as e:
        return _build_error_response(account_address, token_address, str(e))


def _build_chain_error(chain: str, account_address: str, error_msg: str) -> dict:
    """Build error response for a single chain."""
    return {
        "type": "balance",
        "chain": chain,
        "account_address": account_address,
        "error": f"Error fetching {chain} balance: {error_msg}",
        "balances": [],
        "total_usd_value": "$0.00",
    }


def _validate_chain_result(result: dict, chain: str, account_address: str) -> dict:
    """Validate and normalize chain result."""
    if not isinstance(result, dict):
        return _build_chain_error(chain, account_address, "Invalid response from balance tool")
    return result


def _build_success_response(
    account_address: str,
    token_address: str | None,
    polygon_result: dict,
    hedera_result: dict,
    ethereum_result: dict,
) -> dict:
    """Build successful response from chain results."""
    polygon_result = _validate_chain_result(polygon_result, "polygon", account_address)
    hedera_result = _validate_chain_result(hedera_result, "hedera", account_address)
    ethereum_result = _validate_chain_result(ethereum_result, "ethereum", account_address)

    return {
        "type": "balance_summary",
        "account_address": account_address,
        "token_address": token_address,
        "chains": {
            "polygon": polygon_result,
            "hedera": hedera_result,
            "ethereum": ethereum_result,
        },
        "total_usd_value": "$0.00",
    }


def _build_error_response(account_address: str, token_address: str | None, error_msg: str) -> dict:
    """Build error response for all chains."""
    return {
        "type": "balance_summary",
        "account_address": account_address or "unknown",
        "token_address": token_address,
        "chains": {
            "polygon": _build_chain_error("polygon", account_address or "unknown", error_msg),
            "hedera": _build_chain_error("hedera", account_address or "unknown", error_msg),
            "ethereum": _build_chain_error("ethereum", account_address or "unknown", error_msg),
        },
        "total_usd_value": "$0.00",
        "error": error_msg,
    }
