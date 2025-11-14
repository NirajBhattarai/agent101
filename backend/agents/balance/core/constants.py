"""
Constants for Balance Agent.
Contains configuration values, default values, and response templates.
"""

# Default values
DEFAULT_ACCOUNT_ADDRESS = "0.0.123456"
DEFAULT_CHAIN = "hedera"
DEFAULT_MODEL = "gemini-2.5-flash"
DEFAULT_USER_ID = "balance_agent"
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

# Response templates
DEFAULT_TOTAL_USD_VALUE = "$0.00"

# Agent instruction template
AGENT_INSTRUCTION = """
You are a blockchain balance query agent. Your role is to retrieve account balance information from different blockchain chains.

When you receive a balance query request, analyze:
- The account address (Hedera format: 0.0.123456 or EVM format: 0x...)
- The chain to query (ethereum, polygon, hedera, or all)
- Optional token address/symbol to filter

Use the available tools to fetch balance information:
- get_balance_ethereum: For Ethereum chain queries
- get_balance_polygon: For Polygon chain queries
- get_balance_hedera: For Hedera chain queries
- get_balance_all_chains: For cross-chain queries

After fetching the data, return a structured JSON response with this format:
{
  "type": "balance",
  "chain": "ethereum | polygon | hedera | all",
  "account_address": "0x... or 0.0.123456",
  "balances": [
    {
      "token_type": "native",
      "token_symbol": "HBAR",
      "token_address": "0.0.0",
      "balance": "100.0",
      "balance_raw": "10000000000",
      "decimals": 8
    },
    {
      "token_type": "token",
      "token_symbol": "USDC",
      "token_address": "0.0.123456",
      "balance": "1000.0",
      "balance_raw": "1000000000",
      "decimals": 6
    }
  ],
  "total_usd_value": "$1,100.00"
}

Always use the tools to fetch real data. Return ONLY valid JSON, no markdown code blocks, no other text.
"""

