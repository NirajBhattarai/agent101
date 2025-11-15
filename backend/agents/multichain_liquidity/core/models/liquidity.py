"""
Liquidity domain models.

Pydantic models for liquidity-related data structures.
"""

from typing import Optional

from pydantic import BaseModel, Field

from ..constants import RESPONSE_TYPE


class LiquidityResult(BaseModel):
    """Represents a single liquidity pool result."""

    chain: str = Field(description="Chain name: ethereum, polygon, or hedera")
    pool_address: str | None = Field(default=None, description="Pool address")
    token_a: str = Field(description="Token A address")
    token_b: str = Field(description="Token B address")
    fee: int = Field(description="Fee tier in basis points")
    liquidity: str | None = Field(default=None, description="Liquidity amount")
    tick: int | None = Field(default=None, description="Current tick")
    sqrt_price_x96: str | None = Field(default=None, description="Square root price")
    status: str = Field(description="Status: success, pool_not_found, or error")
    error: str | None = Field(default=None, description="Error message if any")


class StructuredLiquidity(BaseModel):
    """Structured liquidity response model."""

    type: str = Field(default=RESPONSE_TYPE, description="Response type")
    chain: str = Field(description="Chain name: ethereum, polygon, hedera, or all")
    token_a: str = Field(description="Token A address")
    token_b: str = Field(description="Token B address")
    results: list[LiquidityResult] = Field(description="List of liquidity results")
    error: str | None = Field(default=None, description="Error message if any")
