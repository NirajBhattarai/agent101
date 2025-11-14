"""
Trading Agent Definition

Defines the TradingAgent class that provides buy/sell recommendations.
"""

from .core.constants import (
    ERROR_UNSUPPORTED_ASSET,
    ERROR_VALIDATION_FAILED,
)
from .core.response_validator import (
    log_response_info,
    validate_and_serialize_response,
    validate_json,
)
from .services.query_parser import parse_trading_query
from .services.response_builder import (
    build_error_response,
    build_trading_response,
)
from .tools.ml_predictor import ml_predictor
from .tools.price_data import fetch_price_data, fetch_sentiment_data
from .tools.technical_analysis import calculate_technical_indicators
from .tools.trading_strategy import generate_trading_recommendation


class TradingAgent:
    """Agent that provides buy/sell recommendations based on technical analysis, sentiment, and ML predictions."""

    async def invoke(self, query: str, session_id: str) -> str:
        """Invoke the agent with a query."""
        print(f"🔍 Trading Agent received query: {query}")

        try:
            # Parse query
            asset, days = parse_trading_query(query)

            # Validate asset
            if asset not in ["bitcoin", "ethereum"]:
                error_msg = f"{ERROR_UNSUPPORTED_ASSET} Supported assets: BTC, ETH"
                return build_error_response(error_msg, asset)

            # Fetch price data
            print(f"📊 Fetching price data for {asset}...")
            price_data = fetch_price_data(asset, days)

            if not price_data.get("success"):
                return build_error_response(
                    price_data.get("error", "Failed to fetch price data"), asset
                )

            prices = price_data.get("prices", [])
            volumes = price_data.get("volumes", [])

            # Check if we have enough data for analysis
            # If we only have current price, we can still provide a basic recommendation
            if len(prices) < 2:
                return build_error_response(
                    "Insufficient price data for analysis. Need at least 2 data points.", asset
                )

            # Warn if we have limited data but still proceed
            if len(prices) < 50:
                print(
                    f"⚠️ Limited historical data ({len(prices)} points), analysis may be less accurate"
                )

            # Calculate technical indicators
            print("📈 Calculating technical indicators...")
            technical_indicators = calculate_technical_indicators(prices, volumes)

            # Fetch sentiment data
            print("💭 Fetching sentiment data...")
            sentiment_data = fetch_sentiment_data(asset, days)

            # Train and get ML predictions
            print("🤖 Training ML model and generating predictions...")
            train_result = ml_predictor.train(prices, volumes)

            if train_result.get("success"):
                ml_predictions = ml_predictor.predict(prices, volumes, days)
            else:
                # Fallback predictions if ML training fails
                ml_predictions = {
                    "success": True,
                    "current_price": prices[-1],
                    "predictions": {
                        "1d": {"price": prices[-1], "change_percent": 0.0, "confidence": 50.0},
                        "7d": {"price": prices[-1], "change_percent": 0.0, "confidence": 45.0},
                        "30d": {"price": prices[-1], "change_percent": 0.0, "confidence": 40.0},
                    },
                }

            # Generate trading recommendation
            print("💡 Generating trading recommendation...")
            recommendation = generate_trading_recommendation(
                technical_indicators, sentiment_data, ml_predictions
            )

            # Build response
            response = build_trading_response(
                recommendation, technical_indicators, ml_predictions, asset, days
            )

            validated_response = validate_and_serialize_response(response)
            log_response_info(query, validated_response)
            validate_json(validated_response)
            return validated_response

        except Exception as e:
            print(f"❌ Error in trading agent: {e}")
            import traceback

            traceback.print_exc()
            error_msg = f"{ERROR_VALIDATION_FAILED}: {str(e)}"
            return build_error_response(error_msg, "unknown")
