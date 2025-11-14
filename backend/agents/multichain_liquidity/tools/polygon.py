"""Polygon liquidity tool."""

import os
from packages.blockchain.polygon.uniswap.pool.web3_client import (
    UniswapWeb3Client as PolygonUniswapClient,
)

POLYGON_MAINNET_RPC = os.getenv(
    "POLYGON_MAINNET_RPC", 
    "https://polygon-rpc.com"  # More reliable public RPC
)


def get_polygon_liquidity(token_a: str, token_b: str, fee: int = 3000) -> dict:
    """
    Get liquidity for a token pair on Polygon.

    Args:
        token_a: Token A address (EVM format: 0x...)
        token_b: Token B address (EVM format: 0x...)
        fee: Pool fee tier (500, 3000, or 10000)

    Returns:
        Dictionary with pool address, liquidity, and slot0 data
    """
    try:
        client = PolygonUniswapClient(
            rpc_url=POLYGON_MAINNET_RPC, network="mainnet"
        )
        pool_info = client.get_pool_info(token_a, token_b, fee=fee)

        if pool_info:
            return {
                "chain": "polygon",
                "network": "mainnet",
                "pool_address": pool_info["pool_address"],
                "token_a": token_a,
                "token_b": token_b,
                "fee": fee,
                "liquidity": pool_info["liquidity"],
                "tick": pool_info["slot0"]["tick"],
                "sqrt_price_x96": pool_info["slot0"]["sqrtPriceX96"],
                "status": "success",
            }
        else:
            return {
                "chain": "polygon",
                "network": "mainnet",
                "pool_address": None,
                "token_a": token_a,
                "token_b": token_b,
                "fee": fee,
                "liquidity": None,
                "status": "pool_not_found",
            }
    except Exception as e:
        return {
            "chain": "polygon",
            "network": "mainnet",
            "token_a": token_a,
            "token_b": token_b,
            "fee": fee,
            "status": "error",
            "error": str(e),
        }

