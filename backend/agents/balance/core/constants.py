"""
Constants for Balance Agent.
Contains configuration values, default values, and response templates.
"""

# Default values
DEFAULT_SESSION_ID = "default_session"

# Agent configuration
AGENT_NAME = "balance_agent"
AGENT_DESCRIPTION = (
    "An agent that retrieves account balance information from multiple "
    "blockchain chains including Ethereum, Polygon, and Hedera"
)

# Response type
RESPONSE_TYPE = "balance"

# Chain names
CHAIN_ETHEREUM = "ethereum"
CHAIN_POLYGON = "polygon"
CHAIN_HEDERA = "hedera"
CHAIN_ALL = "all"
CHAIN_UNKNOWN = "unknown"

# Error messages
ERROR_VALIDATION_FAILED = "Validation failed"
ERROR_EMPTY_RESPONSE = "Empty response from agent"
ERROR_INVALID_JSON = "Invalid JSON response"
ERROR_EXECUTION_ERROR = "Execution error"
ERROR_CANCEL_NOT_SUPPORTED = "cancel not supported"
ERROR_ACCOUNT_ADDRESS_REQUIRED = "Account address is required for balance queries"
ERROR_INVALID_ACCOUNT_ADDRESS = "Invalid account address format"

# Response templates
DEFAULT_TOTAL_USD_VALUE = "$0.00"
