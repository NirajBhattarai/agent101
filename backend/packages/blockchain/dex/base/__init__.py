"""Base classes and interfaces for DEX integrations."""

__version__ = "0.1.0"

from packages.blockchain.dex.base.types import PoolInfo, Slot0Data
from packages.blockchain.dex.base.web3_client_base import BaseUniswapV3Client, FEE_TIERS

__all__ = [
    "BaseUniswapV3Client",
    "FEE_TIERS",
    "PoolInfo",
    "Slot0Data",
]

