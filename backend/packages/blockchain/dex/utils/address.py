"""Address normalization and validation utilities."""

from web3 import Web3


def normalize_address(address: str) -> str:
    """
    Normalize an Ethereum address to checksum format.

    Args:
        address: Address in any format (lowercase, uppercase, mixed case)

    Returns:
        Checksummed address

    Raises:
        ValueError: If address format is invalid
    """
    if not isinstance(address, str):
        raise ValueError(f"Address must be a string, got {type(address)}")

    if not address.startswith("0x"):
        raise ValueError(f"Address must start with '0x', got: {address}")

    # Convert to lowercase first, then to checksum
    # Remove any whitespace and ensure proper format
    address = address.strip()
    
    # Normalize to lowercase (handle any case)
    if len(address) >= 2 and address.startswith("0x"):
        address = "0x" + address[2:].lower()
    else:
        raise ValueError(f"Address must start with '0x' and be at least 42 chars, got: {address}")
    
    # Ensure it's exactly 42 characters
    if len(address) != 42:
        raise ValueError(f"Invalid address length: {len(address)} (expected 42)")

    try:
        return Web3.to_checksum_address(address)
    except Exception as e:
        raise ValueError(f"Invalid address format: {str(e)}") from e


def validate_address(address: str) -> bool:
    """
    Validate if an address is in correct format.

    Args:
        address: Address to validate

    Returns:
        True if address is valid, False otherwise
    """
    try:
        normalize_address(address)
        return True
    except (ValueError, Exception):
        return False

