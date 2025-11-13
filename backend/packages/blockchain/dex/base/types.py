"""Type definitions for DEX operations."""

from typing import TypedDict


class Slot0Data(TypedDict):
    """Slot0 data structure from Uniswap V3 pools."""

    sqrtPriceX96: int
    tick: int
    observationIndex: int
    observationCardinality: int
    observationCardinalityNext: int
    feeProtocol: int
    unlocked: bool


class PoolInfo(TypedDict):
    """Complete pool information."""

    pool_address: str
    token0: str
    token1: str
    fee: int
    liquidity: int
    slot0: Slot0Data

