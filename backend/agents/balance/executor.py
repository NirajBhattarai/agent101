"""
Balance Executor (A2A Protocol)

Handles execution of balance agent requests through A2A Protocol.
"""

# Standard library imports
import json
import traceback

# A2A Protocol imports
from a2a.server.agent_execution import AgentExecutor, RequestContext  # noqa: E402
from a2a.server.events import EventQueue  # noqa: E402
from a2a.utils import new_agent_text_message  # noqa: E402

# Google ADK imports
from google.adk.runners import InMemoryRunner  # noqa: E402
from google.genai import types  # noqa: E402

# Local imports
from .agent import root_agent  # noqa: E402
from .balance_extractor_agent import parse_balance_response
from .core.constants import (
    CHAIN_UNKNOWN,
    DEFAULT_SESSION_ID,
    DEFAULT_TOTAL_USD_VALUE,
    ERROR_ACCOUNT_ADDRESS_REQUIRED,
    ERROR_CANCEL_NOT_SUPPORTED,
    ERROR_EXECUTION_ERROR,
    ERROR_INVALID_ACCOUNT_ADDRESS,
    RESPONSE_TYPE,
)
from .core.response_validator import (
    build_error_response,
    log_response_info,
    validate_and_serialize_response,
)
from .services.executor_validator import (  # noqa: E402
    log_sending_response,
    validate_response_content,
)
from .services.response_builder import (
    build_all_chains_response,
    build_all_chains_token_response,
    build_popular_tokens_response,
)


def _get_session_id(context: RequestContext) -> str:
    """Extract session ID from context."""
    return getattr(context, "context_id", DEFAULT_SESSION_ID)


def _build_execution_error_response(error: Exception) -> str:
    """Build response for execution error."""
    return json.dumps(
        {
            "type": RESPONSE_TYPE,
            "chain": CHAIN_UNKNOWN,
            "account_address": "unknown",
            "balances": [],
            "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
            "error": f"{ERROR_EXECUTION_ERROR}: {str(error)}",
        },
        indent=2,
    )


class BalanceExecutor(AgentExecutor):
    """
    Executor for Balance Agent using A2A Protocol.

    Uses root_agent (SequentialAgent) which implements ADK SequentialAgent pipeline:
    1. Token Extraction Agent - Extracts token information (symbols, addresses, networks)
    2. Balance Extraction Agent - Extracts account addresses and prepares balance queries
    3. Executes balance fetching and returns response
    """

    def __init__(self):
        self.agent = root_agent  # SequentialAgent with token and balance extraction

    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        """Execute the balance agent request."""
        # Log context details to debug request structure
        print("🔍 Balance Executor - Context details:")
        print(f"   Context type: {type(context)}")
        print(f"   Context attributes: {dir(context)}")
        if hasattr(context, "request"):
            print("   Has request attribute: True")
            if hasattr(context.request, "params"):
                print(f"   Request params: {context.request.params}")
        query = context.get_user_input()
        print(f"📥 Balance Executor received request query: {query}")
        session_id = _get_session_id(context)
        print(f"   Session ID: {session_id}")
        try:
            # Use Runner to properly execute SequentialAgent
            # Use "agents" as app_name to match what ADK infers from SequentialAgent's module path
            # (SequentialAgent is loaded from google.adk.agents, so ADK expects "agents")
            # This avoids the "App name mismatch" warning
            app_name = "agents"
            runner = InMemoryRunner(
                agent=self.agent,
                app_name=app_name,
            )

            # Create or get the session first
            session = await runner.session_service.get_session(
                app_name=app_name,
                user_id="user",
                session_id=session_id,
            )
            if not session:
                session = await runner.session_service.create_session(
                    app_name=app_name,
                    user_id="user",
                    session_id=session_id,
                )

            # Run the sequential agent with the query
            async for _event in runner.run_async(
                user_id="user",
                session_id=session_id,
                new_message=types.UserContent(parts=[types.Part(text=query)]),
            ):
                # Process events - session state will be updated
                pass

            # Get the updated session to access state
            session = await runner.session_service.get_session(
                app_name=app_name,
                user_id="user",
                session_id=session_id,
            )

            # Get the final response from session state
            # The balance extraction agent stores result in session.state['balance_data']
            balance_data = parse_balance_response(session)

            # Check if agent returned tool response (agent should always call tools)
            if (
                isinstance(balance_data, dict)
                and "type" in balance_data
                and ("balances" in balance_data or "chains" in balance_data)
            ):
                # Format/aggregate the agent's response based on query type
                query_type = balance_data.get("query_type", "standard_balance")
                token_symbol = balance_data.get("token_symbol")
                chain = balance_data.get("chain", "unknown")

                if query_type == "popular_tokens":
                    balance_response = build_popular_tokens_response(balance_data)
                elif query_type == "all_chains_token" and token_symbol:
                    balance_response = build_all_chains_token_response(balance_data, token_symbol)
                elif chain == "all" or balance_data.get("type") == "balance_summary":
                    balance_response = build_all_chains_response(balance_data, token_symbol)
                else:
                    balance_response = balance_data

                # Ensure response is always valid JSON
                content = validate_and_serialize_response(balance_response)

                # Verify it's valid JSON before sending
                try:
                    json.loads(content)
                    print("✅ Response is valid JSON")
                except json.JSONDecodeError as e:
                    print(f"⚠️ Warning: Response validation returned invalid JSON: {e}")
                    content = _build_execution_error_response(
                        Exception(f"Invalid JSON format: {str(e)}")
                    )

                account_address = balance_response.get("account_address", "unknown")
                chain = balance_response.get("chain", "unknown")
                log_response_info(str(account_address), chain, content)
            else:
                # Handle error cases (agent didn't call tools or extraction failed)
                address_error = balance_data.get("address_error")
                error_msg = (
                    ERROR_ACCOUNT_ADDRESS_REQUIRED
                    if address_error and "required" in str(address_error).lower()
                    else ERROR_INVALID_ACCOUNT_ADDRESS
                    if address_error
                    else "Agent did not call tools. Please ensure agent calls balance tools directly."
                )
                chain = balance_data.get("chain", "unknown")
                account_address = balance_data.get("account_address") or "N/A"
                balance_response = build_error_response(chain, str(account_address), error_msg)
                content = validate_and_serialize_response(balance_response)
                log_response_info(str(account_address), chain, content)

            # Ensure content is not empty
            if not content or not content.strip():
                print("⚠️ Warning: Agent returned empty content, using error response")
                content = _build_execution_error_response(Exception("Empty response from agent"))

            validated_content = validate_response_content(content)

            # Final check - ensure it's valid JSON
            try:
                json.loads(validated_content)
            except json.JSONDecodeError as json_error:
                print(f"⚠️ Warning: Response is not valid JSON: {json_error}")
                print(f"   Content: {validated_content[:200]}")
                validated_content = _build_execution_error_response(
                    Exception(f"Invalid JSON response: {str(json_error)}")
                )

            log_sending_response(validated_content)
            await event_queue.enqueue_event(new_agent_text_message(validated_content))
            print("✅ Successfully enqueued response")
        except Exception as e:
            print(f"❌ Error in execute: {e}")
            traceback.print_exc()
            error_response = _build_execution_error_response(e)

            # Ensure error response is valid JSON
            try:
                json.loads(error_response)
            except json.JSONDecodeError:
                # Fallback to simple error response
                error_response = json.dumps(
                    {
                        "type": RESPONSE_TYPE,
                        "chain": CHAIN_UNKNOWN,
                        "account_address": "unknown",
                        "balances": [],
                        "total_usd_value": DEFAULT_TOTAL_USD_VALUE,
                        "error": f"{ERROR_EXECUTION_ERROR}: {str(e)}",
                    },
                    indent=2,
                )

            await event_queue.enqueue_event(new_agent_text_message(error_response))

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        """Cancel execution (not supported)."""
        raise Exception(ERROR_CANCEL_NOT_SUPPORTED)
