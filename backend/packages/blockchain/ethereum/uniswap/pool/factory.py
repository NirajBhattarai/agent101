"""Uniswap V3 Factory and Pair Address utilities for Ethereum."""

from typing import Optional

from packages.blockchain.ethereum.uniswap.constants import NETWORKS


def get_factory_address(network: str = "mainnet") -> str:
    """
    Get Uniswap V3 factory address for the specified network.

    Args:
        network: Network type - "mainnet" or "sepolia" (default: "mainnet")

    Returns:
        Factory contract address

    Raises:
        ValueError: If network is not supported
    """
    network = network.lower()
    if network not in NETWORKS:
        raise ValueError(
            f"Unsupported network: {network}. Supported networks: {list(NETWORKS.keys())}"
        )
    return NETWORKS[network]["factory"]


def get_v3_pair_address(
    token_a: str,
    token_b: str,
    fee: int = 3000,
    network: str = "mainnet",
    rpc_url: Optional[str] = None,
) -> Optional[str]:
    """
    Get V3 pair address from Uniswap factory using Web3.

    Args:
        token_a: Token A address (EVM format: 0x...)
        token_b: Token B address (EVM format: 0x...)
        fee: Pool fee tier in basis points (e.g., 3000 for 0.3%, 10000 for 1%)
        network: Network type - "mainnet" or "sepolia" (default: "mainnet")
        rpc_url: Optional RPC URL. If not provided, must be set via environment

    Returns:
        Pair address if found, None otherwise

    Raises:
        ValueError: If network is not supported or invalid inputs
        RuntimeError: If RPC URL is not provided
    """
    if not rpc_url:
        raise RuntimeError("RPC URL is required. Provide rpc_url parameter or set RPC_URL env var.")

    from packages.blockchain.ethereum.uniswap.pool.web3_client import UniswapWeb3Client

    client = UniswapWeb3Client(rpc_url=rpc_url, network=network)
    return client.get_pool_address(token_a, token_b, fee)


def get_v3_pair_address_with_factory(
    token_a: str,
    token_b: str,
    fee: int = 3000,
    factory_address: Optional[str] = None,
    network: str = "mainnet",
) -> Optional[str]:
    """
    Get V3 pair address using a specific factory address.

    Args:
        token_a: Token A address (EVM format: 0x...)
        token_b: Token B address (EVM format: 0x...)
        fee: Pool fee tier in basis points (default: 3000 for 0.3%)
        factory_address: Optional custom factory address. If not provided, uses network default
        network: Network type - "mainnet" or "sepolia" (default: "mainnet")

    Returns:
        Pair address if found, None otherwise

    Raises:
        ValueError: If invalid inputs provided
    """
    if factory_address is None:
        factory_address = get_factory_address(network)

    if not factory_address or factory_address == "0x0000000000000000000000000000000000000000":
        raise ValueError(f"Invalid factory address: {factory_address}")

    return get_v3_pair_address(token_a, token_b, fee, network)


def validate_pair_address(
    pair_address: str,
    token_a: str,
    token_b: str,
    fee: int,
    network: str = "mainnet",
) -> bool:
    """
    Validate if a pair address matches the expected tokens and fee.

    Args:
        pair_address: Pair address to validate
        token_a: Token A address
        token_b: Token B address
        fee: Pool fee tier
        network: Network type

    Returns:
        True if pair address is valid, False otherwise
    """
    # TODO: Implement validation logic
    # This would typically involve:
    # 1. Querying the pair contract for token0, token1, and fee
    # 2. Comparing with provided values
    return False

