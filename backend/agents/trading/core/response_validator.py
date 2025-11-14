"""
Response validator for Trading Agent
"""

import json
from typing import Any

from .constants import ERROR_INVALID_JSON


def validate_json(response: str) -> None:
    """Validate that response is valid JSON."""
    try:
        json.loads(response)
    except json.JSONDecodeError as e:
        raise ValueError(f"{ERROR_INVALID_JSON}: {str(e)}") from e


def validate_and_serialize_response(response: Any) -> str:
    """Validate and serialize response."""
    if isinstance(response, str):
        validate_json(response)
        return response
    elif isinstance(response, dict):
        return json.dumps(response, indent=2)
    else:
        raise ValueError(f"Invalid response type: {type(response)}")


def log_response_info(query: str, response: str) -> None:
    """Log response information."""
    print(f"✅ Trading Agent response generated for query: {query[:50]}...")
    print(f"   Response length: {len(response)} characters")
