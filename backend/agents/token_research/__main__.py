"""
Token Research Agent Server (A2A Protocol)

Starts the Token Research Agent as an A2A Protocol server.
"""

import os

import uvicorn
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill

from .executor import TokenResearchExecutor

# Railway uses PORT env var, fallback to TOKEN_RESEARCH_AGENT_PORT or default
port = int(os.getenv("PORT", os.getenv("TOKEN_RESEARCH_AGENT_PORT", 10002)))

skill = AgentSkill(
    id="token_research_agent",
    name="Token Research Agent",
    description="Discovers and searches for tokens across blockchain chains (Ethereum, Polygon, Hedera) using CoinGecko API and web search",
    tags=["defi", "token", "research", "discovery", "blockchain", "multi-chain"],
    examples=[
        "Search for USDT token",
        "Find WBTC on Polygon",
        "Discover popular tokens",
        "Get trending tokens",
        "Find token address for LINK on Ethereum",
    ],
)

cardUrl = os.getenv("RENDER_EXTERNAL_URL", f"http://localhost:{port}")
public_agent_card = AgentCard(
    name="Token Research Agent",
    description="Agent that discovers and searches for tokens across blockchain chains using CoinGecko API and web search",
    url=cardUrl,
    version="1.0.0",
    defaultInputModes=["text"],
    defaultOutputModes=["text"],
    capabilities=AgentCapabilities(streaming=True),
    skills=[skill],
    supportsAuthenticatedExtendedCard=False,
)


def main():
    request_handler = DefaultRequestHandler(
        agent_executor=TokenResearchExecutor(),
        task_store=InMemoryTaskStore(),
    )

    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=request_handler,
        extended_agent_card=public_agent_card,
    )

    print(f"🔍 Starting Token Research Agent (A2A) on http://0.0.0.0:{port}")
    print(f"   Agent: {public_agent_card.name}")
    print(f"   Description: {public_agent_card.description}")
    uvicorn.run(server.build(), host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
