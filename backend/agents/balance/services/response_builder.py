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
from ..tools.token_discovery import (
    get_popular_tokens,
    search_token_contract_address,
    search_token_on_web,
)


def add_chain_to_balances(balances: list, chain: str) -> list:
    """Add chain information to balance entries."""
    return [{**balance, "chain": chain} for balance in balances]


def build_all_chains_response(account_address: str) -> dict:
    """Build response for all chains."""
    result = get_balance_all_chains(account_address)
    if result.get("type") == "balance_summary":
        # Extract balances from each chain
        all_balances = []
        for chain_name, chain_result in result.get("chains", {}).items():
            chain_balances = chain_result.get("balances", [])
            all_balances.extend(add_chain_to_balances(chain_balances, chain_name))

        return {
            "type": RESPONSE_TYPE,
            "chain": CHAIN_ALL,
            "account_address": account_address,
            "balances": all_balances,
            "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
        }
    return result


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
    chain: str, account_address: str, token_symbol: Optional[str] = None
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
        token_symbol_upper = token_symbol.upper()
        filtered_balances = [
            balance
            for balance in result.get("balances", [])
            if balance.get("token_symbol", "").upper() == token_symbol_upper
        ]
        result["balances"] = filtered_balances
        # Update token_symbol in response for clarity
        result["token_symbol"] = token_symbol

    return result


def build_token_balance_response(
    chain: str, account_address: str, token_symbol: str
) -> dict:
    """
    Build balance response for a specific token on a specific chain.

    If token is not found in config, attempts web search to find contract address.

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
    token_found = len(balances) > 0 and any(
        balance.get("token_symbol", "").upper() == token_symbol.upper()
        for balance in balances
    )

    if token_found:
        # Ensure result only contains the requested token (double-check filtering)
        filtered_balances = [
            balance
            for balance in balances
            if balance.get("token_symbol", "").upper() == token_symbol.upper()
        ]
        result["balances"] = filtered_balances
        result["token_symbol"] = token_symbol
        return result

    # Token not found in config, try web search
    print(f"🔍 Token {token_symbol} not found in config for {chain}, searching web...")
    token_info = search_token_contract_address(token_symbol, chain)

    if token_info:
        contract_address = token_info.get("contract_address")
        if contract_address:
            # Try querying with contract address (then filter by token_symbol)
            result = build_balance_response(chain, account_address, contract_address)
            # Filter to ensure only the requested token is returned
            if result.get("balances"):
                filtered_balances = [
                    balance
                    for balance in result.get("balances", [])
                    if balance.get("token_symbol", "").upper() == token_symbol.upper()
                ]
                if filtered_balances:
                    result["balances"] = filtered_balances
                    result["token_symbol"] = token_symbol
                    return result

    # If still not found, return error response
    return {
        "type": RESPONSE_TYPE,
        "chain": chain,
        "account_address": account_address,
        "token_symbol": token_symbol,
        "balances": [],
        "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
        "error": f"Token {token_symbol} not found on {chain}. "
        "Could not resolve contract address.",
        "search_attempted": True,
    }


def build_all_chains_token_response(
    account_address: str, token_symbol: str
) -> dict:
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
        # Filter to only include the requested token
        token_balances = [
            {**balance, "chain": chain}
            for balance in chain_balances
            if balance.get("token_symbol", "").upper() == token_symbol.upper()
        ]
        all_balances.extend(token_balances)

    return {
        "type": RESPONSE_TYPE,
        "chain": CHAIN_ALL,
        "account_address": account_address,
        "token_symbol": token_symbol,
        "balances": all_balances,
        "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
    }


def build_popular_tokens_response(account_address: str) -> dict:
    """
    Build balance response for popular tokens across all chains.

    Args:
        account_address: Account address

    Returns:
        Combined balance response for popular tokens
    """
    popular_tokens = get_popular_tokens()
    all_balances = []

    for token_info in popular_tokens[:10]:  # Limit to top 10
        token_symbol = token_info.get("symbol", "")
        if not token_symbol:
            continue

        # Query across all chains
        chains = [CHAIN_ETHEREUM, CHAIN_POLYGON, CHAIN_HEDERA]
        for chain in chains:
            chain_result = build_token_balance_response(
                chain, account_address, token_symbol
            )
            chain_balances = chain_result.get("balances", [])
            token_balances = [
                {**balance, "chain": chain}
                for balance in chain_balances
                if balance.get("token_symbol", "").upper() == token_symbol.upper()
            ]
            all_balances.extend(token_balances)

    return {
        "type": RESPONSE_TYPE,
        "chain": CHAIN_ALL,
        "account_address": account_address,
        "query_type": "popular_tokens",
        "balances": all_balances,
        "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
    }


def build_all_chains_response(
    account_address: str, token_symbol: Optional[str] = None
) -> dict:
    """
    Build response for all chains.

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
                # Filter by token symbol
                chain_balances = [
                    balance
                    for balance in chain_balances
                    if balance.get("token_symbol", "").upper() == token_symbol.upper()
                ]
            all_balances.extend(add_chain_to_balances(chain_balances, chain_name))

        return {
            "type": RESPONSE_TYPE,
            "chain": CHAIN_ALL,
            "account_address": account_address,
            "balances": all_balances,
            "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
        }
    return result
