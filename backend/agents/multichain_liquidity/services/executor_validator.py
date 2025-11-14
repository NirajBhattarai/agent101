"""
Executor response validation utilities for liquidity agent.

This module handles validation of responses at the executor/service layer,
as opposed to core/response_validator.py which handles domain-level validation.
"""

import json

from ..core.constants import ERROR_EMPTY_RESPONSE, ERROR_INVALID_JSON


def validate_response_content(content: str) -> str:
    """Validate response content at executor level."""
    if not content or not content.strip():
        raise ValueError(ERROR_EMPTY_RESPONSE)

    # Validate JSON
    try:
        json.loads(content)
    except json.JSONDecodeError as e:
        raise ValueError(ERROR_INVALID_JSON) from e

    return content


def log_sending_response(content: str) -> None:
    """Log sending response."""
    print(f"📤 Sending liquidity response (length: {len(content)} chars)")
