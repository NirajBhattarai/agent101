"""
Constants for Sentiment Agent.
Contains configuration values, default values, and response templates.
"""

# Default values
DEFAULT_ASSET = "bitcoin"
DEFAULT_DAYS = 7
DEFAULT_THRESHOLD = 50.0
DEFAULT_TOP_N = 5
DEFAULT_MODEL = "gemini-2.5-flash"
DEFAULT_USER_ID = "sentiment_agent"
DEFAULT_SESSION_ID = "default_session"

# Agent configuration
AGENT_NAME = "sentiment_agent"
AGENT_DESCRIPTION = (
    "An agent that provides cryptocurrency sentiment analysis using Santiment API, "
    "including sentiment balance, social volume, social dominance, trending words, and social shifts"
)

# Response type
RESPONSE_TYPE = "sentiment"

# Error messages
ERROR_VALIDATION_FAILED = "Validation failed"
ERROR_EMPTY_RESPONSE = "Empty response from agent"
ERROR_INVALID_JSON = "Invalid JSON response"
ERROR_EXECUTION_ERROR = "Execution error"
ERROR_CANCEL_NOT_SUPPORTED = "cancel not supported"
ERROR_API_KEY_MISSING = "SANTIMENT_API_KEY not found in environment variables"

# Santiment API
SANTIMENT_API_URL = "https://api.santiment.net/graphql"
