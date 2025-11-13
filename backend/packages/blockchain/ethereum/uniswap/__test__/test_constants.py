"""Tests for Ethereum Uniswap constants."""

import pytest

from packages.blockchain.ethereum.uniswap.constants import (
    NETWORKS,
    UNISWAP_V3_FACTORY_MAINNET,
    UNISWAP_V3_FACTORY_SEPOLIA,
)


def test_factory_addresses_defined():
    """Test that factory addresses are defined."""
    assert UNISWAP_V3_FACTORY_MAINNET is not None
    assert UNISWAP_V3_FACTORY_SEPOLIA is not None
    assert isinstance(UNISWAP_V3_FACTORY_MAINNET, str)
    assert isinstance(UNISWAP_V3_FACTORY_SEPOLIA, str)


def test_networks_structure():
    """Test that NETWORKS has correct structure."""
    assert isinstance(NETWORKS, dict)
    assert "mainnet" in NETWORKS
    assert "sepolia" in NETWORKS

    for network_name, network_config in NETWORKS.items():
        assert "factory" in network_config
        assert "name" in network_config
        assert "chain_id" in network_config
        assert isinstance(network_config["factory"], str)
        assert isinstance(network_config["name"], str)
        assert isinstance(network_config["chain_id"], int)


def test_networks_factory_addresses():
    """Test that network factory addresses match constants."""
    assert NETWORKS["mainnet"]["factory"] == UNISWAP_V3_FACTORY_MAINNET
    assert NETWORKS["sepolia"]["factory"] == UNISWAP_V3_FACTORY_SEPOLIA


def test_network_names():
    """Test network names are correct."""
    assert NETWORKS["mainnet"]["name"] == "Ethereum Mainnet"
    assert NETWORKS["sepolia"]["name"] == "Ethereum Sepolia Testnet"


def test_chain_ids():
    """Test chain IDs are correct."""
    assert NETWORKS["mainnet"]["chain_id"] == 1
    assert NETWORKS["sepolia"]["chain_id"] == 11155111


def test_factory_addresses_format():
    """Test that factory addresses are in EVM format."""
    assert UNISWAP_V3_FACTORY_MAINNET.startswith("0x")
    assert UNISWAP_V3_FACTORY_SEPOLIA.startswith("0x")
    assert len(UNISWAP_V3_FACTORY_MAINNET) == 42  # 0x + 40 hex chars
    assert len(UNISWAP_V3_FACTORY_SEPOLIA) == 42

