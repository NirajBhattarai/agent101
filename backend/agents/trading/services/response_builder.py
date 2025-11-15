"""
Response builder for Trading Agent
Builds structured JSON responses
"""

import json
from typing import Any

from ..core.constants import ERROR_EXECUTION_ERROR, RESPONSE_TYPE


def build_error_response(error: str, asset: str = "unknown") -> str:
    """Build error response."""
    error_dict = {
        "type": RESPONSE_TYPE,
        "asset": asset,
        "success": False,
        "error": f"{ERROR_EXECUTION_ERROR}: {error}",
    }
    return json.dumps(error_dict, indent=2)


def build_trading_response(
    recommendation: dict[str, Any],
    technical_indicators: dict[str, Any],
    ml_predictions: dict[str, Any],
    asset: str,
    days: int,
) -> str:
    """Build trading recommendation response."""
    response = {
        "type": RESPONSE_TYPE,
        "asset": asset,
        "days": days,
        "recommendation": recommendation.get("recommendation", "HOLD"),
        "confidence": recommendation.get("confidence", 50.0),
        "current_price": recommendation.get("current_price", 0.0),
        "entry_price": recommendation.get("entry_price", 0.0),
        "stop_loss": recommendation.get("stop_loss", 0.0),
        "targets": recommendation.get("targets", {}),
        "timeframe": recommendation.get("timeframe", "Medium-term"),
        "risk_level": recommendation.get("risk_level", "Medium"),
        "reasons": recommendation.get("reasons", []),
        "technical_indicators": {
            "rsi": technical_indicators.get("rsi", 50.0),
            "macd": technical_indicators.get("macd", {}),
            "market_phase": technical_indicators.get("market_phase", "Neutral"),
            "volatility": technical_indicators.get("volatility", 0.0),
        },
        "ml_predictions": ml_predictions.get("predictions", {}),
        "success": True,
    }

    return json.dumps(response, indent=2)
