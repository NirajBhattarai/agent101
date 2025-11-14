"""
Balance domain models.

Pydantic models for balance-related data structures.
"""

from typing import Optional
from pydantic import BaseModel, Field
from ..constants import RESPONSE_TYPE


class TokenBalance(BaseModel):
    """Represents a single token balance."""

    token_type: str = Field(description="Type: 'native' or 'token'")
    token_symbol: str = Field(description="Token symbol (e.g., HBAR, USDC, ETH)")
    token_address: str = Field(description="Token address")
    balance: str = Field(description="Balance in human-readable format")
    balance_raw: str = Field(description="Raw balance value")
    decimals: int = Field(description="Token decimals")
    chain: Optional[str] = Field(default=None, description="Chain name")
    error: Optional[str] = Field(default=None, description="Error message if any")


class StructuredBalance(BaseModel):
    """Structured balance response model."""

    type: str = Field(default=RESPONSE_TYPE, description="Response type")
    chain: str = Field(description="Chain name: ethereum, polygon, hedera, or all")
    account_address: str = Field(description="Account address queried")
    balances: list[TokenBalance] = Field(description="List of token balances")
    total_usd_value: str = Field(description="Total USD value estimate")
    error: Optional[str] = Field(default=None, description="Error message if any")

