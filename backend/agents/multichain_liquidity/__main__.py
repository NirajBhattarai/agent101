"""
Multi-Chain Liquidity Agent Server (ADK + A2A Protocol)

Starts the Multi-Chain Liquidity Agent as an A2A Protocol server.
"""

import uvicorn
import os
import warnings
# Suppress deprecation warning for agent.json endpoint (will be fixed in future a2a-server update)
warnings.filterwarnings("ignore", message=".*Deprecated agent card endpoint.*", category=DeprecationWarning)
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill
from .executor import LiquidityExecutor

port = int(os.getenv("LIQUIDITY_PORT", 9998))

skill = AgentSkill(
    id="multichain_liquidity_agent",
    name="MultiChainLiquidityAgent",
    description=(
        "Retrieves liquidity pool information from multiple blockchain chains "
        "(Ethereum, Polygon, Hedera) using parallel execution with ADK. "
        "Queries Uniswap V3 pools on Ethereum and Polygon, and SaucerSwap pools on Hedera. "
        "Supports multiple fee tiers (500, 3000, 10000 basis points) and returns "
        "pool addresses, liquidity amounts, current prices, and tick information."
    ),
    tags=["defi", "liquidity", "blockchain", "multi-chain", "adk", "parallel", "uniswap", "saucerswap"],
    examples=[
        "Get liquidity for token pair 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 and 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 on all chains",
        "Check liquidity for 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 and 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270 on Polygon with fee tier 3000",
        "Get liquidity pools for tokens 0x0000000000000000000000000000000000000000 and 0x0000000000000000000000000000000000000001 on Ethereum and Hedera",
        "Show liquidity for token addresses 0x1234567890123456789012345678901234567890 and 0x0987654321098765432109876543210987654321",
        "Get liquidity for USDC/ETH pair on all chains with 0.3% fee tier",
    ],
)

cardUrl = os.getenv("RENDER_EXTERNAL_URL", f"http://localhost:{port}")
public_agent_card = AgentCard(
    name="MultiChainLiquidityAgent",
    description=(
        "ADK-powered agent that retrieves liquidity pool information from multiple blockchain chains "
        "using parallel execution. Queries Uniswap V3 pools on Ethereum and Polygon mainnets, "
        "and SaucerSwap pools on Hedera testnet. Supports multiple fee tiers and returns comprehensive "
        "liquidity data including pool addresses, liquidity amounts, current prices, and tick information. "
        "All chain queries execute in parallel for optimal performance."
    ),
    url=cardUrl,
    version="1.0.0",
    defaultInputModes=["text"],
    defaultOutputModes=["text"],
    capabilities=AgentCapabilities(streaming=True),
    skills=[skill],
    supportsAuthenticatedExtendedCard=False,
)


def main():
    if not os.getenv("GOOGLE_API_KEY") and not os.getenv("GEMINI_API_KEY"):
        print("⚠️  Warning: No API key found!")
        print("   Set either GOOGLE_API_KEY or GEMINI_API_KEY environment variable")
        print("   Example: export GOOGLE_API_KEY='your-key-here'")
        print("   Get a key from: https://aistudio.google.com/app/apikey")
        print()

    request_handler = DefaultRequestHandler(
        agent_executor=LiquidityExecutor(),
        task_store=InMemoryTaskStore(),
    )

    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=request_handler,
        extended_agent_card=public_agent_card,
    )

    print(f"💧 Starting Multi-Chain Liquidity Agent (ADK + A2A) on http://0.0.0.0:{port}")
    print(f"   Agent: {public_agent_card.name}")
    print(f"   Description: {public_agent_card.description}")
    uvicorn.run(server.build(), host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()

