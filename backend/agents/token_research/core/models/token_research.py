"""Pydantic models for Token Research Agent responses."""

from typing import Optional

from pydantic import BaseModel, Field


class TokenInfo(BaseModel):
    """Token information model."""

    symbol: str = Field(description="Token symbol")
    name: str = Field(description="Token name")
    address: str | None = Field(default=None, description="Token contract address")
    chain: str | None = Field(default=None, description="Chain name")
    decimals: int | None = Field(default=None, description="Token decimals")
    coin_id: str | None = Field(default=None, description="CoinGecko coin ID")
    market_cap_rank: int | None = Field(default=None, description="Market cap rank")


class TokenSearchResult(BaseModel):
    """Token search result model."""

    token_symbol: str = Field(description="Token symbol searched")
    tokens: list[TokenInfo] = Field(default_factory=list, description="Found tokens")
    source: str = Field(description="Data source (coingecko, web_search, etc.)")


class TokenDiscoveryResult(BaseModel):
    """Token discovery result model."""

    total_tokens: int = Field(description="Total number of tokens discovered")
    tokens_by_chain: dict = Field(default_factory=dict, description="Tokens grouped by chain")
    tokens: list[TokenInfo] = Field(default_factory=list, description="List of discovered tokens")


class TokenResearchResponse(BaseModel):
    """Token research response model."""

    type: str = Field(default="token_research", description="Response type")
    query_type: str | None = Field(
        default=None, description="Type of query (search, discovery, etc.)"
    )
    token_symbol: str | None = Field(default=None, description="Token symbol if specific search")
    chain: str | None = Field(default=None, description="Chain name if specific")
    search_result: TokenSearchResult | None = Field(default=None, description="Search results")
    discovery_result: TokenDiscoveryResult | None = Field(
        default=None, description="Discovery results"
    )
    error: str | None = Field(default=None, description="Error message if any")
