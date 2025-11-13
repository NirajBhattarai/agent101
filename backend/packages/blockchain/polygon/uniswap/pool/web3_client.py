"""Web3 client for interacting with Uniswap V3 pools on Polygon."""

from packages.blockchain.dex.base import BaseUniswapV3Client, FEE_TIERS
from packages.blockchain.polygon.uniswap.constants import NETWORKS

# Re-export FEE_TIERS for backward compatibility
__all__ = ["UniswapWeb3Client", "FEE_TIERS"]


class UniswapWeb3Client(BaseUniswapV3Client):
    """Web3 client for Uniswap V3 DEX interactions on Polygon."""

    def __init__(self, rpc_url: str, network: str = "mainnet"):
        """
        Initialize Web3 client.

        Args:
            rpc_url: RPC endpoint URL
            network: Network type - "mainnet" or "mumbai"
        """
        network = network.lower()
        if network not in NETWORKS:
            raise ValueError(
                f"Unsupported network: {network}. Supported networks: {list(NETWORKS.keys())}"
            )

        factory_address = NETWORKS[network]["factory"]
        network_name = NETWORKS[network]["name"]

        super().__init__(
            rpc_url=rpc_url,
            factory_address=factory_address,
            network_name=network_name,
        )
        self.network = network
