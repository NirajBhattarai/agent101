"""Base class for Uniswap V3 Web3 clients."""

import logging
from typing import Any, Optional

from web3 import Web3
from web3.contract import Contract

from packages.blockchain.dex.abis import UNISWAP_V3_FACTORY_ABI, UNISWAP_V3_POOL_ABI
from packages.blockchain.dex.base.types import PoolInfo, Slot0Data
from packages.blockchain.dex.utils.address import normalize_address
from packages.blockchain.dex.utils.errors import InvalidAddressError, InvalidFeeTierError

# Uniswap V3 fee tiers (in basis points)
FEE_TIERS = [500, 3000, 10000]  # 0.05%, 0.3%, 1%

__all__ = ["BaseUniswapV3Client", "FEE_TIERS"]


class BaseUniswapV3Client:
    """Base Web3 client for Uniswap V3 DEX interactions."""

    def __init__(
        self,
        rpc_url: str,
        factory_address: str,
        network_name: str = "mainnet",
    ):
        """
        Initialize Web3 client.

        Args:
            rpc_url: RPC endpoint URL
            factory_address: Factory contract address
            network_name: Network name for identification
        """
        from web3.providers import HTTPProvider

        self.w3 = Web3(HTTPProvider(rpc_url))
        self.factory_address = factory_address
        self.network_name = network_name
        self._factory_contract: Optional[Contract] = None
        self.logger = logging.getLogger(f"{self.__class__.__name__}.{network_name}")

    @property
    def factory_contract(self) -> Contract:
        """Get factory contract instance."""
        if self._factory_contract is None:
            self._factory_contract = self.w3.eth.contract(
                address=normalize_address(self.factory_address),
                abi=UNISWAP_V3_FACTORY_ABI,
            )
        return self._factory_contract

    def get_pool_address(
        self,
        token_a: str,
        token_b: str,
        fee: int = 3000,
    ) -> Optional[str]:
        """
        Get pool address from factory.

        Args:
            token_a: Token A address (EVM format: 0x...)
            token_b: Token B address (EVM format: 0x...)
            fee: Pool fee tier in basis points (500, 3000, or 10000)

        Returns:
            Pool address if exists, None otherwise

        Raises:
            InvalidFeeTierError: If invalid fee tier
            InvalidAddressError: If invalid address format
            ValueError: If contract call fails
        """
        if fee not in FEE_TIERS:
            raise InvalidFeeTierError(f"Invalid fee tier: {fee}. Supported fees: {FEE_TIERS}")

        if not token_a or not token_b:
            raise InvalidAddressError("Both token_a and token_b addresses are required")

        if token_a == token_b:
            raise InvalidAddressError("token_a and token_b must be different")

        # Normalize and sort addresses
        try:
            token_a = normalize_address(token_a)
            token_b = normalize_address(token_b)
        except ValueError as e:
            raise InvalidAddressError(f"Invalid address format: {str(e)}") from e

        token0, token1 = (token_a, token_b) if token_a < token_b else (token_b, token_a)

        try:
            pool_address = self.factory_contract.functions.getPool(token0, token1, fee).call()
            if pool_address and pool_address != "0x0000000000000000000000000000000000000000":
                return pool_address
            return None
        except Exception as e:
            # Handle contract call errors
            raise ValueError(f"Failed to get pool address: {str(e)}") from e

    def get_pool_liquidity(self, pool_address: str) -> int:
        """
        Get current liquidity from pool.

        Args:
            pool_address: Pool contract address

        Returns:
            Current liquidity (uint128)

        Raises:
            InvalidAddressError: If pool address is invalid
            ValueError: If contract call fails
        """
        try:
            pool_address = normalize_address(pool_address)
            pool_contract = self.w3.eth.contract(
                address=pool_address, abi=UNISWAP_V3_POOL_ABI
            )
            liquidity = pool_contract.functions.liquidity().call()
            return liquidity
        except ValueError as e:
            raise InvalidAddressError(f"Invalid pool address: {str(e)}") from e
        except Exception as e:
            raise ValueError(f"Failed to get pool liquidity: {str(e)}") from e

    def get_pool_slot0(self, pool_address: str) -> Slot0Data:
        """
        Get slot0 data from pool.

        Slot0 contains:
        - sqrtPriceX96: Current sqrt price
        - tick: Current tick
        - observationIndex: Observation index
        - observationCardinality: Observation cardinality
        - observationCardinalityNext: Next observation cardinality
        - feeProtocol: Fee protocol
        - unlocked: Whether pool is unlocked

        Args:
            pool_address: Pool contract address

        Returns:
            Slot0Data dictionary

        Raises:
            InvalidAddressError: If pool address is invalid
            ValueError: If contract call fails
        """
        try:
            pool_address = normalize_address(pool_address)
            pool_contract = self.w3.eth.contract(
                address=pool_address, abi=UNISWAP_V3_POOL_ABI
            )
            slot0 = pool_contract.functions.slot0().call()

            return Slot0Data(
                sqrtPriceX96=slot0[0],
                tick=slot0[1],
                observationIndex=slot0[2],
                observationCardinality=slot0[3],
                observationCardinalityNext=slot0[4],
                feeProtocol=slot0[5],
                unlocked=slot0[6],
            )
        except ValueError as e:
            raise InvalidAddressError(f"Invalid pool address: {str(e)}") from e
        except Exception as e:
            raise ValueError(f"Failed to get pool slot0: {str(e)}") from e

    def get_pool_info(
        self,
        token_a: str,
        token_b: str,
        fee: int = 3000,
    ) -> Optional[PoolInfo]:
        """
        Get complete pool information including address, liquidity, and slot0.
        Tries all fee tiers (500, 3000, 10000) until a pool is found.

        Args:
            token_a: Token A address
            token_b: Token B address
            fee: Pool fee tier (used as starting point, then tries all fees)

        Returns:
            PoolInfo dictionary or None if pool doesn't exist for any fee tier

        Raises:
            ValueError: If pool info retrieval fails
        """
        self.logger.info(
            f"Searching for pool: token_a={token_a}, token_b={token_b}, "
            f"network={self.network_name}, starting_fee={fee}"
        )
        
        # Create ordered list of fees to try: start with provided fee, then try others
        fees_to_try = [fee] + [f for f in FEE_TIERS if f != fee]
        
        for current_fee in fees_to_try:
            self.logger.debug(f"Trying fee tier: {current_fee} bps")
            
            try:
                pool_address = self.get_pool_address(token_a, token_b, current_fee)
                if not pool_address:
                    self.logger.debug(f"No pool found for fee tier {current_fee} bps")
                    continue

                self.logger.info(
                    f"Pool address found for fee {current_fee} bps: {pool_address}"
                )

                try:
                    liquidity = self.get_pool_liquidity(pool_address)
                    slot0 = self.get_pool_slot0(pool_address)

                    # Normalize addresses for token0/token1
                    token_a_norm = normalize_address(token_a).lower()
                    token_b_norm = normalize_address(token_b).lower()

                    self.logger.info(
                        f"Successfully retrieved pool info: fee={current_fee} bps, "
                        f"liquidity={liquidity}, tick={slot0['tick']}, "
                        f"pool_address={pool_address}"
                    )

                    return PoolInfo(
                        pool_address=pool_address,
                        token0=min(token_a_norm, token_b_norm),
                        token1=max(token_a_norm, token_b_norm),
                        fee=current_fee,
                        liquidity=liquidity,
                        slot0=slot0,
                    )
                except Exception as e:
                    self.logger.error(
                        f"Error retrieving pool info for fee {current_fee} bps, "
                        f"pool_address={pool_address}: {str(e)}",
                        exc_info=True
                    )
                    # If this fee tier fails, try the next one
                    continue
            except Exception as e:
                self.logger.warning(
                    f"Error getting pool address for fee {current_fee} bps: {str(e)}"
                )
                continue
        
        # No pool found for any fee tier
        self.logger.warning(
            f"No pool found for any fee tier. Tried fees: {fees_to_try}. "
            f"token_a={token_a}, token_b={token_b}, network={self.network_name}"
        )
        return None

    def get_all_fee_tier_pools(
        self,
        token_a: str,
        token_b: str,
    ) -> dict[int, Optional[PoolInfo]]:
        """
        Get pool information for all fee tiers.

        Args:
            token_a: Token A address
            token_b: Token B address

        Returns:
            Dictionary mapping fee tier to pool info (or None if pool doesn't exist)
        """
        results: dict[int, Optional[PoolInfo]] = {}
        for fee in FEE_TIERS:
            try:
                pool_info = self.get_pool_info(token_a, token_b, fee)
                results[fee] = pool_info
            except Exception:
                results[fee] = None
        return results

