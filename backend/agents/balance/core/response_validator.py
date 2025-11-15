"""
Response validation utilities for balance agent.

Handles validation and serialization of balance responses.
"""

import json

from .constants import (
    DEFAULT_TOTAL_USD_VALUE,
    RESPONSE_TYPE,
)
from .exceptions import ValidationError
from .models.balance import StructuredBalance


def validate_and_serialize_response(balance_data: dict) -> str:
    """
    Validate and serialize balance response to JSON.
    Ensures response is always valid JSON, even if validation fails.
    """
    try:
        # Ensure all required fields have defaults
        if not isinstance(balance_data, dict):
            balance_data = {}

        # Set defaults for required fields
        balance_data.setdefault("type", RESPONSE_TYPE)
        balance_data.setdefault("chain", "unknown")
        # Ensure account_address is always a string, not None
        if balance_data.get("account_address") is None:
            balance_data["account_address"] = "N/A"
        else:
            balance_data["account_address"] = str(balance_data["account_address"])
        balance_data.setdefault("balances", [])
        balance_data.setdefault("total_usd_value", DEFAULT_TOTAL_USD_VALUE)

        # Validate with Pydantic
        validated_balance = StructuredBalance(**balance_data)
        serialized = json.dumps(validated_balance.model_dump(), indent=2)

        # Double-check it's valid JSON
        json.loads(serialized)
        return serialized

    except Exception as e:
        # If validation fails, return a valid error response JSON
        print(f"⚠️ Validation error: {e}")
        error_response = {
            "type": RESPONSE_TYPE,
            "chain": balance_data.get("chain", "unknown"),
            "account_address": balance_data.get("account_address", "unknown"),
            "balances": [],
            "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
            "error": f"Failed to validate balance response: {str(e)}",
        }
        return json.dumps(error_response, indent=2)


def build_error_response(chain: str, account_address: str, error: str) -> str:
    """
    Build error response.
    Always returns valid JSON.
    """
    error_data = {
        "type": RESPONSE_TYPE,
        "chain": chain or "unknown",
        "account_address": account_address or "unknown",
        "balances": [],
        "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
        "error": str(error) if error else "Unknown error",
    }
    try:
        return json.dumps(error_data, indent=2)
    except Exception as e:
        # Fallback to simple JSON if serialization fails
        print(f"⚠️ Error serializing error response: {e}")
        return json.dumps(
            {
                "type": RESPONSE_TYPE,
                "chain": "unknown",
                "account_address": "unknown",
                "balances": [],
                "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
                "error": "Internal error: Failed to serialize response",
            },
            indent=2,
        )


def log_response_info(account_address: str, chain: str, response: str) -> None:
    """Log response information."""
    print(f"✅ Returning balance response for {account_address} on {chain}")
    print(f"📦 Response length: {len(response)} chars")
    print(f"📄 Response preview: {response[:200]}...")


def validate_json(response: str) -> None:
    """
    Validate that response is valid JSON and has required structure.

    Raises:
        ValidationError: If JSON is invalid or missing required fields
    """
    try:
        data = json.loads(response)

        # Validate required fields
        if not isinstance(data, dict):
            raise ValidationError("Response must be a JSON object")

        required_fields = ["type", "chain", "account_address", "balances"]
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")

        # Validate balances is a list
        if not isinstance(data.get("balances"), list):
            raise ValidationError("balances must be a list")

        # Validate type field
        if data.get("type") != RESPONSE_TYPE:
            raise ValidationError(f"Response type must be '{RESPONSE_TYPE}'")

    except json.JSONDecodeError as e:
        raise ValidationError(f"Invalid JSON format: {str(e)}") from e
