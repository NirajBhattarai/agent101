"""Tests for SaucerSwap factory functions - Real network tests."""

import os
import pytest

from packages.blockchain.hedera.constants import HEDERA_TOKENS
from packages.blockchain.hedera.saucerswap.constants import NETWORKS
from packages.blockchain.hedera.saucerswap.pool.factory import (
    get_factory_address,
    get_v3_pair_address,
    get_v3_pair_address_with_factory,
    validate_pair_address,
)

# RPC URLs for testing
TESTNET_RPC = os.getenv("HEDERA_TESTNET_RPC", "https://testnet.hashio.io/api")
MAINNET_RPC = os.getenv("HEDERA_MAINNET_RPC", "https://mainnet.hashio.io/api")


def test_get_factory_address_mainnet():
    """Test getting factory address for mainnet."""
    address = get_factory_address("mainnet")
    assert isinstance(address, str)
    assert address == NETWORKS["mainnet"]["factory"]


def test_get_factory_address_testnet():
    """Test getting factory address for testnet."""
    address = get_factory_address("testnet")
    assert isinstance(address, str)
    assert address == NETWORKS["testnet"]["factory"]


def test_get_factory_address_case_insensitive():
    """Test that network name is case insensitive."""
    mainnet1 = get_factory_address("mainnet")
    mainnet2 = get_factory_address("MAINNET")
    mainnet3 = get_factory_address("Mainnet")

    assert mainnet1 == mainnet2 == mainnet3

    testnet1 = get_factory_address("testnet")
    testnet2 = get_factory_address("TESTNET")
    testnet3 = get_factory_address("Testnet")

    assert testnet1 == testnet2 == testnet3


def test_get_factory_address_invalid_network():
    """Test that invalid network raises ValueError."""
    with pytest.raises(ValueError, match="Unsupported network"):
        get_factory_address("invalid_network")


def test_get_v3_pair_address_real_network():
    """Test getting pair address from real network."""
    from packages.blockchain.hedera.saucerswap.constants import SAUCERSWAP_FACTORY_V3_TESTNET

    if SAUCERSWAP_FACTORY_V3_TESTNET == "0x0000000000000000000000000000000000000000":
        pytest.skip("Factory address not configured")

    usdc = HEDERA_TOKENS["USDC"]["address"]
    hbar = HEDERA_TOKENS["HBAR"]["address"]

    try:
        pool_address = get_v3_pair_address(
            usdc, hbar, fee=3000, network="testnet", rpc_url=TESTNET_RPC
        )

        # Pool might exist or not, but should not raise error
        if pool_address:
            assert pool_address.startswith("0x")
            assert len(pool_address) == 42
            print(f"\nPool address for USDC/HBAR (0.3%): {pool_address}")
        else:
            print("\nPool does not exist for USDC/HBAR (0.3%)")
    except ValueError as e:
        if "Failed to get pool address" in str(e):
            pytest.skip(f"Factory contract call failed: {e}")
        raise


def test_get_v3_pair_address_all_fee_tiers():
    """Test getting pair addresses for all fee tiers."""
    from packages.blockchain.hedera.saucerswap.constants import SAUCERSWAP_FACTORY_V3_TESTNET

    if SAUCERSWAP_FACTORY_V3_TESTNET == "0x0000000000000000000000000000000000000000":
        pytest.skip("Factory address not configured")

    usdc = HEDERA_TOKENS["USDC"]["address"]
    hbar = HEDERA_TOKENS["HBAR"]["address"]

    results = {}
    for fee in [500, 3000, 10000]:
        try:
            pool_address = get_v3_pair_address(
                usdc, hbar, fee=fee, network="testnet", rpc_url=TESTNET_RPC
            )
            results[fee] = pool_address
        except ValueError as e:
            if "Failed to get pool address" in str(e):
                results[fee] = None
            else:
                raise

    print(f"\nPool addresses for USDC/HBAR:")
    for fee, address in results.items():
        print(f"  Fee {fee}: {address}")


def test_get_v3_pair_address_missing_rpc_url():
    """Test that missing RPC URL raises RuntimeError."""
    usdc = HEDERA_TOKENS["USDC"]["address"]
    hbar = HEDERA_TOKENS["HBAR"]["address"]

    with pytest.raises(RuntimeError, match="RPC URL is required"):
        get_v3_pair_address(usdc, hbar, fee=3000, network="mainnet", rpc_url=None)


def test_get_v3_pair_address_with_factory_invalid_factory():
    """Test that invalid factory address raises ValueError."""
    usdc = HEDERA_TOKENS["USDC"]["address"]
    hbar = HEDERA_TOKENS["HBAR"]["address"]

    with pytest.raises(ValueError, match="Invalid factory address"):
        get_v3_pair_address_with_factory(
            usdc, hbar, factory_address="0x0000000000000000000000000000000000000000"
        )


def test_validate_pair_address():
    """Test validate_pair_address function."""
    # Currently returns False as it's not implemented
    result = validate_pair_address("0x123", "0x456", "0x789", fee=3000, network="mainnet")
    assert result is False
