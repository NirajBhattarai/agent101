"""Log message tool."""

def log_message(message: str) -> dict:
    """Utility tool: simple logger to satisfy potential LLM tool calls."""
    print(message)
    return {"type": "log", "message": message}

