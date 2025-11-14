"""
Executor validator for Trading Agent
"""

import json

from ..core.constants import ERROR_EMPTY_RESPONSE


def validate_response_content(content: str) -> str:
    """Validate response content."""
    if not content or not content.strip():
        raise ValueError(ERROR_EMPTY_RESPONSE)

    # Try to parse as JSON to validate
    try:
        json.loads(content)
    except json.JSONDecodeError:
        # If it's not JSON, that's okay - it might be a text response
        pass

    return content


def log_sending_response(content: str) -> None:
    """Log sending response."""
    print(f"📤 Sending trading response (length: {len(content)} chars)")
