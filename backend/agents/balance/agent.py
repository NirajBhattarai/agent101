"""
Balance Agent Definition

Defines the BalanceAgent class that handles balance queries using direct tool calls.
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
from .services.query_parser import parse_query_intent
from .services.response_builder import (
    build_all_chains_token_response,
    build_balance_response,
    build_popular_tokens_response,
    build_token_balance_response,
)


class BalanceAgent:
    """Agent that retrieves account balance information from blockchain chains using direct tool calls."""

    async def invoke(self, query: str, session_id: str) -> str:
        """
        Invoke the agent with a query.

        Supports:
        - Specific token on specific chain: "get USDT on Ethereum"
        - Token across all chains: "get USDT balance"
        - Popular tokens: "get popular tokens"
        - Standard balance queries: "get balance on Polygon"
        """
        print(f"🔍 Balance Agent received query: {query}")

        try:
            # Parse query intent
            intent = parse_query_intent(query)
            account_address = intent["account_address"]
            chain = intent["chain"]
            token_symbol = intent.get("token_symbol")
            is_popular_tokens = intent.get("is_popular_tokens", False)
            is_all_chains_token = intent.get("is_all_chains_token", False)

            # Handle popular tokens query
            if is_popular_tokens:
                print("📊 Fetching popular tokens balances...")
                balance_data = build_popular_tokens_response(account_address)
            # Handle token across all chains
            elif is_all_chains_token and token_symbol:
                print(f"🌐 Fetching {token_symbol} balance across all chains...")
                balance_data = build_all_chains_token_response(account_address, token_symbol)
            # Handle specific token on specific chain
            elif token_symbol and chain != "all":
                print(f"🔍 Fetching {token_symbol} balance on {chain}...")
                balance_data = build_token_balance_response(chain, account_address, token_symbol)
            # Handle standard balance query
            else:
                balance_data = build_balance_response(chain, account_address, token_symbol)

            response = validate_and_serialize_response(balance_data)
            log_response_info(account_address, chain, response)
            validate_json(response)
            return response
        except Exception as e:
            print(f"❌ Validation error: {e}")
            import traceback

            traceback.print_exc()
            error_msg = f"{ERROR_VALIDATION_FAILED}: {str(e)}"
            intent = parse_query_intent(query)
            return build_error_response(intent["chain"], intent["account_address"], error_msg)
