"""
Balance Agent Definition

Defines the BalanceAgent class that handles balance queries using ADK SequentialAgent.
Uses SequentialAgent pipeline: Token Extraction -> Balance Extraction -> Balance Execution
"""

import json
import os
from typing import Any

# Try google.adk imports
from google.adk.agents.sequential_agent import SequentialAgent
from google.adk.sessions.session import Session

from .balance_extractor_agent import balance_extraction_agent, parse_balance_response
from .core.constants import (
    DEFAULT_MODEL,
    ERROR_VALIDATION_FAILED,
    RESPONSE_TYPE,
)
from .core.response_validator import (
    build_error_response,
    log_response_info,
    validate_and_serialize_response,
)
from .services.response_builder import (
    build_all_chains_token_response,
    build_balance_response,
    build_popular_tokens_response,
    build_token_balance_response,
)
from .token_extractor_agent import parse_token_response, token_extraction_agent

# Use the model from constants
GEMINI_MODEL = DEFAULT_MODEL


def _get_gemini_api_key() -> str | None:
    """Get Gemini API key from environment."""
    return os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")


balance_sequential_agent = SequentialAgent(
    name="BalanceSequentialAgent",
    sub_agents=[token_extraction_agent, balance_extraction_agent],
    description="Executes a sequence of token extraction and balance extraction.",
    # The agents will run in the order provided: Token Extraction -> Balance Extraction
)

# For ADK tools compatibility, the root agent must be named `root_agent`
root_agent = balance_sequential_agent


class BalanceAgent:
    """
    Agent that retrieves account balance information using ADK SequentialAgent pipeline.

    Pipeline:
    1. Token Extraction Agent - Extracts token information (symbols, addresses, networks)
    2. Balance Extraction Agent - Extracts account addresses and prepares balance queries
    3. Executes balance fetching and returns response

    Supports:
    - Specific token on specific chain: "get USDT on Ethereum"
    - Token across all chains: "get USDT balance"
    - Popular tokens: "get popular tokens"
    - Standard balance queries: "get balance on Polygon"
    """

    def __init__(self):
        """Initialize the Balance Agent."""
        if balance_sequential_agent is None:
            raise ImportError(
                "ADK SequentialAgent is required. "
                "Install with: uv pip install google-adk or make backend-install"
            )
        self.sequential_agent = balance_sequential_agent

    async def invoke(self, query: str, session_id: str) -> str:
        """
        Invoke the agent with a query using ADK SequentialAgent pipeline.

        Args:
            query: User query string
            session_id: Session ID for tracking

        Returns:
            JSON string with balance response
        """
        print(f"🔍 Balance Agent (SequentialAgent) received query: {query}")

        try:
            api_key = _get_gemini_api_key()
            if not api_key:
                raise ValueError(
                    "GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required"
                )

            # Step 1: Run SequentialAgent pipeline
            print("📋 Running SequentialAgent pipeline...")
            print("   Step 1: Token Extraction Agent")
            print("   Step 2: Balance Extraction Agent")

            # Create a session for the sequential agent
            session = Session(
                id=session_id,
                app_name="balance_agent",
                user_id="user",
            )

            # Run the sequential agent with the user query
            # Use run_async which returns an async generator
            ctx = self.sequential_agent.create_invocation_context(session, query)
            async for _event in self.sequential_agent.run_async(ctx):
                # Process events as they come - the session state will be updated
                pass

            print("   SequentialAgent completed")

            # Step 2: Parse responses from both agents from session state
            # Token data from token extraction agent (stored in session.state['token_data'])
            token_data = parse_token_response(session)
            print(f"   Token data: {json.dumps(token_data, indent=2)}")

            # Balance data from balance extraction agent (stored in session.state['balance_data'])
            balance_data = parse_balance_response(session)
            print(f"   Balance data: {json.dumps(balance_data, indent=2)}")

            # Step 3: Check for errors in validation
            address_error = balance_data.get("address_error")
            if address_error:
                from .core.constants import (
                    ERROR_ACCOUNT_ADDRESS_REQUIRED,
                    ERROR_INVALID_ACCOUNT_ADDRESS,
                )

                error_msg = (
                    ERROR_ACCOUNT_ADDRESS_REQUIRED
                    if "required" in str(address_error).lower()
                    else ERROR_INVALID_ACCOUNT_ADDRESS
                )
                chain = balance_data.get("chain", "unknown")
                account_address = balance_data.get("account_address") or "N/A"
                if account_address is None:
                    account_address = "N/A"
                else:
                    account_address = str(account_address)
                balance_response = build_error_response(
                    chain, account_address, f"{error_msg}: {address_error}"
                )
                response = validate_and_serialize_response(balance_response)
                log_response_info(account_address, chain, response)
                return response

            # Step 4: Get execution parameters
            chain = balance_data.get("chain", "unknown")
            account_address = balance_data.get("account_address")
            if account_address is None:
                account_address = "N/A"
            else:
                account_address = str(account_address)
            token_symbol = balance_data.get("token_symbol")
            query_type = balance_data.get("query_type", "standard_balance")

            # Step 5: Execute the appropriate balance fetching function
            is_popular_tokens = query_type == "popular_tokens"
            is_all_chains_token = query_type == "all_chains_token"
            is_token_specific = query_type == "specific_token_chain"

            if is_popular_tokens:
                print("📊 Fetching popular tokens balances...")
                balance_response = build_popular_tokens_response(account_address)
            elif is_all_chains_token and token_symbol:
                print(f"🌐 Fetching {token_symbol} balance across all chains...")
                balance_response = build_all_chains_token_response(account_address, token_symbol)
            elif is_token_specific and token_symbol and chain != "all":
                print(f"🔍 Fetching {token_symbol} balance on {chain}...")
                balance_response = build_token_balance_response(
                    chain, account_address, token_symbol
                )
            else:
                print(f"💰 Fetching balance on {chain}...")
                balance_response = build_balance_response(chain, account_address, token_symbol)

            # Step 6: Validate and serialize response
            response = validate_and_serialize_response(balance_response)
            log_response_info(account_address or "N/A", chain, response)

            return response

        except Exception as e:
            print(f"❌ Error in Balance Agent: {e}")
            import traceback

            traceback.print_exc()
            error_msg = f"{ERROR_VALIDATION_FAILED}: {str(e)}"
            error_response = build_error_response("unknown", "unknown", error_msg)

            # Ensure it's valid JSON
            try:
                json.loads(error_response)
            except Exception:
                error_response = json.dumps(
                    {
                        "type": RESPONSE_TYPE,
                        "chain": "unknown",
                        "account_address": "unknown",
                        "balances": [],
                        "total_usd_value": "$0.00",
                        "error": error_msg,
                    },
                    indent=2,
                )

            return error_response
