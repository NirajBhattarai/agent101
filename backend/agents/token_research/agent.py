"""
Token Research Agent Definition

Defines the TokenResearchAgent class that handles token discovery and search queries.
"""

from .core.constants import (
    ERROR_INVALID_QUERY,
    ERROR_TOKEN_NOT_FOUND,
)
from .core.response_validator import (
    build_error_response,
    validate_and_serialize_response,
)
from .services.query_parser import parse_token_research_query
from .services.response_builder import (
    build_token_discovery_response,
    build_token_search_response,
)


class TokenResearchAgent:
    """Agent that discovers and searches for tokens across blockchain chains."""

    async def invoke(self, query: str, session_id: str) -> str:
        """
        Invoke the agent with a query.

        Supports:
        - Token search: "find USDT token", "search for WBTC on Polygon"
        - Token discovery: "discover popular tokens", "get trending tokens"
        """
        print(f"🔍 Token Research Agent received query: {query}")

        try:
            # Parse query intent
            intent = parse_token_research_query(query)
            query_type = intent["query_type"]
            token_symbol = intent.get("token_symbol")
            chain = intent.get("chain")

            # Handle token discovery
            if query_type == "discovery":
                print("🔍 Discovering popular tokens...")
                research_data = build_token_discovery_response(limit=5)
            # Handle token search
            elif query_type == "search" and token_symbol:
                print(f"🔍 Searching for token {token_symbol}...")
                research_data = build_token_search_response(token_symbol, chain)
            else:
                # Invalid query
                research_data = build_error_response(
                    ERROR_INVALID_QUERY,
                    "Please specify a token symbol to search or request token discovery",
                )

            response = validate_and_serialize_response(research_data)
            return response
        except Exception as e:
            print(f"❌ Token Research Agent error: {e}")
            import traceback

            traceback.print_exc()
            error_response = build_error_response(
                ERROR_TOKEN_NOT_FOUND,
                f"Error processing token research query: {str(e)}",
            )
            return error_response
