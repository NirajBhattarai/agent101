"""
Balance Executor (A2A Protocol)

Handles execution of balance agent requests through A2A Protocol.
"""

import json

# A2A Protocol imports
from a2a.server.agent_execution import AgentExecutor, RequestContext  # noqa: E402
from a2a.server.events import EventQueue  # noqa: E402
from a2a.utils import new_agent_text_message  # noqa: E402

from .core.constants import (
    DEFAULT_SESSION_ID,
    ERROR_EXECUTION_ERROR,
    ERROR_CANCEL_NOT_SUPPORTED,
    RESPONSE_TYPE,
    CHAIN_UNKNOWN,
    DEFAULT_TOTAL_USD_VALUE,
)
from .agent import BalanceAgent  # noqa: E402
from .services.executor_validator import (  # noqa: E402
    validate_response_content,
    log_sending_response,
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
    """Executor for Balance Agent using A2A Protocol."""

    def __init__(self):
        self.agent = BalanceAgent()

    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        """Execute the balance agent request."""
        query = context.get_user_input()
        session_id = _get_session_id(context)
        try:
            content = await self.agent.invoke(query, session_id)
            validated_content = validate_response_content(content)
            log_sending_response(validated_content)
            await event_queue.enqueue_event(new_agent_text_message(validated_content))
            print("✅ Successfully enqueued response")
        except Exception as e:
            print(f"❌ Error in execute: {e}")
            import traceback

            traceback.print_exc()
            error_response = _build_execution_error_response(e)
            await event_queue.enqueue_event(new_agent_text_message(error_response))

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        """Cancel execution (not supported)."""
        raise Exception(ERROR_CANCEL_NOT_SUPPORTED)

