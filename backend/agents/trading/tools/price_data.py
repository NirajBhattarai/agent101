"""
Price Data Fetcher from CoinGecko API
"""

import os
import time
from typing import Any, Dict, Optional

import requests

from ..core.constants import (
    ASSET_MAPPING,
    COINGECKO_API_URL,
    COINGECKO_PRO_API_URL,
    ERROR_UNSUPPORTED_ASSET,
)


def _get_coingecko_headers() -> Dict[str, str]:
    """Get CoinGecko API headers with API key if available."""
    api_key = os.getenv("COINGECKO_API_KEY")
    headers = {}

    if api_key:
        # Determine if it's a pro key or demo key
        # Pro keys typically use pro-api.coingecko.com, demo keys use api.coingecko.com
        # We'll use demo header by default, but support both
        if "pro" in api_key.lower() or os.getenv("COINGECKO_API_TYPE", "").lower() == "pro":
            headers["x-cg-pro-api-key"] = api_key
        else:
            headers["x-cg-demo-api-key"] = api_key

    return headers


def _get_coingecko_base_url() -> str:
    """Get CoinGecko base URL based on API key type."""
    api_key = os.getenv("COINGECKO_API_KEY", "")
    api_type = os.getenv("COINGECKO_API_TYPE", "").lower()

    # Use pro URL if explicitly set or if key suggests pro
    if api_type == "pro" or ("pro" in api_key.lower() and api_key):
        return COINGECKO_PRO_API_URL
    return COINGECKO_API_URL


def normalize_asset(asset: str) -> str:
    """Normalize asset name to CoinGecko format."""
    asset_lower = asset.lower()
    return ASSET_MAPPING.get(asset_lower, asset_lower)


def _fetch_with_retry(
    url: str,
    params: Optional[Dict[str, Any]] = None,
    max_retries: int = 3,
    timeout: int = 45,
    backoff_factor: float = 2.0,
) -> requests.Response:
    """Fetch data with retry logic and exponential backoff."""
    headers = _get_coingecko_headers()

    for attempt in range(max_retries):
        try:
            response = requests.get(url, params=params, headers=headers, timeout=timeout)

            # Handle rate limiting (429) with longer backoff
            if response.status_code == 429:
                if attempt < max_retries - 1:
                    # Rate limited - wait longer (60s, 120s, 240s)
                    wait_time = 60 * (backoff_factor**attempt)
                    print(
                        f"⚠️ Rate limited (429), waiting {wait_time:.0f}s before retry {attempt + 1}/{max_retries}..."
                    )
                    time.sleep(wait_time)
                    continue
                else:
                    raise Exception(
                        f"Rate limited after {max_retries} attempts. Please try again later."
                    )

            response.raise_for_status()
            return response
        except (requests.Timeout, requests.ConnectionError) as e:
            if attempt < max_retries - 1:
                wait_time = backoff_factor**attempt
                print(
                    f"⚠️ Request failed (attempt {attempt + 1}/{max_retries}), retrying in {wait_time:.1f}s..."
                )
                time.sleep(wait_time)
            else:
                raise Exception(f"Failed after {max_retries} attempts: {str(e)}") from e
        except requests.HTTPError as e:
            # For other HTTP errors (4xx, 5xx), don't retry except 429
            if response.status_code == 429:
                continue  # Already handled above
            raise Exception(f"HTTP error {response.status_code}: {str(e)}") from e

    raise Exception("Unexpected error in retry logic")


def fetch_price_data(asset: str, days: int = 30) -> Dict[str, Any]:
    """Fetch price and volume data from CoinGecko API with retry logic."""
    asset_id = normalize_asset(asset)

    if asset_id not in ["bitcoin", "ethereum"]:
        raise ValueError(ERROR_UNSUPPORTED_ASSET)

    try:
        base_url = _get_coingecko_base_url()
        api_key = os.getenv("COINGECKO_API_KEY")

        if api_key:
            print(f"📊 Fetching price data for {asset_id} from CoinGecko (with API key)...")
        else:
            print(f"📊 Fetching price data for {asset_id} from CoinGecko (free tier)...")

        # Get current price with retry
        price_url = f"{base_url}/simple/price"
        price_params = {
            "ids": asset_id,
            "vs_currencies": "usd",
            "include_24hr_change": "true",
            "include_24hr_vol": "true",
        }

        try:
            price_response = _fetch_with_retry(price_url, params=price_params, timeout=45)
            price_data = price_response.json()
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to fetch current price from CoinGecko after retries: {str(e)}",
            }

        if asset_id not in price_data:
            return {"success": False, "error": f"Asset {asset} not found in CoinGecko API response"}

        asset_data = price_data[asset_id]
        current_price = asset_data.get("usd", 0.0)
        price_change_24h = asset_data.get("usd_24h_change", 0.0)
        volume_24h = asset_data.get("usd_24h_vol", 0.0)

        print(f"✅ Current price fetched: ${current_price:,.2f}")

        # Get historical data with retry
        # Note: CoinGecko free tier has rate limits
        # Use daily interval for better rate limit compliance
        history_url = f"{base_url}/coins/{asset_id}/market_chart"
        history_params = {
            "vs_currency": "usd",
            "days": min(days, 365),  # CoinGecko free tier limit
            "interval": "daily",  # Always use daily to avoid rate limits
        }

        try:
            print(f"📈 Fetching historical data for {days} days (daily interval)...")
            # Add a small delay to avoid rate limits
            time.sleep(1)
            history_response = _fetch_with_retry(history_url, params=history_params, timeout=60)
            history_data = history_response.json()
        except Exception as e:
            # If historical data fails (rate limit or other error), still return current price data
            error_msg = str(e)
            if "429" in error_msg or "Rate limited" in error_msg:
                print("⚠️ CoinGecko rate limit reached. Using current price only.")
            else:
                print(f"⚠️ Failed to fetch historical data: {error_msg}")
            return {
                "success": True,
                "asset": asset_id,
                "current_price": current_price,
                "price_change_24h": round(price_change_24h, 2),
                "volume_24h": volume_24h,
                "prices": [current_price],  # Use current price as fallback
                "volumes": [volume_24h] if volume_24h else [],
                "days": days,
                "warning": "Historical data unavailable due to rate limits, using current price only",
            }

        # Extract prices and volumes
        prices = [point[1] for point in history_data.get("prices", [])]
        volumes = [point[1] for point in history_data.get("total_volumes", [])]

        if not prices:
            # Fallback to current price if no historical data
            prices = [current_price]
            volumes = [volume_24h] if volume_24h else []

        print(f"✅ Fetched {len(prices)} data points")

        return {
            "success": True,
            "asset": asset_id,
            "current_price": current_price,
            "price_change_24h": round(price_change_24h, 2),
            "volume_24h": volume_24h,
            "prices": prices,
            "volumes": volumes,
            "days": days,
        }
    except ValueError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": f"Unexpected error fetching price data: {str(e)}"}


def fetch_sentiment_data(asset: str, days: int = 7) -> Dict[str, Any]:
    """Fetch sentiment data from sentiment agent via A2A protocol."""
    asset_id = normalize_asset(asset)

    # Map to sentiment agent format
    sentiment_asset_map = {"bitcoin": "bitcoin", "ethereum": "ethereum"}

    sentiment_asset = sentiment_asset_map.get(asset_id)
    if not sentiment_asset:
        return {"success": False, "error": "Sentiment data not available for this asset"}

    try:
        sentiment_agent_url = os.getenv("SENTIMENT_AGENT_URL", "http://localhost:10000")

        # Call sentiment agent via A2A protocol
        # Format: POST to /task endpoint with query
        query = (
            f"Get sentiment balance for {sentiment_asset.capitalize()} over the last {days} days"
        )

        # A2A protocol task creation
        task_url = f"{sentiment_agent_url}/task"
        task_payload = {"input": query, "input_mode": "text"}

        try:
            response = requests.post(task_url, json=task_payload, timeout=10)
            if response.status_code == 200:
                task_data = response.json()
                task_id = task_data.get("task_id")

                # Poll for result (simplified - in production use proper polling)
                import time

                time.sleep(1)  # Wait a bit for processing

                result_url = f"{sentiment_agent_url}/task/{task_id}"
                result_response = requests.get(result_url, timeout=10)

                if result_response.status_code == 200:
                    result_data = result_response.json()
                    # Parse sentiment balance from response
                    # The response format may vary, so we'll extract what we can
                    result_text = result_data.get("output", {}).get("text", "")

                    # Try to extract sentiment balance from JSON response
                    import json

                    try:
                        if isinstance(result_text, str):
                            sentiment_json = json.loads(result_text)
                            sentiment_balance = sentiment_json.get("data", {}).get(
                                "sentiment_balance", 0.0
                            )
                        else:
                            sentiment_balance = result_text.get("data", {}).get(
                                "sentiment_balance", 0.0
                            )
                    except:
                        sentiment_balance = 0.0

                    return {
                        "success": True,
                        "sentiment_balance": float(sentiment_balance) if sentiment_balance else 0.0,
                        "social_volume": 0,  # Could be fetched separately
                        "social_dominance": 0.0,  # Could be fetched separately
                        "message": "Sentiment data fetched from sentiment agent",
                    }
        except requests.RequestException:
            # If sentiment agent is not available, return neutral values
            pass

        # Fallback: return neutral sentiment if agent unavailable
        return {
            "success": True,
            "sentiment_balance": 0.0,
            "social_volume": 0,
            "social_dominance": 0.0,
            "message": "Sentiment agent unavailable, using neutral values",
        }
    except Exception as e:
        return {
            "success": True,  # Don't fail trading analysis if sentiment fails
            "sentiment_balance": 0.0,
            "social_volume": 0,
            "social_dominance": 0.0,
            "message": f"Sentiment data unavailable: {str(e)}",
        }
