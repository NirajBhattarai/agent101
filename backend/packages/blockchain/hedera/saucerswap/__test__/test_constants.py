"""Tests for SaucerSwap constants."""

from packages.blockchain.hedera.saucerswap.constants import (
    NETWORKS,
    SAUCERSWAP_FACTORY_V3_MAINNET,
    SAUCERSWAP_FACTORY_V3_TESTNET,
)


def test_factory_addresses_defined():
    """Test that factory addresses are defined."""
    assert SAUCERSWAP_FACTORY_V3_MAINNET is not None
    assert SAUCERSWAP_FACTORY_V3_TESTNET is not None
    assert isinstance(SAUCERSWAP_FACTORY_V3_MAINNET, str)
    assert isinstance(SAUCERSWAP_FACTORY_V3_TESTNET, str)


def test_networks_structure():
    """Test that NETWORKS has correct structure."""
    assert isinstance(NETWORKS, dict)
    assert "mainnet" in NETWORKS
    assert "testnet" in NETWORKS

    for _network_name, network_config in NETWORKS.items():
        assert "factory" in network_config
        assert "name" in network_config
        assert isinstance(network_config["factory"], str)
        assert isinstance(network_config["name"], str)


def test_networks_factory_addresses():
    """Test that network factory addresses match constants."""
    assert NETWORKS["mainnet"]["factory"] == SAUCERSWAP_FACTORY_V3_MAINNET
    assert NETWORKS["testnet"]["factory"] == SAUCERSWAP_FACTORY_V3_TESTNET


def test_network_names():
    """Test network names are correct."""
    assert NETWORKS["mainnet"]["name"] == "Hedera Mainnet"
    assert NETWORKS["testnet"]["name"] == "Hedera Testnet"


def test_factory_addresses_format():
    """Test that factory addresses are in EVM format."""
    # Even if placeholder, should be valid hex format
    assert SAUCERSWAP_FACTORY_V3_MAINNET.startswith("0x")
    assert SAUCERSWAP_FACTORY_V3_TESTNET.startswith("0x")
    assert len(SAUCERSWAP_FACTORY_V3_MAINNET) == 42  # 0x + 40 hex chars
    assert len(SAUCERSWAP_FACTORY_V3_TESTNET) == 42
