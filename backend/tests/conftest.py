"""Pytest configuration and shared fixtures."""

import pytest


@pytest.fixture
def sample_token_addresses():
    """Sample token addresses for testing."""
    return {
        "HBAR": "0x0000000000000000000000000000000000000000",
        "USDC": "0x000000000000000000000000000000000006f89a",
        "USDT": "0x0000000000000000000000000000000000101b07",
        "SAUCE": "0x00000000000000000000000000000000000b2ad5",
    }


@pytest.fixture
def sample_hedera_token_ids():
    """Sample Hedera token IDs for testing."""
    return {
        "HBAR": "0.0.0",
        "USDC": "0.0.456858",
        "USDT": "0.0.1055472",
        "SAUCE": "0.0.731861",
    }

