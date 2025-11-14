"""
Sentiment Agent Definition

Defines the SentimentAgent class that handles sentiment analysis queries.
"""

from .core.constants import (
    ERROR_VALIDATION_FAILED,
)
from .core.response_validator import (
    build_error_response,
    log_response_info,
    validate_and_serialize_response,
    validate_json,
)
from .services.query_parser import (
    parse_sentiment_query,
    parse_social_dominance_query,
    parse_social_shift_query,
    parse_social_volume_query,
    parse_trending_words_query,
)
from .services.response_builder import (
    build_active_addresses_response,
    build_price_response,
    build_sentiment_balance_response,
    build_social_dominance_response,
    build_social_shift_response,
    build_social_volume_response,
    build_trending_words_response,
    build_volume_response,
)
from .tools.santiment import (
    alert_social_shift,
    get_active_addresses,
    get_price_btc,
    get_price_usd,
    get_sentiment_balance,
    get_social_dominance,
    get_social_volume,
    get_transaction_volume,
    get_trending_words,
    get_volume_btc,
    get_volume_usd,
)


class SentimentAgent:
    """Agent that provides cryptocurrency sentiment analysis using Santiment API."""

    async def invoke(self, query: str, session_id: str) -> str:
        """Invoke the agent with a query."""
        print(f"🔍 Sentiment Agent received query: {query}")
        query_lower = query.lower()

        try:
            # Determine which metric to fetch based on query
            if "trending" in query_lower or "trending words" in query_lower:
                days, top_n = parse_trending_words_query(query)
                result = get_trending_words(days, top_n)
                response = build_trending_words_response(days, top_n, result)

            elif "social shift" in query_lower or "spike" in query_lower or "drop" in query_lower:
                asset, threshold, days = parse_social_shift_query(query)
                result = alert_social_shift(asset, threshold, days)
                response = build_social_shift_response(asset, threshold, days, result)

            elif "social dominance" in query_lower or "dominance" in query_lower:
                asset, days = parse_social_dominance_query(query)
                result = get_social_dominance(asset, days)
                response = build_social_dominance_response(asset, days, result)

            elif "social volume" in query_lower or "mentions" in query_lower:
                asset, days = parse_social_volume_query(query)
                result = get_social_volume(asset, days)
                response = build_social_volume_response(asset, days, result)

            elif "sentiment" in query_lower or "sentiment balance" in query_lower:
                asset, days = parse_sentiment_query(query)
                result = get_sentiment_balance(asset, days)
                response = build_sentiment_balance_response(asset, days, result)

            elif "price" in query_lower and "btc" in query_lower:
                asset, days = parse_sentiment_query(query)
                result = get_price_btc(asset, days)
                response = build_price_response("price_btc", asset, days, result)

            elif "price" in query_lower or "usd price" in query_lower:
                asset, days = parse_sentiment_query(query)
                result = get_price_usd(asset, days)
                response = build_price_response("price_usd", asset, days, result)

            elif (
                "volume" in query_lower
                and "btc" in query_lower
                and "transaction" not in query_lower
            ):
                asset, days = parse_sentiment_query(query)
                result = get_volume_btc(asset, days)
                response = build_volume_response("volume_btc", asset, days, result)

            elif "volume" in query_lower and "transaction" in query_lower:
                asset, days = parse_sentiment_query(query)
                result = get_transaction_volume(asset, days)
                response = build_volume_response("transaction_volume", asset, days, result)

            elif "volume" in query_lower or "trading volume" in query_lower:
                asset, days = parse_sentiment_query(query)
                result = get_volume_usd(asset, days)
                response = build_volume_response("volume_usd", asset, days, result)

            elif "active addresses" in query_lower or "active address" in query_lower:
                asset, days = parse_sentiment_query(query)
                result = get_active_addresses(asset, days)
                response = build_active_addresses_response(asset, days, result)

            else:
                # Default to sentiment balance if unclear
                asset, days = parse_sentiment_query(query)
                result = get_sentiment_balance(asset, days)
                response = build_sentiment_balance_response(asset, days, result)

            validated_response = validate_and_serialize_response(response)
            log_response_info(query, validated_response)
            validate_json(validated_response)
            return validated_response

        except Exception as e:
            print(f"❌ Error in sentiment agent: {e}")
            import traceback

            traceback.print_exc()
            error_msg = f"{ERROR_VALIDATION_FAILED}: {str(e)}"
            return build_error_response("unknown", error_msg)
