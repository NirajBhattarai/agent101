"""
Constants for Swap Agent.

Configuration values, defaults, and constants.
"""

# Default values
DEFAULT_CHAIN = "hedera"
DEFAULT_TOKEN_IN = "HBAR"
DEFAULT_TOKEN_OUT = "USDC"
DEFAULT_AMOUNT = "0.01"
DEFAULT_SLIPPAGE = 0.5
DEFAULT_CONFIRMATION_THRESHOLD = 100.0
DEFAULT_SESSION_ID = "default_session"

# Agent configuration
AGENT_NAME = "swap_agent"
AGENT_DESCRIPTION = (
    "An agent that handles token swaps on blockchain chains including Ethereum, Polygon, and Hedera"
)
RESPONSE_TYPE = "swap"

# Chain names
CHAIN_ETHEREUM = "ethereum"
CHAIN_POLYGON = "polygon"
CHAIN_HEDERA = "hedera"
CHAIN_UNKNOWN = "unknown"

# Error messages
ERROR_VALIDATION_FAILED = "Validation failed"
ERROR_EXECUTION_ERROR = "Execution error"
ERROR_EMPTY_RESPONSE = "Empty response from agent"
ERROR_INVALID_JSON = "Invalid JSON response"
ERROR_CANCEL_NOT_SUPPORTED = "cancel not supported"
ERROR_CHAIN_NOT_SPECIFIED = "Chain not specified in query"
ERROR_TOKEN_IN_NOT_FOUND = "Could not determine which token to swap from"
ERROR_TOKEN_OUT_NOT_FOUND = "Could not determine which token to swap to"
