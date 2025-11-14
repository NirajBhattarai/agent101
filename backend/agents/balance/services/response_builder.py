"""
Response building utilities for balance agent.

Handles construction of balance responses for different chains.
"""

from ..tools import (
    get_balance_ethereum,
    get_balance_polygon,
    get_balance_hedera,
    get_balance_all_chains,
)
from ..core.constants import (
    RESPONSE_TYPE,
    CHAIN_ETHEREUM,
    CHAIN_POLYGON,
    CHAIN_HEDERA,
    CHAIN_ALL,
    DEFAULT_TOTAL_USD_VALUE,
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


def build_balance_response(chain: str, account_address: str) -> dict:
    """Build balance response based on chain.

    Routes to appropriate chain tool or combines results for all chains.
    The tools already return the correct format, so we just route to them.
    """
    if chain == CHAIN_ETHEREUM:
        return get_balance_ethereum(account_address)
    if chain == CHAIN_POLYGON:
        return get_balance_polygon(account_address)
    if chain == CHAIN_HEDERA:
        return get_balance_hedera(account_address)
    if chain == CHAIN_ALL:
        return build_all_chains_response(account_address)
    return build_unknown_chain_response(chain, account_address)

