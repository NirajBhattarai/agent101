"""
Sentiment Agent Server (A2A Protocol)

Starts the Sentiment Agent as an A2A Protocol server.
"""

import os

import uvicorn
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill

from .executor import SentimentExecutor

# Railway uses PORT env var, fallback to SENTIMENT_PORT or default
port = int(os.getenv("PORT", os.getenv("SENTIMENT_PORT", 10000)))

skill = AgentSkill(
    id="sentiment_agent",
    name="Cryptocurrency Sentiment Analysis Agent",
    description="Provides cryptocurrency sentiment analysis using Santiment API, including sentiment balance, social volume, social dominance, trending words, social shifts, price data (USD/BTC), trading volume, transaction volume, and active addresses",
    tags=["sentiment", "crypto", "social", "analysis", "santiment", "price", "volume", "on-chain"],
    examples=[
        "Get sentiment balance for Bitcoin over the last week",
        "How many times has Ethereum been mentioned on social media in the past 5 days?",
        "Tell me if there's been a big change in Bitcoin's social volume recently, with a 30% threshold",
        "What are the top 3 trending words in crypto over the past 3 days?",
        "How dominant is Ethereum in social media discussions this week?",
        "Get Bitcoin price in USD for the last 7 days",
        "What's Ethereum's trading volume in USD over the past week?",
        "Show me Bitcoin's active addresses for the last 30 days",
        "Get transaction volume for Ethereum over the past 7 days",
    ],
)

cardUrl = os.getenv("RENDER_EXTERNAL_URL", f"http://localhost:{port}")
public_agent_card = AgentCard(
    name="Sentiment Agent",
    description="Agent that provides cryptocurrency sentiment analysis, price data, volume metrics, and on-chain data using Santiment API (includes free metrics)",
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
        agent_executor=SentimentExecutor(),
        task_store=InMemoryTaskStore(),
    )

    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=request_handler,
        extended_agent_card=public_agent_card,
    )

    print(f"📊 Starting Sentiment Agent (A2A) on http://0.0.0.0:{port}")
    print(f"   Agent: {public_agent_card.name}")
    print(f"   Description: {public_agent_card.description}")
    uvicorn.run(server.build(), host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
