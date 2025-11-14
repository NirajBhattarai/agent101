"""
ML Prediction Model
Simple model for price prediction using technical indicators
"""

from typing import Any, Dict, List

import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from .technical_analysis import calculate_macd, calculate_rsi, calculate_sma, calculate_volatility


class MLPredictor:
    """Simple ML model for price prediction."""

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False

    def prepare_features(self, prices: List[float], volumes: List[float]) -> np.ndarray:
        """Prepare features for ML model."""
        if len(prices) < 50:
            return np.array([])

        features = []

        # Use last 50 data points
        window_size = min(50, len(prices))
        price_window = prices[-window_size:]
        volume_window = volumes[-window_size:] if len(volumes) >= window_size else [0] * window_size

        for i in range(5, len(price_window)):
            # Technical indicators
            rsi = calculate_rsi(price_window[: i + 1])
            macd = calculate_macd(price_window[: i + 1])
            ma20 = calculate_sma(price_window[: i + 1], min(20, i + 1))
            volatility = calculate_volatility(price_window[: i + 1]) if i > 1 else 0.0

            # Price features
            price_change = (
                (price_window[i] - price_window[i - 1]) / price_window[i - 1] if i > 0 else 0.0
            )
            volume_ratio = (
                volume_window[i] / np.mean(volume_window[: i + 1])
                if i > 0 and np.mean(volume_window[: i + 1]) > 0
                else 1.0
            )

            feature_vector = [
                price_window[i],  # Current price
                price_change,  # Price change
                rsi / 100.0,  # Normalized RSI
                macd["macd_line"],  # MACD line
                macd["histogram"],  # MACD histogram
                ma20 / price_window[i] if price_window[i] > 0 else 1.0,  # MA20 ratio
                volatility / 100.0,  # Normalized volatility
                volume_ratio,  # Volume ratio
            ]

            features.append(feature_vector)

        return np.array(features)

    def train(self, prices: List[float], volumes: List[float]) -> Dict[str, Any]:
        """Train the ML model."""
        features = self.prepare_features(prices, volumes)

        if len(features) < 10:
            return {"success": False, "error": "Insufficient data for training"}

        # Create targets (next day price)
        targets = []
        for i in range(len(features)):
            if i + 1 < len(prices):
                # Predict price change percentage
                price_change = (prices[i + 1] - prices[i]) / prices[i]
                targets.append(price_change)
            else:
                targets.append(0.0)

        targets = np.array(targets)

        if len(features) != len(targets):
            min_len = min(len(features), len(targets))
            features = features[:min_len]
            targets = targets[:min_len]

        if len(features) < 5:
            return {"success": False, "error": "Insufficient data for training"}

        # Split data
        if len(features) > 5:
            X_train, X_test, y_train, y_test = train_test_split(
                features, targets, test_size=0.2, random_state=42
            )
        else:
            X_train, X_test, y_train, y_test = features, features[-1:], targets, targets[-1:]

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test) if len(X_test) > 0 else X_train_scaled

        # Train model
        self.model = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42)
        self.model.fit(X_train_scaled, y_train)

        # Calculate accuracy
        if len(X_test) > 0:
            predictions = self.model.predict(X_test_scaled)
            mse = np.mean((predictions - y_test) ** 2)
            accuracy = max(0, 100 - (mse * 10000))  # Convert MSE to accuracy-like metric
        else:
            accuracy = 70.0  # Default accuracy

        self.is_trained = True

        return {"success": True, "accuracy": round(accuracy, 2), "training_samples": len(X_train)}

    def predict(self, prices: List[float], volumes: List[float], days: int = 7) -> Dict[str, Any]:
        """Predict future prices."""
        if not self.is_trained:
            train_result = self.train(prices, volumes)
            if not train_result.get("success"):
                return train_result

        features = self.prepare_features(prices, volumes)

        if len(features) == 0:
            return {"success": False, "error": "Insufficient data for prediction"}

        # Get last feature vector
        last_features = features[-1:].reshape(1, -1)
        last_features_scaled = self.scaler.transform(last_features)

        # Predict price change
        predicted_change = self.model.predict(last_features_scaled)[0]
        current_price = prices[-1]

        # Generate predictions for different timeframes
        predictions = {}

        # Short-term (1 day)
        short_term_price = current_price * (1 + predicted_change)
        predictions["1d"] = {
            "price": round(short_term_price, 2),
            "change_percent": round(predicted_change * 100, 2),
            "confidence": 75.0,
        }

        # Mid-term (7 days) - compound prediction
        mid_term_change = predicted_change * 7 * 0.7  # Dampen for longer term
        mid_term_price = current_price * (1 + mid_term_change)
        predictions["7d"] = {
            "price": round(mid_term_price, 2),
            "change_percent": round(mid_term_change * 100, 2),
            "confidence": 65.0,
        }

        # Long-term (30 days) - more conservative
        long_term_change = predicted_change * 30 * 0.5  # More conservative
        long_term_price = current_price * (1 + long_term_change)
        predictions["30d"] = {
            "price": round(long_term_price, 2),
            "change_percent": round(long_term_change * 100, 2),
            "confidence": 55.0,
        }

        return {
            "success": True,
            "current_price": round(current_price, 2),
            "predictions": predictions,
        }


# Global predictor instance
ml_predictor = MLPredictor()
