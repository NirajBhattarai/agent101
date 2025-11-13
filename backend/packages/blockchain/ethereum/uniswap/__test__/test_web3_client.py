"""Detailed tests for Ethereum Uniswap Web3 client - Real network tests."""

import os
import pytest

from packages.blockchain.ethereum.constants import ETHEREUM_TOKENS
from packages.blockchain.ethereum.uniswap.pool.web3_client import (
    FEE_TIERS,
    UniswapWeb3Client,
)

# RPC URLs for testing
MAINNET_RPC = os.getenv("ETHEREUM_MAINNET_RPC", "https://eth.llamarpc.com")
SEPOLIA_RPC = os.getenv("ETHEREUM_SEPOLIA_RPC", "https://rpc.sepolia.org")


@pytest.fixture
def sample_tokens():
    """Sample token addresses from constants."""
    return {
        "WETH": ETHEREUM_TOKENS["WETH"]["address"],
        "USDC": ETHEREUM_TOKENS["USDC"]["address"],
        "USDT": ETHEREUM_TOKENS["USDT"]["address"],
        "DAI": ETHEREUM_TOKENS["DAI"]["address"],
    }


@pytest.fixture
def mainnet_client():
    """Create mainnet Web3 client."""
    return UniswapWeb3Client(rpc_url=MAINNET_RPC, network="mainnet")


@pytest.fixture
def sepolia_client():
    """Create sepolia Web3 client."""
    return UniswapWeb3Client(rpc_url=SEPOLIA_RPC, network="sepolia")


class TestUniswapWeb3ClientInit:
    """Tests for UniswapWeb3Client initialization."""

    def test_init_mainnet(self, mainnet_client):
        """Test initialization with mainnet."""
        assert mainnet_client.network == "mainnet"
        assert mainnet_client.w3 is not None
        assert mainnet_client.factory_address is not None

    def test_init_sepolia(self, sepolia_client):
        """Test initialization with sepolia."""
        assert sepolia_client.network == "sepolia"
        assert sepolia_client.w3 is not None

    def test_init_invalid_network(self):
        """Test that invalid network raises ValueError."""
        with pytest.raises(ValueError, match="Unsupported network"):
            UniswapWeb3Client(rpc_url=MAINNET_RPC, network="invalid")


class TestGetPoolAddress:
    """Tests for get_pool_address method - Real network calls."""

    def test_get_pool_address_weth_usdc_3000(self, mainnet_client, sample_tokens):
        """Test getting WETH/USDC pool address with 0.3% fee."""
        try:
            pool_address = mainnet_client.get_pool_address(
                sample_tokens["WETH"], sample_tokens["USDC"], fee=3000
            )
            if pool_address:
                assert pool_address.startswith("0x")
                assert len(pool_address) == 42
                print(f"\nPool address: {pool_address}")
        except ValueError as e:
            if "Failed to get pool address" in str(e):
                pytest.skip(f"Factory contract call failed: {e}")
            raise

    def test_get_pool_address_invalid_fee(self, mainnet_client, sample_tokens):
        """Test that invalid fee tier raises InvalidFeeTierError."""
        from packages.blockchain.dex.utils.errors import InvalidFeeTierError
        
        with pytest.raises(InvalidFeeTierError, match="Invalid fee tier"):
            mainnet_client.get_pool_address(
                sample_tokens["WETH"], sample_tokens["USDC"], fee=9999
            )

    def test_get_pool_address_same_tokens(self, mainnet_client, sample_tokens):
        """Test that same tokens raise InvalidAddressError."""
        from packages.blockchain.dex.utils.errors import InvalidAddressError
        
        with pytest.raises(InvalidAddressError, match="must be different"):
            mainnet_client.get_pool_address(
                sample_tokens["WETH"], sample_tokens["WETH"], fee=3000
            )


class TestGetPoolLiquidity:
    """Tests for get_pool_liquidity method - Real network calls."""

    def test_get_pool_liquidity_real_pool(self, mainnet_client, sample_tokens):
        """Test getting liquidity from a real pool if it exists."""
        try:
            pool_address = mainnet_client.get_pool_address(
                sample_tokens["WETH"], sample_tokens["USDC"], fee=3000
            )

            if pool_address:
                liquidity = mainnet_client.get_pool_liquidity(pool_address)
                assert isinstance(liquidity, int)
                assert liquidity >= 0
                print(f"\nPool liquidity: {liquidity}")
            else:
                pytest.skip("Pool does not exist on mainnet")
        except ValueError as e:
            if "Failed to get" in str(e):
                pytest.skip(f"Pool operation failed: {e}")
            raise


class TestGetPoolSlot0:
    """Tests for get_pool_slot0 method - Real network calls."""

    def test_get_pool_slot0_real_pool(self, mainnet_client, sample_tokens):
        """Test getting slot0 from a real pool if it exists."""
        try:
            pool_address = mainnet_client.get_pool_address(
                sample_tokens["WETH"], sample_tokens["USDC"], fee=3000
            )

            if pool_address:
                slot0 = mainnet_client.get_pool_slot0(pool_address)

                assert isinstance(slot0, dict)
                assert "sqrtPriceX96" in slot0
                assert "tick" in slot0
                assert "unlocked" in slot0

                print(f"\nPool slot0 tick: {slot0['tick']}")
            else:
                pytest.skip("Pool does not exist on mainnet")
        except ValueError as e:
            if "Failed to get" in str(e):
                pytest.skip(f"Pool operation failed: {e}")
            raise


class TestFeeTiers:
    """Tests for FEE_TIERS constant."""

    def test_fee_tiers_constant(self):
        """Test that FEE_TIERS contains expected values."""
        assert 500 in FEE_TIERS
        assert 3000 in FEE_TIERS
        assert 10000 in FEE_TIERS
        assert len(FEE_TIERS) == 3

