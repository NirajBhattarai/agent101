"""Response validation utilities for Token Research Agent."""

import json
from typing import Any, Dict

from .constants import ERROR_INVALID_JSON, ERROR_VALIDATION_FAILED
from .models.token_research import TokenResearchResponse


def validate_and_serialize_response(response_data: Dict[str, Any]) -> str:
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
        validated = TokenResearchResponse(**response_data)
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


def build_error_response(error_type: str, error_message: str) -> Dict[str, Any]:
    """
    Build error response.

    Args:
        error_type: Error type
        error_message: Error message

    Returns:
        Dictionary with error response
    """
    return {
        "type": "token_research",
        "error": f"{error_type}: {error_message}",
    }
