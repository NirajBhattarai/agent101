"""
Response building utilities for balance agent.

Handles construction of balance responses for different chains.
"""

from typing import Optional

from ..core.constants import (
    CHAIN_ALL,
    CHAIN_ETHEREUM,
    CHAIN_HEDERA,
    CHAIN_POLYGON,
    DEFAULT_TOTAL_USD_VALUE,
    RESPONSE_TYPE,
)
from ..tools import (
    get_balance_all_chains,
    get_balance_ethereum,
    get_balance_hedera,
    get_balance_polygon,
)
from ..tools.popular_tokens import get_popular_tokens

# Token search and discovery moved to Token Research Agent
from .token_filter import filter_balances_by_token


def add_chain_to_balances(balances: list, chain: str) -> list:
    """Add chain information to balance entries."""
    return [{**balance, "chain": chain} for balance in balances]


def build_unknown_chain_response(chain: str, account_address: str) -> dict:
    """Build response for unknown chain."""
    return {
        "type": RESPONSE_TYPE,
        "chain": chain,
        "account_address": account_address,
        "balances": [],
        "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
    }


def build_balance_response(
    chain: str, account_address: str, token_symbol: str | None = None
) -> dict:
    """
    Build balance response based on chain and optional token.

    Routes to appropriate chain tool or combines results for all chains.
    The tools already return the correct format, so we just route to them.

    Args:
        chain: Chain name (ethereum, polygon, hedera, all)
        account_address: Account address to query
        token_symbol: Optional token symbol to filter by
    """
    if chain == CHAIN_ETHEREUM:
        result = get_balance_ethereum(account_address, token_symbol)
    elif chain == CHAIN_POLYGON:
        result = get_balance_polygon(account_address, token_symbol)
    elif chain == CHAIN_HEDERA:
        result = get_balance_hedera(account_address, token_symbol)
    elif chain == CHAIN_ALL:
        result = build_all_chains_response(account_address, token_symbol)
    else:
        result = build_unknown_chain_response(chain, account_address)

    # Filter balances by token_symbol if provided
    if token_symbol and result.get("balances"):
        result["balances"] = filter_balances_by_token(result["balances"], token_symbol)
        result["token_symbol"] = token_symbol

    return result


def build_token_balance_response(chain: str, account_address: str, token_symbol: str) -> dict:
    """
    Build balance response for a specific token on a specific chain.

    Args:
        chain: Chain name
        account_address: Account address
        token_symbol: Token symbol to query

    Returns:
        Balance response dictionary (filtered to only include the requested token)
    """
    # Try direct query first (build_balance_response now filters by token_symbol)
    result = build_balance_response(chain, account_address, token_symbol)

    # Check if token was found (result is already filtered by build_balance_response)
    balances = result.get("balances", [])
    token_found = len(balances) > 0

    if token_found:
        # Ensure result only contains the requested token (double-check filtering)
        result["balances"] = filter_balances_by_token(balances, token_symbol)
        result["token_symbol"] = token_symbol
        return result

    # Token not found in config - return empty result with error message
    print(f"⚠️  Token {token_symbol} not found in config for {chain}")
    print("💡 Tip: Use Token Research Agent to search for token addresses")

    # Return empty balance result
    result["balances"] = []
    result["token_symbol"] = token_symbol
    result["error"] = (
        f"Token {token_symbol} not found in configuration for {chain}. Use Token Research Agent to search for token addresses."
    )
    return result


def build_all_chains_token_response(account_address: str, token_symbol: str) -> dict:
    """
    Build balance response for a token across all supported chains.

    Args:
        account_address: Account address
        token_symbol: Token symbol to query

    Returns:
        Combined balance response from all chains
    """
    chains = [CHAIN_ETHEREUM, CHAIN_POLYGON, CHAIN_HEDERA]
    all_balances = []

    for chain in chains:
        chain_result = build_token_balance_response(chain, account_address, token_symbol)
        chain_balances = chain_result.get("balances", [])
        # Filter to only include the requested token and add chain info
        filtered_balances = filter_balances_by_token(chain_balances, token_symbol)
        token_balances = [{**balance, "chain": chain} for balance in filtered_balances]
        all_balances.extend(token_balances)

    return {
        "type": RESPONSE_TYPE,
        "chain": CHAIN_ALL,
        "account_address": account_address,
        "token_symbol": token_symbol,
        "balances": all_balances,
        "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
    }


def build_popular_tokens_response(account_address: str | None) -> dict:
    """
    Build balance response for popular tokens across all chains.

    Args:
        account_address: Account address (optional for popular tokens query)

    Returns:
        Combined balance response for popular tokens
    """
    # Use default address if not provided (for popular tokens query)
    if not account_address:
        account_address = "N/A"

    popular_tokens = get_popular_tokens()
    all_balances = []

    # Limit to 5 tokens to avoid rate limits
    for token_info in popular_tokens[:5]:
        token_symbol = token_info.get("symbol", "")
        if not token_symbol:
            continue

        # Query across all chains
        chains = [CHAIN_ETHEREUM, CHAIN_POLYGON, CHAIN_HEDERA]
        for chain in chains:
            chain_result = build_token_balance_response(chain, account_address, token_symbol)
            chain_balances = chain_result.get("balances", [])
            filtered_balances = filter_balances_by_token(chain_balances, token_symbol)
            token_balances = [{**balance, "chain": chain} for balance in filtered_balances]
            all_balances.extend(token_balances)

    return {
        "type": RESPONSE_TYPE,
        "chain": CHAIN_ALL,
        "account_address": account_address,
        "query_type": "popular_tokens",
        "balances": all_balances,
        "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
    }


def build_all_chains_response(account_address: str, token_symbol: str | None = None) -> dict:
    """
    Build response for all chains.
    Consolidated function that handles both general all-chains and token-specific queries.

    Args:
        account_address: Account address
        token_symbol: Optional token symbol to filter by
    """
    result = get_balance_all_chains(account_address)
    if result.get("type") == "balance_summary":
        # Extract balances from each chain
        all_balances = []
        for chain_name, chain_result in result.get("chains", {}).items():
            chain_balances = chain_result.get("balances", [])
            if token_symbol:
                # Filter by token symbol using centralized utility
                chain_balances = filter_balances_by_token(chain_balances, token_symbol)
            all_balances.extend(add_chain_to_balances(chain_balances, chain_name))

        response = {
            "type": RESPONSE_TYPE,
            "chain": CHAIN_ALL,
            "account_address": account_address,
            "balances": all_balances,
            "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
        }
        if token_symbol:
            response["token_symbol"] = token_symbol
        return response
    return result
