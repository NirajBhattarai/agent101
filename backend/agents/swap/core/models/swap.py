"""
Swap domain models.

Pydantic models for swap-related data structures.
"""

from typing import Optional

from pydantic import BaseModel, Field

from ..constants import RESPONSE_TYPE


class SwapTransaction(BaseModel):
    """Represents a swap transaction."""

    chain: str = Field(description="Chain (ethereum, polygon, or hedera)")
    token_in_symbol: str = Field(description="Token symbol to swap from (e.g., HBAR, USDC)")
    token_in_address: str = Field(description="Token address to swap from")
    token_out_symbol: str = Field(description="Token symbol to swap to (e.g., USDC, HBAR)")
    token_out_address: str = Field(description="Token address to swap to")
    amount_in: str = Field(description="Amount to swap in human-readable format")
    amount_out: str = Field(description="Amount out in human-readable format")
    amount_out_min: str = Field(description="Minimum amount out")
    swap_fee: str = Field(description="Swap fee")
    swap_fee_percent: float = Field(description="Swap fee percentage")
    estimated_time: str = Field(description="Estimated swap time (e.g., '~30 seconds')")
    dex_name: str = Field(description="DEX name (e.g., SaucerSwap, Uniswap)")
    pool_address: str = Field(description="Pool contract address")
    slippage_tolerance: float = Field(description="Slippage tolerance percentage")
    transaction_hash: str | None = Field(
        default=None, description="Transaction hash if swap is initiated"
    )
    status: str = Field(description="Swap status: pending, completed, failed")
    price_impact: str | None = Field(default=None, description="Price impact percentage")


class SwapOption(BaseModel):
    """Represents a swap option from a DEX."""

    dex_name: str = Field(description="DEX name")
    amount_out: str = Field(description="Estimated amount out")
    swap_fee: str = Field(description="Swap fee")
    swap_fee_percent: float = Field(description="Swap fee percentage")
    price_impact: str | None = Field(default=None, description="Price impact")
    estimated_time: str = Field(description="Estimated swap time")
    pool_address: str = Field(description="Pool contract address")
    is_recommended: bool | None = Field(
        default=False, description="Is this the recommended option (best rate)"
    )


class SwapBalanceCheck(BaseModel):
    """Represents a balance check result."""

    account_address: str = Field(description="Account address checked")
    token_symbol: str = Field(description="Token symbol")
    balance: str = Field(description="Current balance")
    balance_sufficient: bool = Field(description="Whether balance is sufficient")
    required_amount: str = Field(description="Amount required (including fees)")


class StructuredSwap(BaseModel):
    """Structured swap response model."""

    type: str = Field(default=RESPONSE_TYPE, description="Response type")
    chain: str = Field(description="Chain (ethereum, polygon, or hedera)")
    token_in_symbol: str = Field(description="Token symbol to swap from")
    token_out_symbol: str = Field(description="Token symbol to swap to")
    amount_in: str = Field(description="Amount to swap")
    account_address: str | None = Field(default=None, description="Account address")
    balance_check: SwapBalanceCheck | None = Field(default=None, description="Balance check result")
    swap_options: list[SwapOption] | None = Field(
        default=None,
        description="Available swap options (TEMPORARY: not used, direct swap)",
    )
    transaction: SwapTransaction | None = Field(
        default=None, description="Swap transaction details (if initiated)"
    )
    requires_confirmation: bool | None = Field(
        default=False,
        description="Whether explicit confirmation is required due to high amount",
    )
    confirmation_threshold: float | None = Field(
        default=None, description="The threshold amount that requires confirmation"
    )
    amount_exceeds_threshold: bool | None = Field(
        default=False,
        description="Whether the amount exceeds the confirmation threshold",
    )
    error: str | None = Field(default=None, description="Error message if any")
