"""
Token Research Agent Executor (A2A Protocol)

Handles execution of token research agent requests through A2A Protocol.
"""

import json

# A2A Protocol imports
from a2a.server.agent_execution import AgentExecutor, RequestContext  # noqa: E402
from a2a.server.events import EventQueue  # noqa: E402
from a2a.utils import new_agent_text_message  # noqa: E402

from .agent import TokenResearchAgent  # noqa: E402
from .core.constants import (  # noqa: E402
    DEFAULT_SESSION_ID,
    ERROR_CANCEL_NOT_SUPPORTED,
    ERROR_EXECUTION_ERROR,
    RESPONSE_TYPE,
)


def _get_session_id(context: RequestContext) -> str:
    """Extract session ID from context."""
    return getattr(context, "context_id", DEFAULT_SESSION_ID)


def _build_execution_error_response(error: Exception) -> str:
    """Build response for execution error."""
    return json.dumps(
        {
            "type": RESPONSE_TYPE,
            "query_type": "search",
            "error": f"{ERROR_EXECUTION_ERROR}: {str(error)}",
        },
        indent=2,
    )


class TokenResearchExecutor(AgentExecutor):
    """Executor for Token Research Agent using A2A Protocol."""

    def __init__(self):
        self.agent = TokenResearchAgent()

    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        """Execute the token research agent request."""
        query = context.get_user_input()
        session_id = _get_session_id(context)
        try:
            content = await self.agent.invoke(query, session_id)

            # Ensure content is not empty
            if not content or not content.strip():
                print("⚠️ Warning: Agent returned empty content, using error response")
                content = _build_execution_error_response(Exception("Empty response from agent"))

            # Final check - ensure it's valid JSON
            try:
                json.loads(content)
            except json.JSONDecodeError as json_error:
                print(f"⚠️ Warning: Response is not valid JSON: {json_error}")
                print(f"   Content: {content[:200]}")
                content = _build_execution_error_response(
                    Exception(f"Invalid JSON response: {str(json_error)}")
                )

            print("📤 Sending token research response")
            await event_queue.enqueue_event(new_agent_text_message(content))
            print("✅ Successfully enqueued response")
        except Exception as e:
            print(f"❌ Error in execute: {e}")
            import traceback

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
                        "query_type": "search",
                        "error": f"{ERROR_EXECUTION_ERROR}: {str(e)}",
                    },
                    indent=2,
                )

            await event_queue.enqueue_event(new_agent_text_message(error_response))

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        """Cancel execution (not supported)."""
        raise Exception(ERROR_CANCEL_NOT_SUPPORTED)
