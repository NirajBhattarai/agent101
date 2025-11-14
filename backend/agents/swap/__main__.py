"""
Swap Agent Server (A2A Protocol)

Starts the Swap Agent as an A2A Protocol server.
"""

import os

import uvicorn
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill

from .executor import SwapExecutor

# Railway uses PORT env var, fallback to SWAP_AGENT_PORT or default
port = int(os.getenv("PORT", os.getenv("SWAP_AGENT_PORT", 9999)))

skill = AgentSkill(
    id="swap_agent",
    name="Swap Agent",
    description="Handles token swaps on blockchain chains including Ethereum, Polygon, and Hedera using packages/blockchain",
    tags=["defi", "swap", "blockchain", "multi-chain", "saucerswap", "uniswap"],
    examples=[
        "Swap 0.1 HBAR to USDC on Hedera for account 0.0.123456",
        "Swap 10 USDC to ETH on Ethereum for address 0x1234...",
        "Swap 100 MATIC to USDT on Polygon for address 0xabcd...",
        "Swap 0.5 ETH to USDC on Ethereum with 0.5% slippage",
    ],
)

cardUrl = os.getenv("RENDER_EXTERNAL_URL", f"http://localhost:{port}")
public_agent_card = AgentCard(
    name="Swap Agent",
    description="Agent that handles token swaps on blockchain chains including Ethereum, Polygon, and Hedera",
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
        agent_executor=SwapExecutor(),
        task_store=InMemoryTaskStore(),
    )

    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=request_handler,
        extended_agent_card=public_agent_card,
    )

    print(f"💱 Starting Swap Agent (A2A) on http://0.0.0.0:{port}")
    print(f"   Agent: {public_agent_card.name}")
    print(f"   Description: {public_agent_card.description}")
    uvicorn.run(server.build(), host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
