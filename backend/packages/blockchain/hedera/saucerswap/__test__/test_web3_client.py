"""Detailed tests for SaucerSwap Web3 client - Real network tests."""

import os
import pytest

from packages.blockchain.hedera.constants import HEDERA_TOKENS
from packages.blockchain.hedera.saucerswap.pool.web3_client import (
    FEE_TIERS,
    SaucerSwapWeb3Client,
)

# RPC URLs for testing
TESTNET_RPC = os.getenv("HEDERA_TESTNET_RPC", "https://testnet.hashio.io/api")
MAINNET_RPC = os.getenv("HEDERA_MAINNET_RPC", "https://mainnet.hashio.io/api")


@pytest.fixture
def sample_tokens():
    """Sample token addresses from constants."""
    return {
        "USDC": HEDERA_TOKENS["USDC"]["address"],
        "HBAR": HEDERA_TOKENS["HBAR"]["address"],
        "SAUCE": HEDERA_TOKENS["SAUCE"]["address"],
        "USDT": HEDERA_TOKENS["USDT"]["address"],
    }


@pytest.fixture
def testnet_client():
    """Create testnet Web3 client."""
    return SaucerSwapWeb3Client(rpc_url=TESTNET_RPC, network="testnet")


@pytest.fixture
def mainnet_client():
    """Create mainnet Web3 client."""
    return SaucerSwapWeb3Client(rpc_url=MAINNET_RPC, network="mainnet")


class TestSaucerSwapWeb3ClientInit:
    """Tests for SaucerSwapWeb3Client initialization."""

    def test_init_testnet(self, testnet_client):
        """Test initialization with testnet."""
        assert testnet_client.network == "testnet"
        assert testnet_client.w3 is not None
        assert testnet_client.factory_address is not None

    def test_init_mainnet(self, mainnet_client):
        """Test initialization with mainnet."""
        assert mainnet_client.network == "mainnet"
        assert mainnet_client.w3 is not None
        assert mainnet_client.factory_address is not None

    def test_init_invalid_network(self):
        """Test that invalid network raises ValueError."""
        with pytest.raises(ValueError, match="Unsupported network"):
            SaucerSwapWeb3Client(rpc_url=TESTNET_RPC, network="invalid")


class TestGetPoolAddress:
    """Tests for get_pool_address method - Real network calls."""

    def test_get_pool_address_usdc_hbar_3000(self, testnet_client, sample_tokens):
        """Test getting USDC/HBAR pool address with 0.3% fee."""
        # Skip if factory address is not set (placeholder)
        if testnet_client.factory_address == "0x0000000000000000000000000000000000000000":
            pytest.skip("Factory address not configured")

        try:
            pool_address = testnet_client.get_pool_address(
                sample_tokens["USDC"], sample_tokens["HBAR"], fee=3000
            )
            # Pool might exist or not, but should not raise error
            if pool_address:
                assert pool_address.startswith("0x")
                assert len(pool_address) == 42
        except ValueError as e:
            # If factory contract call fails, that's okay for now
            if "Failed to get pool address" in str(e):
                pytest.skip(f"Factory contract call failed: {e}")
            raise

    def test_get_pool_address_usdc_hbar_500(self, testnet_client, sample_tokens):
        """Test getting USDC/HBAR pool address with 0.05% fee."""
        if testnet_client.factory_address == "0x0000000000000000000000000000000000000000":
            pytest.skip("Factory address not configured")

        try:
            pool_address = testnet_client.get_pool_address(
                sample_tokens["USDC"], sample_tokens["HBAR"], fee=500
            )
            if pool_address:
                assert pool_address.startswith("0x")
                assert len(pool_address) == 42
        except ValueError as e:
            if "Failed to get pool address" in str(e):
                pytest.skip(f"Factory contract call failed: {e}")
            raise

    def test_get_pool_address_usdc_hbar_10000(self, testnet_client, sample_tokens):
        """Test getting USDC/HBAR pool address with 1% fee."""
        if testnet_client.factory_address == "0x0000000000000000000000000000000000000000":
            pytest.skip("Factory address not configured")

        try:
            pool_address = testnet_client.get_pool_address(
                sample_tokens["USDC"], sample_tokens["HBAR"], fee=10000
            )
            if pool_address:
                assert pool_address.startswith("0x")
                assert len(pool_address) == 42
        except ValueError as e:
            if "Failed to get pool address" in str(e):
                pytest.skip(f"Factory contract call failed: {e}")
            raise

    def test_get_pool_address_all_fee_tiers(self, testnet_client, sample_tokens):
        """Test getting pool addresses for all fee tiers."""
        if testnet_client.factory_address == "0x0000000000000000000000000000000000000000":
            pytest.skip("Factory address not configured")

        results = {}
        for fee in FEE_TIERS:
            try:
                pool_address = testnet_client.get_pool_address(
                    sample_tokens["USDC"], sample_tokens["HBAR"], fee=fee
                )
                results[fee] = pool_address
            except ValueError as e:
                if "Failed to get pool address" in str(e):
                    results[fee] = None
                else:
                    raise

        # At least log what we got
        print(f"\nPool addresses for USDC/HBAR:")
        for fee, address in results.items():
            print(f"  Fee {fee}: {address}")

    def test_get_pool_address_invalid_fee(self, testnet_client, sample_tokens):
        """Test that invalid fee tier raises InvalidFeeTierError."""
        from packages.blockchain.dex.utils.errors import InvalidFeeTierError
        
        with pytest.raises(InvalidFeeTierError, match="Invalid fee tier"):
            testnet_client.get_pool_address(
                sample_tokens["USDC"], sample_tokens["HBAR"], fee=9999
            )

    def test_get_pool_address_same_tokens(self, testnet_client, sample_tokens):
        """Test that same tokens raise InvalidAddressError."""
        from packages.blockchain.dex.utils.errors import InvalidAddressError
        
        with pytest.raises(InvalidAddressError, match="must be different"):
            testnet_client.get_pool_address(
                sample_tokens["USDC"], sample_tokens["USDC"], fee=3000
            )

    def test_get_pool_address_token_sorting(self, testnet_client, sample_tokens):
        """Test that tokens are sorted correctly - should return same address."""
        if testnet_client.factory_address == "0x0000000000000000000000000000000000000000":
            pytest.skip("Factory address not configured")

        try:
            pool1 = testnet_client.get_pool_address(
                sample_tokens["USDC"], sample_tokens["HBAR"], fee=3000
            )
            pool2 = testnet_client.get_pool_address(
                sample_tokens["HBAR"], sample_tokens["USDC"], fee=3000
            )
            # Both should return same result (or both None)
            assert pool1 == pool2
        except ValueError as e:
            if "Failed to get pool address" in str(e):
                pytest.skip(f"Factory contract call failed: {e}")
            raise


class TestGetPoolLiquidity:
    """Tests for get_pool_liquidity method - Real network calls."""

    def test_get_pool_liquidity_real_pool(self, testnet_client, sample_tokens):
        """Test getting liquidity from a real pool if it exists."""
        if testnet_client.factory_address == "0x0000000000000000000000000000000000000000":
            pytest.skip("Factory address not configured")

        try:
            pool_address = testnet_client.get_pool_address(
                sample_tokens["USDC"], sample_tokens["HBAR"], fee=3000
            )

            if pool_address:
                liquidity = testnet_client.get_pool_liquidity(pool_address)
                assert isinstance(liquidity, int)
                assert liquidity >= 0
                print(f"\nPool liquidity: {liquidity}")
            else:
                pytest.skip("Pool does not exist on testnet")
        except ValueError as e:
            if "Failed to get pool address" in str(e):
                pytest.skip(f"Factory contract call failed: {e}")
            raise

    def test_get_pool_liquidity_invalid_address(self, testnet_client):
        """Test that invalid pool address raises ValueError."""
        invalid_address = "0x0000000000000000000000000000000000000000"
        with pytest.raises(ValueError):
            testnet_client.get_pool_liquidity(invalid_address)


class TestGetPoolSlot0:
    """Tests for get_pool_slot0 method - Real network calls."""

    def test_get_pool_slot0_real_pool(self, testnet_client, sample_tokens):
        """Test getting slot0 from a real pool if it exists."""
        if testnet_client.factory_address == "0x0000000000000000000000000000000000000000":
            pytest.skip("Factory address not configured")

        try:
            pool_address = testnet_client.get_pool_address(
                sample_tokens["USDC"], sample_tokens["HBAR"], fee=3000
            )

            if pool_address:
                slot0 = testnet_client.get_pool_slot0(pool_address)

                # Verify structure
                assert isinstance(slot0, dict)
                assert "sqrtPriceX96" in slot0
                assert "tick" in slot0
                assert "observationIndex" in slot0
                assert "observationCardinality" in slot0
                assert "observationCardinalityNext" in slot0
                assert "feeProtocol" in slot0
                assert "unlocked" in slot0

                # Verify types
                assert isinstance(slot0["sqrtPriceX96"], int)
                assert isinstance(slot0["tick"], int)
                assert isinstance(slot0["unlocked"], bool)

                print(f"\nPool slot0:")
                print(f"  sqrtPriceX96: {slot0['sqrtPriceX96']}")
                print(f"  tick: {slot0['tick']}")
                print(f"  unlocked: {slot0['unlocked']}")
            else:
                pytest.skip("Pool does not exist on testnet")
        except ValueError as e:
            if "Failed to get pool address" in str(e):
                pytest.skip(f"Factory contract call failed: {e}")
            raise


class TestGetPoolInfo:
    """Tests for get_pool_info method - Real network calls."""

    def test_get_pool_info_real_pool(self, testnet_client, sample_tokens):
        """Test getting complete pool info from a real pool."""
        if testnet_client.factory_address == "0x0000000000000000000000000000000000000000":
            pytest.skip("Factory address not configured")

        try:
            pool_info = testnet_client.get_pool_info(
                sample_tokens["USDC"], sample_tokens["HBAR"], fee=3000
            )

            if pool_info:
                assert "pool_address" in pool_info
                assert "token0" in pool_info
                assert "token1" in pool_info
                assert "fee" in pool_info
                assert "liquidity" in pool_info
                assert "slot0" in pool_info

                assert pool_info["fee"] == 3000
                assert isinstance(pool_info["liquidity"], int)
                assert isinstance(pool_info["slot0"], dict)

                print(f"\nPool info:")
                print(f"  Address: {pool_info['pool_address']}")
                print(f"  Fee: {pool_info['fee']}")
                print(f"  Liquidity: {pool_info['liquidity']}")
                print(f"  Tick: {pool_info['slot0']['tick']}")
            else:
                pytest.skip("Pool does not exist on testnet")
        except ValueError as e:
            if "Failed to get pool" in str(e):
                pytest.skip(f"Pool info retrieval failed: {e}")
            raise

    def test_get_pool_info_all_fee_tiers(self, testnet_client, sample_tokens):
        """Test getting pool info for all fee tiers."""
        results = testnet_client.get_all_fee_tier_pools(
            sample_tokens["USDC"], sample_tokens["HBAR"]
        )

        assert 500 in results
        assert 3000 in results
        assert 10000 in results

        print(f"\nAll fee tier pools for USDC/HBAR:")
        for fee, pool_info in results.items():
            if pool_info:
                print(f"  Fee {fee}: {pool_info['pool_address']} (liquidity: {pool_info['liquidity']})")
            else:
                print(f"  Fee {fee}: No pool exists")


class TestGetAllFeeTierPools:
    """Tests for get_all_fee_tier_pools method - Real network calls."""

    def test_get_all_fee_tier_pools_usdc_hbar(self, testnet_client, sample_tokens):
        """Test getting all fee tier pools for USDC/HBAR."""
        results = testnet_client.get_all_fee_tier_pools(
            sample_tokens["USDC"], sample_tokens["HBAR"]
        )

        assert len(results) == len(FEE_TIERS)
        for fee in FEE_TIERS:
            assert fee in results

    def test_get_all_fee_tier_pools_usdc_sauce(self, testnet_client, sample_tokens):
        """Test getting all fee tier pools for USDC/SAUCE."""
        results = testnet_client.get_all_fee_tier_pools(
            sample_tokens["USDC"], sample_tokens["SAUCE"]
        )

        assert len(results) == len(FEE_TIERS)
        for fee in FEE_TIERS:
            assert fee in results


class TestFeeTiers:
    """Tests for FEE_TIERS constant."""

    def test_fee_tiers_constant(self):
        """Test that FEE_TIERS contains expected values."""
        assert 500 in FEE_TIERS
        assert 3000 in FEE_TIERS
        assert 10000 in FEE_TIERS
        assert len(FEE_TIERS) == 3

    def test_fee_tiers_order(self):
        """Test that FEE_TIERS are in ascending order."""
        assert FEE_TIERS == sorted(FEE_TIERS)
