"""
Trading Strategy Generator
Generates buy/sell recommendations based on technical analysis, sentiment, and ML predictions
"""

from typing import Any


def generate_trading_recommendation(
    technical_indicators: dict[str, Any],
    sentiment_data: dict[str, Any],
    ml_predictions: dict[str, Any],
) -> dict[str, Any]:
    """Generate buy/sell recommendation based on all factors."""

    rsi = technical_indicators.get("rsi", 50.0)
    macd = technical_indicators.get("macd", {})
    current_price = technical_indicators.get("current_price", 0.0)
    market_phase = technical_indicators.get("market_phase", "Neutral")
    support = technical_indicators.get("support", current_price * 0.95)
    resistance = technical_indicators.get("resistance", current_price * 1.05)
    volatility = technical_indicators.get("volatility", 0.0)

    # Get ML predictions
    predictions = ml_predictions.get("predictions", {})
    short_term_pred = predictions.get("1d", {})
    predicted_change = short_term_pred.get("change_percent", 0.0)

    # Get sentiment
    sentiment_balance = sentiment_data.get("sentiment_balance", 0.0)

    # Scoring system
    buy_score = 0
    sell_score = 0
    confidence = 0
    reasons = []

    # RSI analysis
    if rsi < 30:
        buy_score += 30
        reasons.append(f"RSI is oversold ({rsi:.1f}) - potential buying opportunity")
    elif rsi > 70:
        sell_score += 30
        reasons.append(f"RSI is overbought ({rsi:.1f}) - consider taking profits")
    elif rsi < 40:
        buy_score += 15
        reasons.append(f"RSI is below neutral ({rsi:.1f}) - slight bullish bias")
    elif rsi > 60:
        sell_score += 15
        reasons.append(f"RSI is above neutral ({rsi:.1f}) - slight bearish bias")

    # MACD analysis
    macd_signal = macd.get("signal", "neutral")
    macd_histogram = macd.get("histogram", 0.0)

    if macd_signal == "bullish" and macd_histogram > 0:
        buy_score += 20
        reasons.append("MACD shows bullish momentum")
    elif macd_signal == "bearish" and macd_histogram < 0:
        sell_score += 20
        reasons.append("MACD shows bearish momentum")

    # Market phase analysis
    if market_phase == "Bull Market":
        buy_score += 15
        reasons.append("Market is in Bull Market phase")
    elif market_phase == "Bear Market":
        sell_score += 15
        reasons.append("Market is in Bear Market phase")
    elif market_phase == "Accumulation":
        buy_score += 10
        reasons.append("Market is in Accumulation phase - good entry point")
    elif market_phase == "Correction":
        sell_score += 10
        reasons.append("Market is in Correction phase - caution advised")

    # ML Prediction analysis
    if predicted_change > 2:
        buy_score += 15
        reasons.append(f"ML model predicts {predicted_change:.1f}% price increase")
    elif predicted_change < -2:
        sell_score += 15
        reasons.append(f"ML model predicts {predicted_change:.1f}% price decrease")
    elif predicted_change > 0:
        buy_score += 5
    else:
        sell_score += 5

    # Sentiment analysis
    if sentiment_balance > 10:
        buy_score += 10
        reasons.append("Positive sentiment detected")
    elif sentiment_balance < -10:
        sell_score += 10
        reasons.append("Negative sentiment detected")

    # Determine recommendation
    score_diff = buy_score - sell_score

    if score_diff > 20:
        recommendation = "BUY"
        confidence = min(95, 50 + score_diff)
    elif score_diff < -20:
        recommendation = "SELL"
        confidence = min(95, 50 + abs(score_diff))
    else:
        recommendation = "HOLD"
        confidence = 50

    # Calculate entry, stop loss, and targets
    if recommendation == "BUY":
        entry_price = max(support, current_price * 0.98)  # Slightly below current or at support
        stop_loss = support * 0.97  # Below support
        target_1 = current_price * 1.03  # 3% target
        target_2 = current_price * 1.05  # 5% target
        target_3 = resistance  # Resistance level
    elif recommendation == "SELL":
        entry_price = min(
            resistance, current_price * 1.02
        )  # Slightly above current or at resistance
        stop_loss = resistance * 1.03  # Above resistance
        target_1 = current_price * 0.97  # 3% target
        target_2 = current_price * 0.95  # 5% target
        target_3 = support  # Support level
    else:  # HOLD
        entry_price = current_price
        stop_loss = support * 0.95 if current_price > support else current_price * 0.97
        target_1 = current_price * 1.02
        target_2 = current_price * 1.05
        target_3 = resistance

    return {
        "recommendation": recommendation,
        "confidence": round(confidence, 1),
        "current_price": round(current_price, 2),
        "entry_price": round(entry_price, 2),
        "stop_loss": round(stop_loss, 2),
        "targets": {
            "target_1": round(target_1, 2),
            "target_2": round(target_2, 2),
            "target_3": round(target_3, 2),
        },
        "timeframe": "Short-term (1-7 days)" if volatility > 50 else "Medium-term (7-30 days)",
        "reasons": reasons[:5],  # Top 5 reasons
        "risk_level": "High" if volatility > 70 else "Medium" if volatility > 40 else "Low",
    }
