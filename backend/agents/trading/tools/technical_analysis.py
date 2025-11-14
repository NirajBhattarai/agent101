"""
Technical Analysis Tools
Calculates RSI, MACD, Moving Averages, and other indicators
"""

from typing import Any, Dict, List

import numpy as np


def calculate_rsi(prices: List[float], period: int = 14) -> float:
    """Calculate Relative Strength Index (RSI)."""
    if len(prices) < period + 1:
        return 50.0  # Neutral RSI if insufficient data

    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)

    avg_gain = np.mean(gains[-period:])
    avg_loss = np.mean(losses[-period:])

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    return round(rsi, 2)


def calculate_ema(prices: List[float], period: int) -> List[float]:
    """Calculate Exponential Moving Average (EMA)."""
    if len(prices) < period:
        return prices

    multiplier = 2 / (period + 1)
    ema = [prices[0]]

    for price in prices[1:]:
        ema.append((price - ema[-1]) * multiplier + ema[-1])

    return ema


def calculate_sma(prices: List[float], period: int) -> float:
    """Calculate Simple Moving Average (SMA)."""
    if len(prices) < period:
        return prices[-1] if prices else 0.0

    return round(np.mean(prices[-period:]), 2)


def calculate_macd(
    prices: List[float], fast: int = 12, slow: int = 26, signal: int = 9
) -> Dict[str, Any]:
    """Calculate MACD (Moving Average Convergence Divergence)."""
    if len(prices) < slow:
        return {"macd_line": 0.0, "signal_line": 0.0, "histogram": 0.0, "signal": "neutral"}

    ema_fast = calculate_ema(prices, fast)
    ema_slow = calculate_ema(prices, slow)

    macd_line = ema_fast[-1] - ema_slow[-1]

    # Calculate signal line (EMA of MACD line)
    macd_values = [ema_fast[i] - ema_slow[i] for i in range(len(ema_slow))]
    signal_line_ema = calculate_ema(macd_values, signal)
    signal_line = signal_line_ema[-1] if signal_line_ema else 0.0

    histogram = macd_line - signal_line

    # Determine signal
    if histogram > 0 and macd_line > signal_line:
        signal_str = "bullish"
    elif histogram < 0 and macd_line < signal_line:
        signal_str = "bearish"
    else:
        signal_str = "neutral"

    return {
        "macd_line": round(macd_line, 4),
        "signal_line": round(signal_line, 4),
        "histogram": round(histogram, 4),
        "signal": signal_str,
    }


def calculate_bollinger_bands(
    prices: List[float], period: int = 20, std_dev: int = 2
) -> Dict[str, float]:
    """Calculate Bollinger Bands."""
    if len(prices) < period:
        current_price = prices[-1] if prices else 0.0
        return {"upper": current_price, "middle": current_price, "lower": current_price}

    sma = np.mean(prices[-period:])
    std = np.std(prices[-period:])

    return {
        "upper": round(sma + (std_dev * std), 2),
        "middle": round(sma, 2),
        "lower": round(sma - (std_dev * std), 2),
    }


def find_support_resistance(prices: List[float]) -> Dict[str, float]:
    """Find support and resistance levels."""
    if not prices:
        return {"support": 0.0, "resistance": 0.0}

    sorted_prices = sorted(prices)
    q1_index = int(len(sorted_prices) * 0.25)
    q3_index = int(len(sorted_prices) * 0.75)

    return {
        "support": round(sorted_prices[q1_index], 2),
        "resistance": round(sorted_prices[q3_index], 2),
    }


def calculate_volatility(prices: List[float]) -> float:
    """Calculate annualized volatility."""
    if len(prices) < 2:
        return 0.0

    returns = np.diff(prices) / prices[:-1]
    volatility = np.std(returns) * np.sqrt(365) * 100  # Annualized

    return round(volatility, 2)


def determine_market_phase(current_price: float, ma20: float, ma50: float, ma200: float) -> str:
    """Determine market phase based on price and moving averages."""
    price_above_ma20 = current_price > ma20
    price_above_ma50 = current_price > ma50
    price_above_ma200 = current_price > ma200
    ma50_above_ma200 = ma50 > ma200

    if price_above_ma20 and price_above_ma50 and price_above_ma200 and ma50_above_ma200:
        return "Bull Market"
    elif (
        not price_above_ma20
        and not price_above_ma50
        and not price_above_ma200
        and not ma50_above_ma200
    ):
        return "Bear Market"
    elif price_above_ma200 and not price_above_ma50:
        return "Correction"
    else:
        return "Accumulation"


def calculate_technical_indicators(prices: List[float], volumes: List[float]) -> Dict[str, Any]:
    """Calculate all technical indicators."""
    if len(prices) < 50:
        current_price = prices[-1] if prices else 0.0
        return {
            "current_price": current_price,
            "rsi": 50.0,
            "macd": {"macd_line": 0.0, "signal_line": 0.0, "histogram": 0.0, "signal": "neutral"},
            "ma20": current_price,
            "ma50": current_price,
            "ma200": current_price,
            "bollinger_bands": {
                "upper": current_price,
                "middle": current_price,
                "lower": current_price,
            },
            "support": current_price * 0.95,
            "resistance": current_price * 1.05,
            "volatility": 0.0,
            "market_phase": "Neutral",
        }

    current_price = prices[-1]

    rsi = calculate_rsi(prices)
    macd = calculate_macd(prices)
    ma20 = calculate_sma(prices, 20)
    ma50 = calculate_sma(prices, 50)
    ma200 = calculate_sma(prices, 200)
    bb = calculate_bollinger_bands(prices)
    support_resistance = find_support_resistance(prices)
    volatility = calculate_volatility(prices)
    market_phase = determine_market_phase(current_price, ma20, ma50, ma200)

    return {
        "current_price": round(current_price, 2),
        "rsi": rsi,
        "macd": macd,
        "ma20": ma20,
        "ma50": ma50,
        "ma200": ma200,
        "bollinger_bands": bb,
        "support": support_resistance["support"],
        "resistance": support_resistance["resistance"],
        "volatility": volatility,
        "market_phase": market_phase,
    }
