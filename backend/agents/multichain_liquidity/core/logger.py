"""
Logging utilities for Multichain Liquidity Agent.

Provides structured logging for requests and responses.
"""

import json
import logging
from datetime import datetime
from typing import Any, Optional

# Configure logger
logger = logging.getLogger("multichain_liquidity")
logger.setLevel(logging.INFO)

# Create console handler if not exists
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)


def log_request(
    method: str,
    path: str,
    headers: dict[str, Any] | None = None,
    body: Any | None = None,
) -> None:
    """
    Log incoming request to multichain liquidity agent.

    Args:
        method: HTTP method
        path: Request path
        headers: Request headers (optional)
        body: Request body (optional)
    """
    logger.info("=" * 80)
    logger.info("📥 INCOMING REQUEST (Multichain Liquidity Agent)")
    logger.info(f"   Method: {method}")
    logger.info(f"   Path: {path}")
    logger.info(f"   Timestamp: {datetime.now().isoformat()}")

    if headers:
        logger.info(f"   Headers: {json.dumps(dict(headers), indent=2)}")
        # Specifically log X-PAYMENT header if present
        x_payment = headers.get("X-PAYMENT") or headers.get("x-payment")
        if x_payment:
            logger.info(f"   💰 X-PAYMENT Header: {x_payment}")

    if body:
        try:
            if isinstance(body, bytes):
                body_str = body.decode("utf-8")
            elif isinstance(body, str):
                body_str = body
            else:
                body_str = json.dumps(body, indent=2)

            # Try to parse as JSON for pretty printing
            try:
                body_json = json.loads(body_str)
                body_str_formatted = json.dumps(body_json, indent=2)
                if len(body_str_formatted) > 2000:
                    logger.info(f"   Body (JSON - truncated):\n{body_str_formatted[:2000]}...")
                    logger.info(f"   Body length: {len(body_str_formatted)} characters")
                else:
                    logger.info(f"   Body (JSON):\n{body_str_formatted}")
            except json.JSONDecodeError:
                if len(body_str) > 1000:
                    logger.info(f"   Body (Raw - truncated): {body_str[:1000]}...")
                    logger.info(f"   Body length: {len(body_str)} characters")
                else:
                    logger.info(f"   Body (Raw): {body_str}")
        except Exception as e:
            logger.warning(f"   Error parsing body: {e}")
            logger.info(f"   Body (Raw): {str(body)[:500]}")

    logger.info("=" * 80)


def log_response(
    status_code: int,
    headers: dict[str, Any] | None = None,
    body: Any | None = None,
    response_time_ms: float | None = None,
) -> None:
    """
    Log outgoing response from multichain liquidity agent.

    Args:
        status_code: HTTP status code
        headers: Response headers (optional)
        body: Response body (optional)
        response_time_ms: Response time in milliseconds (optional)
    """
    logger.info("=" * 80)
    logger.info("📤 OUTGOING RESPONSE (Multichain Liquidity Agent)")
    logger.info(f"   Status Code: {status_code}")
    logger.info(f"   Timestamp: {datetime.now().isoformat()}")

    if response_time_ms is not None:
        logger.info(f"   Response Time: {response_time_ms:.2f}ms")

    if headers:
        logger.info(f"   Headers: {json.dumps(dict(headers), indent=2)}")

    if body:
        try:
            if isinstance(body, bytes):
                body_str = body.decode("utf-8")
            elif isinstance(body, str):
                body_str = body
            else:
                body_str = json.dumps(body, indent=2)

            # Try to parse as JSON for pretty printing
            try:
                body_json = json.loads(body_str)
                body_str_formatted = json.dumps(body_json, indent=2)
                if len(body_str_formatted) > 2000:
                    logger.info(f"   Body (JSON - truncated):\n{body_str_formatted[:2000]}...")
                    logger.info(f"   Body length: {len(body_str_formatted)} characters")
                else:
                    logger.info(f"   Body (JSON):\n{body_str_formatted}")
            except json.JSONDecodeError:
                if len(body_str) > 1000:
                    logger.info(f"   Body (Raw - truncated): {body_str[:1000]}...")
                    logger.info(f"   Body length: {len(body_str)} characters")
                else:
                    logger.info(f"   Body (Raw): {body_str}")
        except Exception as e:
            logger.warning(f"   Error parsing body: {e}")
            body_preview = str(body)[:500]
            logger.info(f"   Body (Raw): {body_preview}")

    logger.info("=" * 80)


def log_agent_message(message: str, direction: str = "processing") -> None:
    """
    Log agent processing message.

    Args:
        message: Message to log
        direction: Direction indicator (processing, received, sent)
    """
    emoji = {
        "processing": "🔄",
        "received": "📨",
        "sent": "📤",
    }.get(direction, "ℹ️")

    logger.info(f"{emoji} {message}")


def log_error(error: Exception, context: str | None = None) -> None:
    """
    Log error with context.

    Args:
        error: Exception that occurred
        context: Additional context (optional)
    """
    logger.error("=" * 80)
    logger.error("❌ ERROR (Multichain Liquidity Agent)")
    if context:
        logger.error(f"   Context: {context}")
    logger.error(f"   Error Type: {type(error).__name__}")
    logger.error(f"   Error Message: {str(error)}")
    logger.error("=" * 80)
