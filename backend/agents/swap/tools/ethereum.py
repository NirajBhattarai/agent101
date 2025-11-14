"""
Ethereum swap tool.

Tool for executing swaps on Ethereum chain using Uniswap V3.
"""

from packages.blockchain.ethereum.uniswap.swap import get_swap_ethereum as _get_swap_ethereum


def get_swap_ethereum(
    token_in_symbol: str,
    token_out_symbol: str,
    amount_in: str,
    account_address: str,
    slippage_tolerance: float = 0.5,
) -> dict:
    """
    Get swap configuration for Ethereum chain.

    Args:
        token_in_symbol: Token symbol to swap from (e.g., "ETH", "USDC")
        token_out_symbol: Token symbol to swap to (e.g., "USDC", "ETH")
        amount_in: Amount to swap (human-readable format)
        account_address: Account address for the swap
        slippage_tolerance: Slippage tolerance percentage (default: 0.5)

    Returns:
        Dictionary with swap configuration
    """
    return _get_swap_ethereum(
        token_in_symbol=token_in_symbol,
        token_out_symbol=token_out_symbol,
        amount_in=amount_in,
        account_address=account_address,
        slippage_tolerance=slippage_tolerance,
    )
