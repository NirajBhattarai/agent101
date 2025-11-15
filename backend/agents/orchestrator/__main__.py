"""
Orchestrator Agent Server (ADK + AG-UI Protocol)

Starts the Orchestrator Agent as an AG-UI Protocol server.
"""

import os

import uvicorn
from fastapi import FastAPI

try:
    from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint  # noqa: E402
except ImportError:
    print(
        "⚠️  Warning: ag_ui_adk not installed. Install with: uv pip install ag-ui-adk or make backend-install"
    )
    add_adk_fastapi_endpoint = None
    ADKAgent = None

from .agent import build_adk_orchestrator_agent  # noqa: E402
from .core.constants import DEFAULT_PORT  # noqa: E402


def create_app() -> FastAPI:
    """Create FastAPI application with orchestrator agent."""
    if add_adk_fastapi_endpoint is None:
        raise ImportError(
            "ag_ui_adk is required. Install with: uv pip install ag-ui-adk or make backend-install"
        )

    app = FastAPI(title="DeFi Orchestrator (ADK)")
    adk_orchestrator_agent = build_adk_orchestrator_agent()
    add_adk_fastapi_endpoint(app, adk_orchestrator_agent, path="/")
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
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
