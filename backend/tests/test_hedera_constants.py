"""Tests for Hedera token constants."""

from packages.blockchain.hedera.constants import (
    HEDERA_TOKEN_EVM_ADDRESSES,
    HEDERA_TOKEN_IDS,
    HEDERA_TOKENS,
)


def test_hedera_tokens_structure():
    """Test that HEDERA_TOKENS has the correct structure."""
    assert isinstance(HEDERA_TOKENS, dict)
    assert len(HEDERA_TOKENS) > 0

    # Test that each token has required fields
    for _symbol, token in HEDERA_TOKENS.items():
        assert "address" in token
        assert "decimals" in token
        assert "tokenid" in token
        assert isinstance(token["address"], str)
        assert isinstance(token["decimals"], int)
        assert isinstance(token["tokenid"], str)


def test_hbar_token():
    """Test HBAR token configuration."""
    assert "HBAR" in HEDERA_TOKENS
    hbar = HEDERA_TOKENS["HBAR"]
    assert hbar["tokenid"] == "0.0.0"
    assert hbar["decimals"] == 8


def test_hedera_token_ids_mapping():
    """Test HEDERA_TOKEN_IDS mapping."""
    assert isinstance(HEDERA_TOKEN_IDS, dict)
    assert len(HEDERA_TOKEN_IDS) == len(HEDERA_TOKENS)

    # Verify mapping is correct
    for symbol, token_id in HEDERA_TOKEN_IDS.items():
        assert symbol in HEDERA_TOKENS
        assert HEDERA_TOKENS[symbol]["tokenid"] == token_id


def test_hedera_token_evm_addresses_mapping():
    """Test HEDERA_TOKEN_EVM_ADDRESSES mapping."""
    assert isinstance(HEDERA_TOKEN_EVM_ADDRESSES, dict)
    assert len(HEDERA_TOKEN_EVM_ADDRESSES) == len(HEDERA_TOKENS)

    # Verify mapping is correct
    for symbol, address in HEDERA_TOKEN_EVM_ADDRESSES.items():
        assert symbol in HEDERA_TOKENS
        assert HEDERA_TOKENS[symbol]["address"] == address


def test_token_addresses_format():
    """Test that token addresses are in correct format."""
    for symbol, token in HEDERA_TOKENS.items():
        # EVM addresses should start with 0x
        if symbol != "HBAR":  # HBAR has special zero address
            assert token["address"].startswith("0x")
            assert len(token["address"]) == 42  # 0x + 40 hex chars

        # Token IDs should be in Hedera format (0.0.xxxxx)
        assert "." in token["tokenid"]
        parts = token["tokenid"].split(".")
        assert len(parts) == 3
