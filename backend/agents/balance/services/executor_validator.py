"""Executor validation utilities for balance agent."""


def validate_response_content(content: str) -> str:
    """Validate response content."""
    if not content:
        return '{"type": "balance", "error": "Empty response"}'
    return content


def log_sending_response(content: str) -> None:
    """Log sending response."""
    print(f"📤 Sending balance response (length: {len(content)} chars)")

