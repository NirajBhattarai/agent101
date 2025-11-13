"""Shared DEX (Decentralized Exchange) utilities and ABIs."""

__version__ = "0.1.0"

from packages.blockchain.dex.abis import UNISWAP_V3_FACTORY_ABI, UNISWAP_V3_POOL_ABI
from packages.blockchain.dex.base import BaseUniswapV3Client, FEE_TIERS, PoolInfo, Slot0Data
from packages.blockchain.dex.utils import (
    DEXError,
    InvalidAddressError,
    InvalidFeeTierError,
    PoolNotFoundError,
    normalize_address,
    validate_address,
)

__all__ = [
    "UNISWAP_V3_FACTORY_ABI",
    "UNISWAP_V3_POOL_ABI",
    "BaseUniswapV3Client",
    "FEE_TIERS",
    "PoolInfo",
    "Slot0Data",
    "normalize_address",
    "validate_address",
    "DEXError",
    "InvalidAddressError",
    "InvalidFeeTierError",
    "PoolNotFoundError",
]

