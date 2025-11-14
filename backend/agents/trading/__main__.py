"""
Trading Agent Server (A2A Protocol)

Starts the Trading Agent as an A2A Protocol server.
"""

import os

import uvicorn
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill

from .executor import TradingExecutor

# Railway uses PORT env var, fallback to TRADING_PORT or default
port = int(os.getenv("PORT", os.getenv("TRADING_PORT", 10001)))

skill = AgentSkill(
    id="trading_agent",
    name="Intelligent Trading Recommendation Agent",
    description="Provides buy/sell recommendations for BTC and ETH based on technical analysis, sentiment analysis, and ML predictions",
    tags=["trading", "crypto", "btc", "eth", "buy", "sell", "prediction", "ml"],
    examples=[
        "Should I buy or sell Bitcoin?",
        "What's the trading recommendation for Ethereum?",
        "Should I buy BTC now?",
        "Is it a good time to sell ETH?",
        "Get trading recommendation for Bitcoin",
        "Analyze Ethereum and tell me if I should buy or sell",
    ],
)

cardUrl = os.getenv("RENDER_EXTERNAL_URL", f"http://localhost:{port}")
public_agent_card = AgentCard(
    name="Trading Agent",
    description="Intelligent trading agent that provides buy/sell recommendations for BTC and ETH using technical analysis, sentiment data, and ML predictions",
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
        agent_executor=TradingExecutor(),
        task_store=InMemoryTaskStore(),
    )

    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=request_handler,
        extended_agent_card=public_agent_card,
    )

    print(f"💹 Starting Trading Agent (A2A) on http://0.0.0.0:{port}")
    print(f"   Agent: {public_agent_card.name}")
    print(f"   Description: {public_agent_card.description}")
    print("   Supported assets: BTC, ETH")
    uvicorn.run(server.build(), host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
