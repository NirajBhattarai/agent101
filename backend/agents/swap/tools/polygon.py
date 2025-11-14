"""
Polygon swap tool.

Tool for executing swaps on Polygon chain using Uniswap V3.
"""

from packages.blockchain.polygon.uniswap.swap import get_swap_polygon as _get_swap_polygon


def get_swap_polygon(
    token_in_symbol: str,
    token_out_symbol: str,
    amount_in: str,
    account_address: str,
    slippage_tolerance: float = 0.5,
) -> dict:
    """
    Get swap configuration for Polygon chain.

    Args:
        token_in_symbol: Token symbol to swap from (e.g., "MATIC", "USDC")
        token_out_symbol: Token symbol to swap to (e.g., "USDC", "MATIC")
        amount_in: Amount to swap (human-readable format)
        account_address: Account address for the swap
        slippage_tolerance: Slippage tolerance percentage (default: 0.5)

    Returns:
        Dictionary with swap configuration
    """
    return _get_swap_polygon(
        token_in_symbol=token_in_symbol,
        token_out_symbol=token_out_symbol,
        amount_in=amount_in,
        account_address=account_address,
        slippage_tolerance=slippage_tolerance,
    )
