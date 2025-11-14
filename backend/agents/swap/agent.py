"""
Swap Agent Definition

Defines the SwapAgent class that handles swap queries using direct tool calls.
"""

from .core.response_validator import (
    build_error_response,
    log_response_info,
    validate_and_serialize_response,
    validate_json,
)
from .services.query_parser import parse_swap_query
from .services.response_builder import (
    build_chain_selection_response,
    build_swap_response,
    execute_swap,
)


class SwapAgent:
    """Agent that handles token swaps on blockchain chains using direct tool calls."""

    async def invoke(self, query: str, session_id: str) -> str:
        """Invoke the agent with a query."""
        print(f"💱 Swap Agent received query: {query}")
        try:
            params = parse_swap_query(query)
            if not params.get("chain_specified"):
                return build_chain_selection_response()
            if not params.get("token_in_symbol"):
                return build_error_response(
                    "token_in_not_found",
                    params.get("chain"),
                    None,
                    params.get("token_out_symbol"),
                )
            if not params.get("token_out_symbol"):
                return build_error_response(
                    "token_out_not_found",
                    params.get("chain"),
                    params.get("token_in_symbol"),
                    None,
                )
            swap_data = execute_swap(
                chain=params["chain"],
                token_in_symbol=params["token_in_symbol"],
                token_out_symbol=params["token_out_symbol"],
                amount_in=params["amount_in"],
                account_address=params.get("account_address"),
                slippage_tolerance=params.get("slippage_tolerance", 0.5),
            )
            response_data = build_swap_response(swap_data)
            response = validate_and_serialize_response(response_data)
            log_response_info(
                params["chain"],
                params["token_in_symbol"],
                params["token_out_symbol"],
                response,
            )
            validate_json(response)
            return response
        except Exception as e:
            print(f"❌ Validation error: {e}")
            import traceback

            traceback.print_exc()
            parsed = parse_swap_query(query)
            return build_error_response("execution_error", parsed.get("chain"), None, None)
