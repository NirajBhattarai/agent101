"""
Token filtering utilities for balance agent.
Centralized functions for filtering balances by token symbol.
"""

from typing import Optional


def filter_balances_by_token(balances: list[dict], token_symbol: str | None) -> list[dict]:
    """
    Filter balances by token symbol.

    Args:
        balances: List of balance dictionaries
        token_symbol: Token symbol to filter by (case-insensitive)

    Returns:
        Filtered list of balances
    """
    if not token_symbol or not balances:
        return balances

    token_symbol_upper = token_symbol.upper()
    return [
        balance
        for balance in balances
        if balance.get("token_symbol", "").upper() == token_symbol_upper
    ]


def filter_balances_by_token_and_chain(
    balances: list[dict], token_symbol: str | None, chain: str | None = None
) -> list[dict]:
    """
    Filter balances by token symbol and optionally by chain.

    Args:
        balances: List of balance dictionaries
        token_symbol: Token symbol to filter by (case-insensitive)
        chain: Optional chain name to filter by

    Returns:
        Filtered list of balances
    """
    filtered = filter_balances_by_token(balances, token_symbol)

    if chain and filtered:
        chain_lower = chain.lower()
        filtered = [
            balance for balance in filtered if balance.get("chain", "").lower() == chain_lower
        ]

    return filtered
