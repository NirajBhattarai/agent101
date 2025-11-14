"""
Santiment API integration for sentiment analysis
"""

import os
import re
from datetime import UTC, datetime, timedelta
from typing import Any, Dict, Optional, Tuple

import requests
from dotenv import load_dotenv

load_dotenv()

SANTIMENT_API_KEY = os.getenv("SANTIMENT_API_KEY")
SANTIMENT_API_URL = "https://api.santiment.net/graphql"
HEADERS = {"Authorization": f"Apikey {SANTIMENT_API_KEY}"} if SANTIMENT_API_KEY else {}


def parse_allowed_date_range(error_message: str) -> Optional[Tuple[datetime, datetime]]:
    """Parse allowed date range from Santiment API error message."""
    try:
        # Extract date strings from error message
        # Pattern matches: `from` - 2024-11-14 03:07:34.308430Z or `from` - 2024-11-14 03:07:34Z
        from_match = re.search(
            r"`from`\s*-\s*([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z?)",
            error_message,
        )
        to_match = re.search(
            r"`to`\s*-\s*([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z?)",
            error_message,
        )

        if from_match and to_match:
            from_str = from_match.group(1)
            to_str = to_match.group(1)

            # Parse dates (format: 2024-11-14 03:07:34.308430Z or 2024-11-14 03:07:34Z)
            # Handle both with and without microseconds
            if from_str.endswith("Z"):
                from_str = from_str[:-1] + "+00:00"
            else:
                from_str = from_str + "+00:00"

            if to_str.endswith("Z"):
                to_str = to_str[:-1] + "+00:00"
            else:
                to_str = to_str + "+00:00"

            from_date = datetime.fromisoformat(from_str)
            to_date = datetime.fromisoformat(to_str)

            return (from_date, to_date)
    except Exception as e:
        print(f"Error parsing date range: {e}")
    return None


def adjust_date_range(
    requested_from: datetime,
    requested_to: datetime,
    allowed_from: Optional[datetime] = None,
    allowed_to: Optional[datetime] = None,
) -> Tuple[datetime, datetime]:
    """Adjust date range to fit within subscription limits."""
    # If no limits provided, use requested range
    if allowed_from is None and allowed_to is None:
        return (requested_from, requested_to)

    # Adjust from_date to be within limits
    if allowed_from and requested_from < allowed_from:
        adjusted_from = allowed_from
    else:
        adjusted_from = requested_from

    # Adjust to_date to be within limits
    if allowed_to and requested_to > allowed_to:
        adjusted_to = allowed_to
    else:
        adjusted_to = requested_to

    # Ensure from_date <= to_date
    if adjusted_from > adjusted_to:
        # If adjustment makes range invalid, use allowed range
        if allowed_from and allowed_to:
            return (allowed_from, allowed_to)
        # Otherwise, use a small range around the allowed_to
        if allowed_to:
            return (allowed_to - timedelta(days=1), allowed_to)

    return (adjusted_from, adjusted_to)


def fetch_santiment_data(
    metric: str, asset: str, days: int, retry_with_adjusted_dates: bool = True
) -> Dict[str, Any]:
    """Fetch data from Santiment API for a given metric."""
    if not SANTIMENT_API_KEY:
        raise ValueError("SANTIMENT_API_KEY not found in environment variables")

    now = datetime.now(UTC)
    to_date = now
    from_date = to_date - timedelta(days=days)

    # Try to fetch with requested dates
    query = f"""
    {{
      getMetric(metric: "{metric}") {{
        timeseriesData(
          slug: "{asset}"
          from: "{from_date.isoformat()}"
          to: "{to_date.isoformat()}"
          interval: "1d"
        ) {{
          datetime
          value
        }}
      }}
    }}
    """
    response = requests.post(SANTIMENT_API_URL, json={"query": query}, headers=HEADERS, timeout=30)
    response.raise_for_status()
    result = response.json()

    # Check for errors and try to adjust date range if needed
    if result.get("errors"):
        errors = result.get("errors", [])
        error_message = str(errors[0].get("message", "")) if errors else ""

        # Try to parse allowed date range from error
        if retry_with_adjusted_dates and "allowed interval" in error_message.lower():
            allowed_range = parse_allowed_date_range(error_message)
            if allowed_range:
                allowed_from, allowed_to = allowed_range
                adjusted_from, adjusted_to = adjust_date_range(
                    from_date, to_date, allowed_from, allowed_to
                )

                # Retry with adjusted dates
                query = f"""
                {{
                  getMetric(metric: "{metric}") {{
                    timeseriesData(
                      slug: "{asset}"
                      from: "{adjusted_from.isoformat()}"
                      to: "{adjusted_to.isoformat()}"
                      interval: "1d"
                    ) {{
                      datetime
                      value
                    }}
                  }}
                }}
                """
                response = requests.post(
                    SANTIMENT_API_URL, json={"query": query}, headers=HEADERS, timeout=30
                )
                response.raise_for_status()
                result = response.json()

                # If still errors, raise with helpful message
                if result.get("errors"):
                    adjusted_days = (adjusted_to - adjusted_from).days
                    raise Exception(
                        f"API subscription limits: Can only query data from {allowed_from.date()} to {allowed_to.date()}. "
                        f"Adjusted query to {adjusted_days} days within allowed range. "
                        f"Original error: {error_message}"
                    )
                return result
            else:
                # Couldn't parse date range, raise original error
                raise Exception(f"API error: {errors}")
        else:
            raise Exception(f"API error: {errors}")

    return result


def fetch_trending_words(days: int = 7, retry_with_adjusted_dates: bool = True) -> Dict[str, Any]:
    """Fetch trending words from Santiment API."""
    if not SANTIMENT_API_KEY:
        raise ValueError("SANTIMENT_API_KEY not found in environment variables")

    now = datetime.now(UTC)
    to_date = now
    from_date = to_date - timedelta(days=days)

    query = f"""
    {{
      getTrendingWords(size: 10, from: "{from_date.isoformat()}", to: "{to_date.isoformat()}", interval: "1d") {{
        datetime
        topWords {{
          word
          score
        }}
      }}
    }}
    """
    response = requests.post(SANTIMENT_API_URL, json={"query": query}, headers=HEADERS, timeout=30)
    response.raise_for_status()
    result = response.json()

    # Check for errors and try to adjust date range if needed
    if result.get("errors"):
        errors = result.get("errors", [])
        error_message = str(errors[0].get("message", "")) if errors else ""

        # Try to parse allowed date range from error
        if retry_with_adjusted_dates and "allowed interval" in error_message.lower():
            allowed_range = parse_allowed_date_range(error_message)
            if allowed_range:
                allowed_from, allowed_to = allowed_range
                adjusted_from, adjusted_to = adjust_date_range(
                    from_date, to_date, allowed_from, allowed_to
                )

                # Retry with adjusted dates
                query = f"""
                {{
                  getTrendingWords(size: 10, from: "{adjusted_from.isoformat()}", to: "{adjusted_to.isoformat()}", interval: "1d") {{
                    datetime
                    topWords {{
                      word
                      score
                    }}
                  }}
                }}
                """
                response = requests.post(
                    SANTIMENT_API_URL, json={"query": query}, headers=HEADERS, timeout=30
                )
                response.raise_for_status()
                result = response.json()

                # If still errors, raise with helpful message
                if result.get("errors"):
                    adjusted_days = (adjusted_to - adjusted_from).days
                    raise Exception(
                        f"API subscription limits: Can only query data from {allowed_from.date()} to {allowed_to.date()}. "
                        f"Adjusted query to {adjusted_days} days within allowed range. "
                        f"Original error: {error_message}"
                    )
                return result
            else:
                # Couldn't parse date range, raise original error
                raise Exception(f"API error: {errors}")
        else:
            raise Exception(f"API error: {errors}")

    return result


def get_sentiment_balance(asset: str, days: int = 7) -> Dict[str, Any]:
    """Get sentiment balance for an asset."""
    try:
        data = fetch_santiment_data("sentiment_balance_total", asset, days)
        timeseries = data.get("data", {}).get("getMetric", {}).get("timeseriesData", [])
        if not timeseries:
            return {
                "success": False,
                "error": f"Unable to fetch sentiment data for {asset}. Check subscription limits or asset availability.",
            }
        avg_balance = sum(float(d["value"]) for d in timeseries) / len(timeseries)
        actual_days = len(timeseries)
        return {
            "success": True,
            "asset": asset.capitalize(),
            "days": actual_days,
            "sentiment_balance": round(avg_balance, 1),
            "message": f"{asset.capitalize()}'s sentiment balance over the past {actual_days} days is {avg_balance:.1f}.",
        }
    except Exception as e:
        error_msg = str(e)
        # Check if it's a subscription limit error
        if "subscription limits" in error_msg.lower() or "allowed interval" in error_msg.lower():
            return {
                "success": False,
                "error": f"Subscription limit: {error_msg}. Please check your Santiment API subscription tier or adjust the date range.",
            }
        return {
            "success": False,
            "error": f"Error fetching sentiment balance for {asset}: {error_msg}",
        }


def get_social_volume(asset: str, days: int = 7) -> Dict[str, Any]:
    """Get social volume for an asset."""
    try:
        data = fetch_santiment_data("social_volume_total", asset, days)
        timeseries = data.get("data", {}).get("getMetric", {}).get("timeseriesData", [])
        if not timeseries:
            return {
                "success": False,
                "error": f"Unable to fetch social volume for {asset}. Check subscription limits or asset availability.",
            }
        total_volume = sum(int(d["value"]) for d in timeseries)
        actual_days = len(timeseries)
        return {
            "success": True,
            "asset": asset.capitalize(),
            "days": actual_days,
            "social_volume": total_volume,
            "message": f"{asset.capitalize()}'s social volume over the past {actual_days} days is {total_volume:,} mentions.",
        }
    except Exception as e:
        error_msg = str(e)
        if "subscription limits" in error_msg.lower() or "allowed interval" in error_msg.lower():
            return {
                "success": False,
                "error": f"Subscription limit: {error_msg}. Please check your Santiment API subscription tier or adjust the date range.",
            }
        return {"success": False, "error": f"Error fetching social volume for {asset}: {error_msg}"}


def alert_social_shift(asset: str, threshold: float = 50.0, days: int = 7) -> Dict[str, Any]:
    """Detect significant shifts in social volume."""
    try:
        data = fetch_santiment_data("social_volume_total", asset, days)
        timeseries = data.get("data", {}).get("getMetric", {}).get("timeseriesData", [])

        if not timeseries or len(timeseries) < 2:
            return {
                "success": False,
                "error": f"Unable to detect social volume shift for {asset}, insufficient data.",
            }

        latest_volume = int(timeseries[-1]["value"])
        prev_avg_volume = sum(int(d["value"]) for d in timeseries[:-1]) / (len(timeseries) - 1)
        change_percent = (
            ((latest_volume - prev_avg_volume) / prev_avg_volume) * 100
            if prev_avg_volume > 0
            else 0
        )

        abs_change = abs(change_percent)
        if abs_change >= threshold:
            direction = "spiked" if change_percent > 0 else "dropped"
            return {
                "success": True,
                "asset": asset.capitalize(),
                "shift_detected": True,
                "direction": direction,
                "change_percent": round(abs_change, 1),
                "previous_avg": round(prev_avg_volume, 0),
                "latest_volume": latest_volume,
                "message": f"{asset.capitalize()}'s social volume {direction} by {abs_change:.1f}% in the last 24 hours, from an average of {prev_avg_volume:,.0f} to {latest_volume:,}.",
            }

        return {
            "success": True,
            "asset": asset.capitalize(),
            "shift_detected": False,
            "change_percent": round(change_percent, 1),
            "message": f"No significant shift detected for {asset.capitalize()}, change is {change_percent:.1f}%.",
        }
    except Exception as e:
        error_msg = str(e)
        if "subscription limits" in error_msg.lower() or "allowed interval" in error_msg.lower():
            return {
                "success": False,
                "error": f"Subscription limit: {error_msg}. Please check your Santiment API subscription tier or adjust the date range.",
            }
        return {
            "success": False,
            "error": f"Error detecting social volume shift for {asset}: {error_msg}",
        }


def get_trending_words(days: int = 7, top_n: int = 5) -> Dict[str, Any]:
    """Get trending words in crypto space."""
    try:
        data = fetch_trending_words(days)
        trends = data.get("data", {}).get("getTrendingWords", [])
        if not trends:
            return {
                "success": False,
                "error": "Unable to fetch trending words. Check API subscription limits or connectivity.",
            }

        word_scores = {}
        for day in trends:
            for word_data in day.get("topWords", []):
                word = word_data["word"]
                score = word_data["score"]
                if word in word_scores:
                    word_scores[word] += score
                else:
                    word_scores[word] = score

        if not word_scores:
            return {
                "success": False,
                "error": "No trending words data available for the specified period.",
            }

        top_words = sorted(word_scores.items(), key=lambda x: x[1], reverse=True)[:top_n]
        top_words_list = [word for word, _ in top_words]
        actual_days = len(trends)

        return {
            "success": True,
            "days": actual_days,
            "top_n": top_n,
            "trending_words": top_words_list,
            "message": f"Top {top_n} trending words over the past {actual_days} days: {', '.join(top_words_list)}.",
        }
    except Exception as e:
        error_msg = str(e)
        if "subscription limits" in error_msg.lower() or "allowed interval" in error_msg.lower():
            return {
                "success": False,
                "error": f"Subscription limit: {error_msg}. Please check your Santiment API subscription tier or adjust the date range.",
            }
        return {"success": False, "error": f"Error fetching trending words: {error_msg}"}


def get_social_dominance(asset: str, days: int = 7) -> Dict[str, Any]:
    """Get social dominance for an asset."""
    try:
        data = fetch_santiment_data("social_dominance_total", asset, days)
        timeseries = data.get("data", {}).get("getMetric", {}).get("timeseriesData", [])
        if not timeseries:
            return {
                "success": False,
                "error": f"Unable to fetch social dominance for {asset}. Check subscription limits or asset availability.",
            }
        avg_dominance = sum(float(d["value"]) for d in timeseries) / len(timeseries)
        actual_days = len(timeseries)
        return {
            "success": True,
            "asset": asset.capitalize(),
            "days": actual_days,
            "social_dominance": round(avg_dominance, 1),
            "message": f"{asset.capitalize()}'s social dominance over the past {actual_days} days is {avg_dominance:.1f}%.",
        }
    except Exception as e:
        error_msg = str(e)
        if "subscription limits" in error_msg.lower() or "allowed interval" in error_msg.lower():
            return {
                "success": False,
                "error": f"Subscription limit: {error_msg}. Please check your Santiment API subscription tier or adjust the date range.",
            }
        return {
            "success": False,
            "error": f"Error fetching social dominance for {asset}: {error_msg}",
        }


# Free metrics available without subscription restrictions


def get_price_usd(asset: str, days: int = 7) -> Dict[str, Any]:
    """Get USD price for an asset (free metric)."""
    try:
        data = fetch_santiment_data("price_usd", asset, days)
        timeseries = data.get("data", {}).get("getMetric", {}).get("timeseriesData", [])
        if not timeseries:
            return {"success": False, "error": f"Unable to fetch price data for {asset}."}
        latest_price = float(timeseries[-1]["value"])
        avg_price = sum(float(d["value"]) for d in timeseries) / len(timeseries)
        price_change = (
            ((latest_price - float(timeseries[0]["value"])) / float(timeseries[0]["value"])) * 100
            if float(timeseries[0]["value"]) > 0
            else 0
        )
        actual_days = len(timeseries)
        return {
            "success": True,
            "asset": asset.capitalize(),
            "days": actual_days,
            "current_price": round(latest_price, 2),
            "average_price": round(avg_price, 2),
            "price_change_percent": round(price_change, 2),
            "message": f"{asset.capitalize()}'s current price is ${latest_price:,.2f} USD. Average price over {actual_days} days: ${avg_price:,.2f}. Change: {price_change:+.2f}%.",
        }
    except Exception as e:
        error_msg = str(e)
        return {"success": False, "error": f"Error fetching price for {asset}: {error_msg}"}


def get_price_btc(asset: str, days: int = 7) -> Dict[str, Any]:
    """Get BTC price for an asset (free metric)."""
    try:
        data = fetch_santiment_data("price_btc", asset, days)
        timeseries = data.get("data", {}).get("getMetric", {}).get("timeseriesData", [])
        if not timeseries:
            return {"success": False, "error": f"Unable to fetch BTC price data for {asset}."}
        latest_price = float(timeseries[-1]["value"])
        avg_price = sum(float(d["value"]) for d in timeseries) / len(timeseries)
        price_change = (
            ((latest_price - float(timeseries[0]["value"])) / float(timeseries[0]["value"])) * 100
            if float(timeseries[0]["value"]) > 0
            else 0
        )
        actual_days = len(timeseries)
        return {
            "success": True,
            "asset": asset.capitalize(),
            "days": actual_days,
            "current_price_btc": latest_price,
            "average_price_btc": round(avg_price, 8),
            "price_change_percent": round(price_change, 2),
            "message": f"{asset.capitalize()}'s current price is {latest_price:.8f} BTC. Average price over {actual_days} days: {avg_price:.8f} BTC. Change: {price_change:+.2f}%.",
        }
    except Exception as e:
        error_msg = str(e)
        return {"success": False, "error": f"Error fetching BTC price for {asset}: {error_msg}"}


def get_volume_usd(asset: str, days: int = 7) -> Dict[str, Any]:
    """Get trading volume in USD for an asset (free metric)."""
    try:
        data = fetch_santiment_data("volume_usd", asset, days)
        timeseries = data.get("data", {}).get("getMetric", {}).get("timeseriesData", [])
        if not timeseries:
            return {"success": False, "error": f"Unable to fetch volume data for {asset}."}
        total_volume = sum(float(d["value"]) for d in timeseries)
        avg_volume = total_volume / len(timeseries)
        latest_volume = float(timeseries[-1]["value"])
        actual_days = len(timeseries)
        return {
            "success": True,
            "asset": asset.capitalize(),
            "days": actual_days,
            "total_volume_usd": round(total_volume, 2),
            "average_volume_usd": round(avg_volume, 2),
            "latest_volume_usd": round(latest_volume, 2),
            "message": f"{asset.capitalize()}'s total trading volume over {actual_days} days: ${total_volume:,.2f} USD. Average daily volume: ${avg_volume:,.2f} USD. Latest 24h volume: ${latest_volume:,.2f} USD.",
        }
    except Exception as e:
        error_msg = str(e)
        return {"success": False, "error": f"Error fetching volume for {asset}: {error_msg}"}


def get_volume_btc(asset: str, days: int = 7) -> Dict[str, Any]:
    """Get trading volume in BTC for an asset (free metric)."""
    try:
        data = fetch_santiment_data("volume_btc", asset, days)
        timeseries = data.get("data", {}).get("getMetric", {}).get("timeseriesData", [])
        if not timeseries:
            return {"success": False, "error": f"Unable to fetch BTC volume data for {asset}."}
        total_volume = sum(float(d["value"]) for d in timeseries)
        avg_volume = total_volume / len(timeseries)
        latest_volume = float(timeseries[-1]["value"])
        actual_days = len(timeseries)
        return {
            "success": True,
            "asset": asset.capitalize(),
            "days": actual_days,
            "total_volume_btc": round(total_volume, 8),
            "average_volume_btc": round(avg_volume, 8),
            "latest_volume_btc": round(latest_volume, 8),
            "message": f"{asset.capitalize()}'s total trading volume over {actual_days} days: {total_volume:.8f} BTC. Average daily volume: {avg_volume:.8f} BTC. Latest 24h volume: {latest_volume:.8f} BTC.",
        }
    except Exception as e:
        error_msg = str(e)
        return {"success": False, "error": f"Error fetching BTC volume for {asset}: {error_msg}"}


def get_transaction_volume(asset: str, days: int = 7) -> Dict[str, Any]:
    """Get on-chain transaction volume for an asset (free metric)."""
    try:
        data = fetch_santiment_data("transaction_volume", asset, days)
        timeseries = data.get("data", {}).get("getMetric", {}).get("timeseriesData", [])
        if not timeseries:
            return {
                "success": False,
                "error": f"Unable to fetch transaction volume data for {asset}.",
            }
        total_volume = sum(float(d["value"]) for d in timeseries)
        avg_volume = total_volume / len(timeseries)
        latest_volume = float(timeseries[-1]["value"])
        actual_days = len(timeseries)
        return {
            "success": True,
            "asset": asset.capitalize(),
            "days": actual_days,
            "total_transaction_volume": round(total_volume, 2),
            "average_transaction_volume": round(avg_volume, 2),
            "latest_transaction_volume": round(latest_volume, 2),
            "message": f"{asset.capitalize()}'s total on-chain transaction volume over {actual_days} days: {total_volume:,.2f}. Average daily volume: {avg_volume:,.2f}. Latest 24h volume: {latest_volume:,.2f}.",
        }
    except Exception as e:
        error_msg = str(e)
        return {
            "success": False,
            "error": f"Error fetching transaction volume for {asset}: {error_msg}",
        }


def get_active_addresses(asset: str, days: int = 7) -> Dict[str, Any]:
    """Get number of active addresses for an asset (free metric)."""
    try:
        data = fetch_santiment_data("active_addresses_24h", asset, days)
        timeseries = data.get("data", {}).get("getMetric", {}).get("timeseriesData", [])
        if not timeseries:
            return {
                "success": False,
                "error": f"Unable to fetch active addresses data for {asset}.",
            }
        total_addresses = sum(int(d["value"]) for d in timeseries)
        avg_addresses = total_addresses / len(timeseries)
        latest_addresses = int(timeseries[-1]["value"])
        actual_days = len(timeseries)
        return {
            "success": True,
            "asset": asset.capitalize(),
            "days": actual_days,
            "total_active_addresses": total_addresses,
            "average_active_addresses": round(avg_addresses, 0),
            "latest_active_addresses": latest_addresses,
            "message": f"{asset.capitalize()}'s total active addresses over {actual_days} days: {total_addresses:,}. Average daily active addresses: {avg_addresses:,.0f}. Latest 24h active addresses: {latest_addresses:,}.",
        }
    except Exception as e:
        error_msg = str(e)
        return {
            "success": False,
            "error": f"Error fetching active addresses for {asset}: {error_msg}",
        }
