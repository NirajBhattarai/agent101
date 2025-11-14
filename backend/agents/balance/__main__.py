"""
Balance Agent Server (ADK + A2A Protocol)

Starts the Balance Agent as an A2A Protocol server.
"""

import uvicorn
import os
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill
from .executor import BalanceExecutor

port = int(os.getenv("BALANCE_PORT", 9997))

skill = AgentSkill(
    id="balance_agent",
    name="Balance Query Agent",
    description="Retrieves account balance information from multiple blockchain chains (Ethereum, Polygon, Hedera) using packages/blockchain",
    tags=["defi", "balance", "blockchain", "multi-chain"],
    examples=[
        "Get HBAR balance for account 0.0.123456 on Hedera",
        "Check USDC balance for address 0x1234... on Polygon",
        "Get ETH balance for address 0xabcd... on Ethereum",
        "Get all token balances for an account across all chains",
    ],
)

cardUrl = os.getenv("RENDER_EXTERNAL_URL", f"http://localhost:{port}")
public_agent_card = AgentCard(
    name="Balance Agent",
    description="Agent that retrieves account balance information from multiple blockchain chains using packages/blockchain",
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
        agent_executor=BalanceExecutor(),
        task_store=InMemoryTaskStore(),
    )

    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=request_handler,
        extended_agent_card=public_agent_card,
    )

    print(f"💰 Starting Balance Agent (A2A) on http://0.0.0.0:{port}")
    print(f"   Agent: {public_agent_card.name}")
    print(f"   Description: {public_agent_card.description}")
    uvicorn.run(server.build(), host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()

