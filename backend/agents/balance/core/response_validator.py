"""
Response validation utilities for balance agent.

Handles validation and serialization of balance responses.
"""

import json
from .constants import (
    RESPONSE_TYPE,
    DEFAULT_TOTAL_USD_VALUE,
)
from .models.balance import StructuredBalance
from .exceptions import ValidationError


def validate_and_serialize_response(balance_data: dict) -> str:
    """Validate and serialize balance response to JSON."""
    try:
        validated_balance = StructuredBalance(**balance_data)
        return json.dumps(validated_balance.model_dump(), indent=2)
    except Exception as e:
        raise ValidationError(
            f"Failed to validate balance response: {str(e)}",
            details={"balance_data": balance_data},
        ) from e


def build_error_response(chain: str, account_address: str, error: str) -> str:
    """Build error response."""
    error_data = {
        "type": RESPONSE_TYPE,
        "chain": chain,
        "account_address": account_address,
        "balances": [],
        "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
        "error": error,
    }
    return json.dumps(error_data, indent=2)


def log_response_info(account_address: str, chain: str, response: str) -> None:
    """Log response information."""
    print(f"✅ Returning balance response for {account_address} on {chain}")
    print(f"📦 Response length: {len(response)} chars")
    print(f"📄 Response preview: {response[:200]}...")


def validate_json(response: str) -> None:
    """Validate that response is valid JSON."""
    json.loads(response)

