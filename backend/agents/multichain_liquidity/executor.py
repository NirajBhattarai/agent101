"""
Multi-Chain Liquidity Executor (A2A Protocol)

Handles execution of liquidity agent requests through A2A Protocol.
Uses a single orchestrator agent that decides chains and calls tools directly.
"""

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
from .agents import liquidity_orchestrator_agent  # noqa: E402
from .core.constants import (
    DEFAULT_SESSION_ID,
    ERROR_CANCEL_NOT_SUPPORTED,
    ERROR_EXECUTION_ERROR,
    RESPONSE_TYPE,
)
from .services.executor_validator import (  # noqa: E402
    log_sending_response,
    validate_response_content,
)


def _get_session_id(context: RequestContext) -> str:
    """Extract session ID from context."""
    return getattr(context, "context_id", DEFAULT_SESSION_ID)


def _extract_and_print_x_payment_header(context: RequestContext) -> None:
    """Extract and print X-PAYMENT header value from Hedera payment."""
    # Print request object (from context._params if available)
    print("🔍 Request Object:")
    if hasattr(context, "_params") and context._params:
        print(f"   Request params: {context._params}")
        print(f"   Request params type: {type(context._params)}")
        if hasattr(context._params, "metadata"):
            print(f"   Request params metadata: {context._params.metadata}")

    # Check call_context.state for headers
    x_payment_header = None
    if hasattr(context, "call_context") and context.call_context:
        print(f"🔍 Call Context State: {context.call_context.state}")
        if isinstance(context.call_context.state, dict):
            if "headers" in context.call_context.state:
                headers = context.call_context.state["headers"]
                print(f"   Headers from call_context.state: {headers}")
                if isinstance(headers, dict):
                    x_payment_header = headers.get("X-PAYMENT") or headers.get("x-payment")
            # Also check if X-PAYMENT is directly in state
            x_payment_header = (
                x_payment_header
                or context.call_context.state.get("X-PAYMENT")
                or context.call_context.state.get("x-payment")
            )

    # Check metadata for headers
    if not x_payment_header and hasattr(context, "metadata") and context.metadata:
        if isinstance(context.metadata, dict):
            if "headers" in context.metadata:
                headers = context.metadata["headers"]
                if isinstance(headers, dict):
                    x_payment_header = headers.get("X-PAYMENT") or headers.get("x-payment")
            x_payment_header = (
                x_payment_header
                or context.metadata.get("X-PAYMENT")
                or context.metadata.get("x-payment")
            )

    if x_payment_header:
        print(f"💰 X-PAYMENT Header Value (Hedera): {x_payment_header}")
    else:
        print("⚠️  No X-PAYMENT header found in request")


def _build_execution_error_response(error: Exception) -> str:
    """Build response for execution error."""
    return json.dumps(
        {
            "type": RESPONSE_TYPE,
            "chain": "unknown",
            "token_a": "unknown",
            "token_b": "unknown",
            "results": [],
            "error": f"{ERROR_EXECUTION_ERROR}: {str(error)}",
        },
        indent=2,
    )


class LiquidityExecutor(AgentExecutor):
    """
    Executor for Multi-Chain Liquidity Agent using A2A Protocol.

    Uses a single orchestrator agent that:
    1. Decides which chains to query based on the user request
    2. Resolves token addresses if needed (using resolve_token_for_liquidity tool)
    3. Calls liquidity tools directly (get_ethereum_liquidity, get_polygon_liquidity, get_hedera_liquidity)
    4. Returns a structured JSON response with all results
    """

    def __init__(self):
        # No need to store root_agent since we handle execution manually
        pass

    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        """Execute the liquidity agent request."""
        query = context.get_user_input()
        session_id = _get_session_id(context)

        print("=" * 80)
        print("💧 LIQUIDITY EXECUTOR - INCOMING REQUEST")
        print("=" * 80)
        print(f"   Query: {query}")
        print(f"   Session ID: {session_id}")
        print(
            f"   Timestamp: {context.get_timestamp() if hasattr(context, 'get_timestamp') else 'N/A'}"
        )

        _extract_and_print_x_payment_header(context)
        print()

        try:
            app_name = "agents"

            # Run the orchestrator agent (single agent that decides chains and calls tools)
            print("🎯 Running Liquidity Orchestrator Agent...")
            print("   Agent: LiquidityOrchestratorAgent")
            print(
                "   Purpose: Decide which chains to query, resolve tokens, call liquidity tools, return JSON"
            )

            orchestrator_runner = InMemoryRunner(
                agent=liquidity_orchestrator_agent,
                app_name=app_name,
            )

            # Create session if it doesn't exist
            print(f"   Checking session: {session_id}")
            session = await orchestrator_runner.session_service.get_session(
                app_name=app_name,
                user_id="user",
                session_id=session_id,
            )
            if not session:
                print(f"   Creating new session: {session_id}")
                session = await orchestrator_runner.session_service.create_session(
                    app_name=app_name,
                    user_id="user",
                    session_id=session_id,
                )
                print("   ✅ Session created successfully")
            else:
                print("   ✅ Session found (existing)")

            print(f"   Executing orchestrator with query: {query}")
            print(f"   Query length: {len(query)} characters")
            print(f"   Query preview: {query[:200]}...")

            # Capture agent's JSON response from events and session state
            response_text = ""
            async for event in orchestrator_runner.run_async(
                user_id="user",
                session_id=session_id,
                new_message=types.UserContent(parts=[types.Part(text=query)]),
            ):
                # Capture agent's text response from events
                if hasattr(event, "delta") and event.delta:
                    response_text += str(event.delta)
                elif hasattr(event, "content") and event.content:
                    if isinstance(event.content, str):
                        response_text += event.content
                    elif hasattr(event.content, "text"):
                        response_text += str(event.content.text)
                elif hasattr(event, "text"):
                    response_text += str(event.text)
                elif isinstance(event, str):
                    response_text += event

            # Get session after execution to check for stored response
            session = await orchestrator_runner.session_service.get_session(
                app_name=app_name,
                user_id="user",
                session_id=session_id,
            )

            # Try to get response from session state (output_key)
            liquidity_data = None
            if session and session.state.get("liquidity_response"):
                stored_response = session.state["liquidity_response"]
                if isinstance(stored_response, dict):
                    # If it's already a dict, use it directly
                    liquidity_data = stored_response
                    print("   ✅ Found response in session state (dict)")
                elif isinstance(stored_response, str):
                    response_text = stored_response
                    print("   ✅ Found response in session state (string)")
                else:
                    response_text = str(stored_response)
                    print("   ✅ Found response in session state (converted to string)")

            # Also check session messages for the last agent message
            if not response_text and session and hasattr(session, "messages") and session.messages:
                # Get the last message from the agent
                for message in reversed(session.messages):
                    if hasattr(message, "role") and message.role == "assistant":
                        if hasattr(message, "content"):
                            if isinstance(message.content, str):
                                response_text = message.content
                                break
                            elif hasattr(message.content, "parts"):
                                for part in message.content.parts:
                                    if hasattr(part, "text"):
                                        response_text += part.text
                                    elif isinstance(part, str):
                                        response_text += part
                                if response_text:
                                    break

            print("   ✅ Orchestrator execution completed")
            print(
                f"   Response text length: {len(response_text) if response_text else 0} characters"
            )
            if response_text:
                print(f"   Response text preview: {response_text[:200]}...")

            # Parse the JSON response from the orchestrator
            print()
            print("📦 Parsing JSON Response...")
            liquidity_data = None

            # First, check if we already have parsed data from session state
            if session and session.state.get("liquidity_response"):
                stored_response = session.state["liquidity_response"]
                if isinstance(stored_response, dict):
                    liquidity_data = stored_response
                    print("   ✅ Using response from session state (dict)")

            # If not, try to parse from response_text
            if not liquidity_data and response_text and response_text.strip():
                # Remove markdown code blocks if present
                cleaned_text = response_text.strip()
                if cleaned_text.startswith("```json"):
                    cleaned_text = cleaned_text[7:]
                if cleaned_text.startswith("```"):
                    cleaned_text = cleaned_text[3:]
                if cleaned_text.endswith("```"):
                    cleaned_text = cleaned_text[:-3]
                cleaned_text = cleaned_text.strip()

                try:
                    # Parse as JSON
                    liquidity_data = json.loads(cleaned_text)
                    print("   ✅ Successfully parsed JSON response from text")
                    print(
                        f"   Response keys: {list(liquidity_data.keys()) if isinstance(liquidity_data, dict) else 'N/A'}"
                    )
                    if isinstance(liquidity_data, dict):
                        print(f"   Chain: {liquidity_data.get('chain', 'N/A')}")
                        print(f"   Results count: {len(liquidity_data.get('results', []))}")
                except json.JSONDecodeError as e:
                    print(f"   ⚠️ Warning: Response is not valid JSON: {e}")
                    print(f"   Content preview: {cleaned_text[:200]}")
                    # Try to extract partial data or return error
                    liquidity_data = {
                        "type": RESPONSE_TYPE,
                        "chain": "unknown",
                        "token_a": "unknown",
                        "token_b": "unknown",
                        "results": [],
                        "error": f"Invalid JSON response from agent: {str(e)}",
                    }

            # If still no data, return error
            if not liquidity_data:
                print("   ⚠️ Warning: Orchestrator returned empty output")
                print(
                    f"   Session state keys: {list(session.state.keys()) if session else 'No session'}"
                )
                liquidity_data = {
                    "type": RESPONSE_TYPE,
                    "chain": "unknown",
                    "token_a": "unknown",
                    "token_b": "unknown",
                    "results": [],
                    "error": "Empty response from orchestrator agent",
                }

            # Format the response
            print()
            print("✅ Formatting and Validating Response...")
            if isinstance(liquidity_data, dict):
                # Ensure it has the required structure
                if "type" not in liquidity_data:
                    liquidity_data["type"] = RESPONSE_TYPE
                content = json.dumps(liquidity_data, indent=2)
                print("   ✅ Formatted as JSON from dict")
            else:
                # Convert to JSON if it's already a string
                if isinstance(liquidity_data, str):
                    content = liquidity_data
                    print("   ✅ Using string response as-is")
                else:
                    content = json.dumps(liquidity_data, indent=2)
                    print("   ✅ Converted to JSON string")

            # Ensure content is not empty
            if not content or not content.strip():
                print("   ⚠️ Warning: Agent returned empty content, using error response")
                content = _build_execution_error_response(Exception("Empty response from agent"))

            # Validate JSON (validate_response_content already checks JSON validity)
            print(f"   Content length: {len(content)} characters")
            try:
                validated_content = validate_response_content(content)
                print("   ✅ Content validated")
            except ValueError as validation_error:
                print(f"   ⚠️ Warning: Response validation failed: {validation_error}")
                print(f"   Content preview: {content[:200]}")
                validated_content = _build_execution_error_response(
                    Exception(f"Invalid response: {str(validation_error)}")
                )

            print()
            print("=" * 80)
            print("📤 LIQUIDITY EXECUTOR - OUTGOING RESPONSE")
            print("=" * 80)
            log_sending_response(validated_content)
            await event_queue.enqueue_event(new_agent_text_message(validated_content))
            print("✅ Successfully enqueued response")
            print("=" * 80)
            print()
        except Exception as e:
            print()
            print("=" * 80)
            print("❌ LIQUIDITY EXECUTOR - ERROR")
            print("=" * 80)
            print(f"   Error Type: {type(e).__name__}")
            print(f"   Error Message: {str(e)}")
            print(f"   Session ID: {session_id}")
            print()
            print("   Full Traceback:")
            traceback.print_exc()
            print("=" * 80)
            print()
            error_response = _build_execution_error_response(e)

            # Ensure error response is valid JSON
            try:
                json.loads(error_response)
            except json.JSONDecodeError:
                # Fallback to simple error response
                error_response = json.dumps(
                    {
                        "type": RESPONSE_TYPE,
                        "chain": "unknown",
                        "token_a": "unknown",
                        "token_b": "unknown",
                        "results": [],
                        "error": f"{ERROR_EXECUTION_ERROR}: {str(e)}",
                    },
                    indent=2,
                )

            await event_queue.enqueue_event(new_agent_text_message(error_response))

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        """Cancel execution (not supported)."""
        raise Exception(ERROR_CANCEL_NOT_SUPPORTED)
