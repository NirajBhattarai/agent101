"""Hedera liquidity tool."""

import os
from packages.blockchain.hedera.saucerswap.pool.web3_client import (
    SaucerSwapWeb3Client,
)

# Default to mainnet for now (as requested)
HEDERA_MAINNET_RPC = os.getenv("HEDERA_MAINNET_RPC", "https://mainnet.hashio.io/api")
HEDERA_TESTNET_RPC = os.getenv("HEDERA_TESTNET_RPC", HEDERA_MAINNET_RPC)


def get_hedera_liquidity(token_a: str, token_b: str, fee: int = 3000) -> dict:
    """
    Get liquidity for a token pair on Hedera (SaucerSwap).

    Args:
        token_a: Token A address (EVM format: 0x...)
        token_b: Token B address (EVM format: 0x...)
        fee: Pool fee tier (500, 3000, or 10000)

    Returns:
        Dictionary with pool address, liquidity, and slot0 data
    """
    try:
        # Use mainnet by default (as requested)
        client = SaucerSwapWeb3Client(rpc_url=HEDERA_MAINNET_RPC, network="mainnet")
        pool_info = client.get_pool_info(token_a, token_b, fee=fee)

        if pool_info:
            return {
                "chain": "hedera",
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
                "chain": "hedera",
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
            "chain": "hedera",
            "network": "mainnet",
            "token_a": token_a,
            "token_b": token_b,
            "fee": fee,
            "status": "error",
            "error": str(e),
        }

