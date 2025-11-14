"""
Response builder for Sentiment Agent
Builds structured JSON responses
"""

import json
from typing import Any, Dict, Optional

from ..core.constants import ERROR_EXECUTION_ERROR, RESPONSE_TYPE


def build_sentiment_response(
    metric: str,
    data: Dict[str, Any],
    asset: Optional[str] = None,
    days: Optional[int] = None,
) -> Dict[str, Any]:
    """Build a sentiment response."""
    response = {
        "type": RESPONSE_TYPE,
        "metric": metric,
        "data": data,
    }

    if asset:
        response["asset"] = asset
    if days:
        response["days"] = days

    return response


def build_error_response(
    metric: str,
    error: str,
    asset: Optional[str] = None,
) -> Dict[str, Any]:
    """Build an error response."""
    return {
        "type": RESPONSE_TYPE,
        "metric": metric,
        "success": False,
        "error": f"{ERROR_EXECUTION_ERROR}: {error}",
        "asset": asset or "unknown",
    }


def build_sentiment_balance_response(asset: str, days: int, result: Dict[str, Any]) -> str:
    """Build sentiment balance response."""
    if not result.get("success"):
        response = build_error_response(
            "sentiment_balance", result.get("error", "Unknown error"), asset
        )
    else:
        response = build_sentiment_response(
            "sentiment_balance",
            {
                "sentiment_balance": result.get("sentiment_balance"),
                "message": result.get("message"),
            },
            asset,
            days,
        )
        response["success"] = True

    return json.dumps(response, indent=2)


def build_social_volume_response(asset: str, days: int, result: Dict[str, Any]) -> str:
    """Build social volume response."""
    if not result.get("success"):
        response = build_error_response(
            "social_volume", result.get("error", "Unknown error"), asset
        )
    else:
        response = build_sentiment_response(
            "social_volume",
            {
                "social_volume": result.get("social_volume"),
                "message": result.get("message"),
            },
            asset,
            days,
        )
        response["success"] = True

    return json.dumps(response, indent=2)


def build_social_shift_response(
    asset: str, threshold: float, days: int, result: Dict[str, Any]
) -> str:
    """Build social shift response."""
    if not result.get("success"):
        response = build_error_response("social_shift", result.get("error", "Unknown error"), asset)
    else:
        response = build_sentiment_response(
            "social_shift",
            {
                "shift_detected": result.get("shift_detected", False),
                "direction": result.get("direction"),
                "change_percent": result.get("change_percent"),
                "previous_avg": result.get("previous_avg"),
                "latest_volume": result.get("latest_volume"),
                "message": result.get("message"),
            },
            asset,
            days,
        )
        response["success"] = True
        response["threshold"] = threshold

    return json.dumps(response, indent=2)


def build_trending_words_response(days: int, top_n: int, result: Dict[str, Any]) -> str:
    """Build trending words response."""
    if not result.get("success"):
        response = build_error_response("trending_words", result.get("error", "Unknown error"))
    else:
        response = build_sentiment_response(
            "trending_words",
            {
                "trending_words": result.get("trending_words", []),
                "message": result.get("message"),
            },
            days=days,
        )
        response["success"] = True
        response["top_n"] = top_n

    return json.dumps(response, indent=2)


def build_social_dominance_response(asset: str, days: int, result: Dict[str, Any]) -> str:
    """Build social dominance response."""
    if not result.get("success"):
        response = build_error_response(
            "social_dominance", result.get("error", "Unknown error"), asset
        )
    else:
        response = build_sentiment_response(
            "social_dominance",
            {
                "social_dominance": result.get("social_dominance"),
                "message": result.get("message"),
            },
            asset,
            days,
        )
        response["success"] = True

    return json.dumps(response, indent=2)


def build_price_response(metric: str, asset: str, days: int, result: Dict[str, Any]) -> str:
    """Build price response (USD or BTC)."""
    if not result.get("success"):
        response = build_error_response(metric, result.get("error", "Unknown error"), asset)
    else:
        if metric == "price_btc":
            data = {
                "current_price_btc": result.get("current_price_btc"),
                "average_price_btc": result.get("average_price_btc"),
                "price_change_percent": result.get("price_change_percent"),
                "message": result.get("message"),
            }
        else:
            data = {
                "current_price": result.get("current_price"),
                "average_price": result.get("average_price"),
                "price_change_percent": result.get("price_change_percent"),
                "message": result.get("message"),
            }
        response = build_sentiment_response(metric, data, asset, days)
        response["success"] = True

    return json.dumps(response, indent=2)


def build_volume_response(metric: str, asset: str, days: int, result: Dict[str, Any]) -> str:
    """Build volume response (USD, BTC, or transaction volume)."""
    if not result.get("success"):
        response = build_error_response(metric, result.get("error", "Unknown error"), asset)
    else:
        if metric == "volume_btc":
            data = {
                "total_volume_btc": result.get("total_volume_btc"),
                "average_volume_btc": result.get("average_volume_btc"),
                "latest_volume_btc": result.get("latest_volume_btc"),
                "message": result.get("message"),
            }
        elif metric == "transaction_volume":
            data = {
                "total_transaction_volume": result.get("total_transaction_volume"),
                "average_transaction_volume": result.get("average_transaction_volume"),
                "latest_transaction_volume": result.get("latest_transaction_volume"),
                "message": result.get("message"),
            }
        else:
            data = {
                "total_volume_usd": result.get("total_volume_usd"),
                "average_volume_usd": result.get("average_volume_usd"),
                "latest_volume_usd": result.get("latest_volume_usd"),
                "message": result.get("message"),
            }
        response = build_sentiment_response(metric, data, asset, days)
        response["success"] = True

    return json.dumps(response, indent=2)


def build_active_addresses_response(asset: str, days: int, result: Dict[str, Any]) -> str:
    """Build active addresses response."""
    if not result.get("success"):
        response = build_error_response(
            "active_addresses", result.get("error", "Unknown error"), asset
        )
    else:
        response = build_sentiment_response(
            "active_addresses",
            {
                "total_active_addresses": result.get("total_active_addresses"),
                "average_active_addresses": result.get("average_active_addresses"),
                "latest_active_addresses": result.get("latest_active_addresses"),
                "message": result.get("message"),
            },
            asset,
            days,
        )
        response["success"] = True

    return json.dumps(response, indent=2)
