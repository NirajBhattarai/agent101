"""
Hedera utility functions for token address conversions using Hiero SDK.
"""

from typing import Optional

try:
    from hiero_sdk_python import TokenId
except ImportError:
    TokenId = None


def token_id_to_solidity_address(token_id: str) -> str | None:
    """
    Convert Hedera TokenId (0.0.123456) to Solidity address format (0x...) using Hiero SDK.

    Args:
        token_id: Token ID in Hedera format (e.g., "0.0.123456")

    Returns:
        Solidity address in format 0x0000000000000000000000000000000000001e240
        Returns None if token_id format is invalid or SDK is not available
    """
    if TokenId is None:
        return None

    try:
        token_id_obj = TokenId.from_string(token_id)
        solidity_address = token_id_obj.to_solidity_address()
        return solidity_address
    except (ValueError, AttributeError, Exception):
        return None


def solidity_address_to_token_id(solidity_address: str) -> str | None:
    """
    Convert Solidity address (0x...) to Hedera TokenId format (0.0.123456) using Hiero SDK.

    Args:
        solidity_address: Solidity address in format 0x0000000000000000000000000000000000001e240

    Returns:
        Token ID in Hedera format (e.g., "0.0.123456")
        Returns None if solidity_address format is invalid or SDK is not available
    """
    if TokenId is None:
        return None

    try:
        token_id_obj = TokenId.from_solidity_address(solidity_address)
        # Convert TokenId object to string format (0.0.123456)
        # TokenId objects typically have shard, realm, num attributes
        if (
            hasattr(token_id_obj, "shard")
            and hasattr(token_id_obj, "realm")
            and hasattr(token_id_obj, "num")
        ):
            token_id = f"{token_id_obj.shard}.{token_id_obj.realm}.{token_id_obj.num}"
        else:
            token_id = str(token_id_obj)
        return token_id
    except (ValueError, AttributeError, Exception):
        return None


def resolve_token_identifier(token_identifier: str) -> str | None:
    """
    Resolve token identifier to Hedera TokenId format.
    Handles: token symbols, TokenId format (0.0.123456), and Solidity addresses (0x...).

    Args:
        token_identifier: Token symbol, TokenId, or Solidity address

    Returns:
        TokenId in Hedera format (0.0.123456), or None if cannot be resolved
    """
    from packages.blockchain.hedera.constants import HEDERA_TOKENS

    # Check if it's a token symbol
    if token_identifier.upper() in HEDERA_TOKENS:
        return HEDERA_TOKENS[token_identifier.upper()]["tokenid"]

    # Check if it's already in TokenId format (0.0.123456)
    if "." in token_identifier and token_identifier.count(".") == 2:
        parts = token_identifier.split(".")
        try:
            # Validate format
            int(parts[0])
            int(parts[1])
            int(parts[2])
            return token_identifier
        except (ValueError, IndexError):
            pass

    # Check if it's a Solidity address (0x...)
    if token_identifier.startswith("0x") and len(token_identifier) == 42:
        token_id = solidity_address_to_token_id(token_identifier)
        if token_id:
            return token_id

    # Check if it matches any known EVM address in constants
    for _symbol, token_data in HEDERA_TOKENS.items():
        if token_data.get("address", "").lower() == token_identifier.lower():
            return token_data["tokenid"]

    return None
