"""
Balance Agent Definition

Defines the BalanceAgent class that handles balance queries using direct tool calls.
"""

from .tools import (
    get_balance_ethereum,
    get_balance_polygon,
    get_balance_hedera,
    get_balance_all_chains,
)
from .core.constants import (
    DEFAULT_USER_ID,
    ERROR_VALIDATION_FAILED,
)
from .services.query_parser import extract_account_address, parse_chain
from .services.response_builder import build_balance_response
from .core.response_validator import (
    validate_and_serialize_response,
    log_response_info,
    validate_json,
    build_error_response,
)


class BalanceAgent:
    """Agent that retrieves account balance information from blockchain chains using direct tool calls."""

    async def invoke(self, query: str, session_id: str) -> str:
        """Invoke the agent with a query."""
        print(f"🔍 Balance Agent received query: {query}")
        account_address = extract_account_address(query)
        chain = parse_chain(query, account_address)
        balance_data = build_balance_response(chain, account_address)
        try:
            response = validate_and_serialize_response(balance_data)
            log_response_info(account_address, chain, response)
            validate_json(response)
            return response
        except Exception as e:
            print(f"❌ Validation error: {e}")
            import traceback
            traceback.print_exc()
            error_msg = f"{ERROR_VALIDATION_FAILED}: {str(e)}"
            return build_error_response(chain, account_address, error_msg)

