"""
Response validation utilities for Swap Agent.

Handles validation and serialization of swap responses.
"""

import json

from .constants import (
    ERROR_INVALID_JSON,
    ERROR_VALIDATION_FAILED,
)
from .models.swap import StructuredSwap


def validate_and_serialize_response(response_data: dict) -> str:
    """
    Validate and serialize response data.

    Args:
        response_data: Response data dictionary

    Returns:
        JSON string of validated response

    Raises:
        ValueError: If validation fails
    """
    try:
        validated = StructuredSwap(**response_data)
        return json.dumps(validated.model_dump(exclude_none=True), indent=2)
    except Exception as e:
        raise ValueError(f"{ERROR_VALIDATION_FAILED}: {str(e)}") from e


def validate_json(json_string: str) -> None:
    """
    Validate JSON string.

    Args:
        json_string: JSON string to validate

    Raises:
        ValueError: If JSON is invalid
    """
    try:
        json.loads(json_string)
    except json.JSONDecodeError as e:
        raise ValueError(f"{ERROR_INVALID_JSON}: {str(e)}") from e


def build_error_response(
    error_type: str, chain: str = None, token_in: str = None, token_out: str = None
) -> str:
    """
    Build error response.

    Args:
        error_type: Error type
        chain: Chain name
        token_in: Token in symbol
        token_out: Token out symbol

    Returns:
        JSON string of error response
    """
    error_messages = {
        "chain_not_specified": "Chain not specified in query",
        "token_in_not_found": "Could not determine which token to swap from",
        "token_out_not_found": "Could not determine which token to swap to",
        "execution_error": "Execution error occurred",
    }
    error_msg = error_messages.get(error_type, "Unknown error")
    return json.dumps(
        {
            "type": "swap",
            "chain": chain or "unknown",
            "token_in_symbol": token_in or "unknown",
            "token_out_symbol": token_out or "unknown",
            "error": error_msg,
        },
        indent=2,
    )


def log_response_info(chain: str, token_in: str, token_out: str, response: str) -> None:
    """
    Log response information.

    Args:
        chain: Chain name
        token_in: Token in symbol
        token_out: Token out symbol
        response: Response string
    """
    print(f"✅ Swap response for {token_in} -> {token_out} on {chain}")
    print(f"📦 Response length: {len(response)} characters")
