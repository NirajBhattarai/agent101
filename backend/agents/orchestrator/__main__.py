"""
Orchestrator Agent Server (ADK + AG-UI Protocol)

Starts the Orchestrator Agent as an AG-UI Protocol server.

NOTE: You may see "No function call event found for function responses ids" errors in the logs.
These are known non-fatal errors from the ADK framework's background execution handling.
The ADK framework catches and handles these errors internally, and they don't affect functionality.
The errors occur when tool call responses are processed asynchronously and the framework
temporarily can't match response events to their corresponding function call events.
Execution continues normally despite these errors.
"""

import json
import os
import time
import uuid

import uvicorn
from fastapi import FastAPI
from starlette.types import ASGIApp, Message, Receive, Scope, Send

try:
    from ag_ui_adk import add_adk_fastapi_endpoint  # noqa: E402
except ImportError:
    print(
        "⚠️  Warning: ag_ui_adk not installed. Install with: uv pip install ag-ui-adk or make backend-install"
    )
    add_adk_fastapi_endpoint = None
    ADKAgent = None

from .agent import build_adk_orchestrator_agent  # noqa: E402
from .core.constants import DEFAULT_PORT  # noqa: E402
from .core.logger import log_agent_message, log_error, log_request, log_response  # noqa: E402


class PaymentTrackingMiddleware:
    """Middleware to track payment status and inject into request headers."""

    def __init__(self, app: ASGIApp):
        self.app = app
        self.paid_sessions = set()  # Track sessions that have paid
        print("✅ PaymentTrackingMiddleware initialized")

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """ASGI application callable that tracks payment and injects status."""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Extract headers
        headers = dict(scope.get("headers", []))
        path = scope.get("path", "/")
        method = scope.get("method", "UNKNOWN")

        # Skip for non-agent paths
        if path in ["/health", "/agent.json", "/.well-known/agent.json", "/docs", "/openapi.json"]:
            await self.app(scope, receive, send)
            return

        # Check for X-PAYMENT header
        x_payment_header = None
        for key, value in headers.items():
            if key.lower() == b"x-payment":
                x_payment_header = value.decode("utf-8")
                break

        # Extract session ID from request body and capture all messages
        request_body = b""
        captured_messages = []

        async def receive_and_capture() -> Message:
            nonlocal request_body
            message = await receive()
            captured_messages.append(message)
            if message["type"] == "http.request" and "body" in message:
                request_body += message.get("body", b"")
            return message

        # Read all request messages
        while True:
            msg = await receive_and_capture()
            if msg["type"] == "http.request" and not msg.get("more_body", False):
                break
            if msg["type"] == "http.disconnect":
                break

        session_id = None
        if request_body:
            try:
                body_json = json.loads(request_body.decode("utf-8"))
                session_id = (
                    body_json.get("threadId")
                    or body_json.get("session_id")
                    or body_json.get("sessionId")
                )
            except:
                pass

        # Check payment status
        is_valid_payment = (
            x_payment_header and x_payment_header != "testing" and len(x_payment_header) > 10
        )
        is_session_paid = session_id in self.paid_sessions if session_id else False

        print("=" * 80)
        print(f"💰 PAYMENT TRACKING - {method} {path}")
        print(
            f"   Session ID: {session_id[:30] + '...' if session_id and len(session_id) > 30 else session_id or 'None'}"
        )
        print(f"   X-PAYMENT header: {'Present' if x_payment_header else 'Missing'}")
        print(f"   Session paid: {is_session_paid}")
        print(f"   Paid sessions count: {len(self.paid_sessions)}")

        # Mark session as paid if valid payment header is present
        if is_valid_payment and session_id:
            self.paid_sessions.add(session_id)
            print("   ✅ Session marked as PAID")

        # Determine payment status
        payment_status = "paid" if (is_valid_payment or is_session_paid) else "unpaid"
        print(f"   Payment status: {payment_status.upper()}")

        # Modify captured messages to inject payment requirement if unpaid
        if payment_status == "unpaid" and request_body:
            try:
                body_json = json.loads(request_body.decode("utf-8"))

                # Inject a system message BEFORE the user message that instructs payment requirement
                if "messages" in body_json and isinstance(body_json["messages"], list):
                    # Find the system message index
                    system_message_idx = None
                    for i, msg in enumerate(body_json["messages"]):
                        if msg.get("role") == "system":
                            system_message_idx = i
                            break

                    # Modify the system message to include payment requirement at the very top
                    if system_message_idx is not None:
                        system_msg = body_json["messages"][system_message_idx]
                        original_content = system_msg.get("content", "")

                        # Prepend payment requirement to system message - MAKE IT EXTREMELY PROMINENT
                        payment_instruction = """🚨🚨🚨 CRITICAL PAYMENT REQUIREMENT - READ THIS FIRST 🚨🚨🚨

**THIS SESSION HAS NOT PAID YET. YOU MUST REQUEST PAYMENT BEFORE DOING ANYTHING ELSE.**

**MANDATORY FIRST ACTION FOR THIS REQUEST:**
1. IMMEDIATELY call 'gather_payment' tool/action FIRST (before any other tool call)
2. DO NOT call gather_balance_requirements, gather_swap_requirements, or any other tool
3. DO NOT call send_message_to_a2a_agent for any agent
4. ONLY call gather_payment right now
5. Tell the user: "Before I can help you, payment is required. Please complete the payment."

**IF YOU CALL ANY OTHER TOOL BEFORE gather_payment, YOU ARE VIOLATING THE PAYMENT REQUIREMENT.**

**THE USER'S REQUEST CAN WAIT - PAYMENT COMES FIRST.**

After payment is completed, then you can proceed with the user's original request.

================================================================================

"""
                        system_msg["content"] = payment_instruction + original_content
                        body_json["messages"][system_message_idx] = system_msg

                        # ALSO inject a user message that explicitly requires payment
                        # Insert it right after the system message, before the actual user message
                        payment_user_msg = {
                            "id": f"payment-required-{uuid.uuid4().hex[:8]}",
                            "role": "user",
                            "content": "🚨 PAYMENT REQUIRED: Before I can process your request, you must complete payment. Please call gather_payment action now.",
                        }
                        # Insert after system message (index 0 typically)
                        body_json["messages"].insert(1, payment_user_msg)

                        # Log what we injected
                        print("   ✅ Injected PAYMENT REQUIRED into system message")
                        print("   ✅ Injected payment requirement user message")
                        print(f"   System message length: {len(system_msg['content'])} chars")
                        print(f"   Total messages: {len(body_json['messages'])}")
                    else:
                        print("   ⚠️ No system message found in messages array")

                # Rebuild request body with payment requirement
                modified_body = json.dumps(body_json).encode("utf-8")

                # Replace the body in captured messages
                for i, msg in enumerate(captured_messages):
                    if msg["type"] == "http.request":
                        captured_messages[i] = {
                            "type": "http.request",
                            "body": modified_body,
                            "more_body": False,
                        }
                        break

            except Exception as e:
                print(f"   ⚠️ Error injecting payment requirement: {e}")
                import traceback

                traceback.print_exc()

        print("=" * 80)

        # Replay captured messages
        message_index = 0

        async def receive_replay():
            nonlocal message_index
            if message_index < len(captured_messages):
                msg = captured_messages[message_index]
                message_index += 1
                return msg
            # After captured messages, get new ones from original receive
            return await receive()

        await self.app(scope, receive_replay, send)


class LoggingMiddleware:
    """Middleware to log all requests and responses using ASGI protocol."""

    def __init__(self, app: ASGIApp):
        self.app = app
        print("✅ LoggingMiddleware initialized")

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """ASGI application callable."""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.time()
        request_body = b""
        request_body_complete = False

        # Extract method and path from scope for logging
        method = scope.get("method", "UNKNOWN")
        path = scope.get("path", "/")
        headers = dict(scope.get("headers", []))

        print(f"📝 LoggingMiddleware: Processing {method} {path}")

        # Wrap receive to capture request body
        async def receive_wrapper() -> Message:
            nonlocal request_body, request_body_complete
            message = await receive()
            if message["type"] == "http.request":
                if "body" in message:
                    request_body += message.get("body", b"")
                if not message.get("more_body", False):
                    request_body_complete = True
                    # Log request once body is complete
                    try:
                        body_json = (
                            json.loads(request_body.decode("utf-8")) if request_body else None
                        )
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        body_json = (
                            request_body.decode("utf-8", errors="ignore") if request_body else None
                        )

                    log_request(
                        method=method,
                        path=path,
                        headers={k.decode(): v.decode() for k, v in headers.items()}
                        if headers
                        else None,
                        body=body_json,
                    )
            return message

        # Wrap send to capture response
        response_status = None
        response_headers = {}
        response_body = b""
        response_started = False

        async def send_wrapper(message: Message) -> None:
            nonlocal response_status, response_headers, response_body, response_started
            if message["type"] == "http.response.start":
                response_status = message["status"]
                response_headers = {k.decode(): v.decode() for k, v in message.get("headers", [])}
                response_started = True
            elif message["type"] == "http.response.body":
                if "body" in message:
                    response_body += message.get("body", b"")
                if not message.get("more_body", False):
                    # Response complete, log it
                    response_time_ms = (time.time() - start_time) * 1000
                    try:
                        response_body_json = (
                            json.loads(response_body.decode("utf-8")) if response_body else None
                        )
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        response_body_json = (
                            response_body.decode("utf-8", errors="ignore")
                            if response_body
                            else None
                        )

                    log_response(
                        status_code=response_status or 200,
                        headers=response_headers,
                        body=response_body_json,
                        response_time_ms=response_time_ms,
                    )
            await send(message)

        # Process request
        try:
            await self.app(scope, receive_wrapper, send_wrapper)
        except Exception as e:
            # Suppress known ADK background execution errors (non-fatal)
            error_msg = str(e)
            if "No function call event found for function responses ids" in error_msg:
                # This is a known ADK framework issue with background execution
                # The error is caught and handled by ADK, execution continues normally
                # We can safely ignore this error
                pass
            elif "BACKGROUND_EXECUTION_ERROR" in error_msg:
                # Background execution errors are handled by ADK framework
                # They don't affect the actual request processing
                pass
            else:
                # Log other errors normally
                path = scope.get("path", "/")
                log_error(e, context=f"Request to {path}")
                raise


def create_app() -> FastAPI:
    """Create FastAPI application with orchestrator agent."""
    if add_adk_fastapi_endpoint is None:
        raise ImportError(
            "ag_ui_adk is required. Install with: uv pip install ag-ui-adk or make backend-install"
        )

    app = FastAPI(title="DeFi Orchestrator (ADK)")

    adk_orchestrator_agent = build_adk_orchestrator_agent()
    add_adk_fastapi_endpoint(app, adk_orchestrator_agent, path="/")

    # Wrap app with middleware in order: PaymentTracking first, then Logging
    # Payment tracking monitors payment status and injects header for agent
    # Logging logs all requests and responses
    app = LoggingMiddleware(PaymentTrackingMiddleware(app))

    return app


app = create_app()


def main():
    """Main entry point for orchestrator server."""
    if not os.getenv("GOOGLE_API_KEY") and not os.getenv("GEMINI_API_KEY"):
        print("⚠️  Warning: GOOGLE_API_KEY environment variable not set!")
        print("   Set it with: export GOOGLE_API_KEY='your-key-here'")
        print("   Get a key from: https://aistudio.google.com/app/apikey")
        print()

    # Railway uses PORT env var, fallback to ORCHESTRATOR_PORT or DEFAULT_PORT
    port = int(os.getenv("PORT", os.getenv("ORCHESTRATOR_PORT", DEFAULT_PORT)))
    print(f"🚀 Starting Orchestrator Agent (ADK + AG-UI) on http://0.0.0.0:{port}")
    print("   Payment tracking: Active (sessions cleared on restart)")
    log_agent_message(
        "Orchestrator Agent started with payment tracking - All requests require payment on first interaction"
    )
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
