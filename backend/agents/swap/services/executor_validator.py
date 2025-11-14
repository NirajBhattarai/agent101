"""
Executor-level response validation for Swap Agent.

Validates responses at the executor level before sending to frontend.
"""

import json

from ..core.constants import (
    CHAIN_UNKNOWN,
    ERROR_EMPTY_RESPONSE,
    ERROR_INVALID_JSON,
    RESPONSE_TYPE,
)


def validate_response_content(content: str) -> str:
    """
    Validate response content at executor level.

    Args:
        content: Response content string

    Returns:
        Validated content string

    Raises:
        ValueError: If content is invalid
    """
    if not content or not content.strip():
        raise ValueError(ERROR_EMPTY_RESPONSE)

    try:
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            raise ValueError("Response must be a JSON object")
        if parsed.get("type") != RESPONSE_TYPE:
            print(
                f"⚠️ Warning: Response type mismatch. Expected {RESPONSE_TYPE}, got {parsed.get('type')}"
            )
    except json.JSONDecodeError as e:
        raise ValueError(f"{ERROR_INVALID_JSON}: {str(e)}") from e

    return content


def log_sending_response(content: str) -> None:
    """
    Log response before sending.

    Args:
        content: Response content string
    """
    try:
        parsed = json.loads(content)
        chain = parsed.get("chain", "unknown")
        token_in = parsed.get("token_in_symbol", "unknown")
        token_out = parsed.get("token_out_symbol", "unknown")
        print(f"📤 Sending swap response: {token_in} -> {token_out} on {chain}")
    except Exception:
        print("📤 Sending swap response")


def build_execution_error_response(error: Exception) -> str:
    """
    Build error response for execution errors.

    Args:
        error: Exception that occurred

    Returns:
        JSON string of error response
    """
    return json.dumps(
        {
            "type": RESPONSE_TYPE,
            "chain": CHAIN_UNKNOWN,
            "token_in_symbol": "unknown",
            "token_out_symbol": "unknown",
            "amount_in": "0",
            "error": f"Execution error: {str(error)}",
        },
        indent=2,
    )
