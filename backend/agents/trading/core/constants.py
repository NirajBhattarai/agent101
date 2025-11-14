"""
Constants for Trading Agent.
Contains configuration values, default values, and response templates.
"""

# Supported assets
SUPPORTED_ASSETS = ["bitcoin", "ethereum", "btc", "eth"]
ASSET_MAPPING = {
    "bitcoin": "bitcoin",
    "btc": "bitcoin",
    "ethereum": "ethereum",
    "eth": "ethereum",
}

# Default values
DEFAULT_ASSET = "bitcoin"
DEFAULT_DAYS = 7
DEFAULT_MODEL = "gemini-2.5-flash"
DEFAULT_USER_ID = "trading_agent"
DEFAULT_SESSION_ID = "default_session"

# Agent configuration
AGENT_NAME = "trading_agent"
AGENT_DESCRIPTION = (
    "An intelligent trading agent that provides buy/sell recommendations based on "
    "technical analysis, sentiment analysis, and ML predictions for BTC and ETH"
)

# Response type
RESPONSE_TYPE = "trading"

# Error messages
ERROR_VALIDATION_FAILED = "Validation failed"
ERROR_EMPTY_RESPONSE = "Empty response from agent"
ERROR_INVALID_JSON = "Invalid JSON response"
ERROR_EXECUTION_ERROR = "Execution error"
ERROR_CANCEL_NOT_SUPPORTED = "cancel not supported"
ERROR_UNSUPPORTED_ASSET = "Unsupported asset. Only BTC and ETH are supported."

# API endpoints
COINGECKO_API_URL = "https://api.coingecko.com/api/v3"
COINGECKO_PRO_API_URL = "https://pro-api.coingecko.com/api/v3"
SENTIMENT_AGENT_URL = "http://localhost:10000"

# Technical analysis parameters
RSI_PERIOD = 14
MACD_FAST = 12
MACD_SLOW = 26
MACD_SIGNAL = 9
MA_SHORT = 20
MA_MEDIUM = 50
MA_LONG = 200
