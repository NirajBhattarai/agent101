"""Common error classes for DEX operations."""


class DEXError(Exception):
    """Base exception for DEX-related errors."""

    pass


class InvalidAddressError(DEXError):
    """Raised when an invalid address is provided."""

    pass


class InvalidFeeTierError(DEXError):
    """Raised when an invalid fee tier is provided."""

    pass


class PoolNotFoundError(DEXError):
    """Raised when a pool is not found."""

    pass

