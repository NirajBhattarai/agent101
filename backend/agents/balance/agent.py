"""
Balance Agent Definition

Defines the root_agent (SequentialAgent) that handles balance queries using ADK SequentialAgent.
Uses SequentialAgent pipeline: Token Extraction -> Balance Extraction -> Balance Execution
"""

from google.adk.agents.sequential_agent import SequentialAgent

from .balance_extractor_agent import balance_extraction_agent
from .token_extractor_agent import token_extraction_agent

balance_sequential_agent = SequentialAgent(
    name="BalanceSequentialAgent",
    sub_agents=[token_extraction_agent, balance_extraction_agent],
    description="Executes a sequence of token extraction and balance extraction.",
    # The agents will run in the order provided: Token Extraction -> Balance Extraction
)

# For ADK tools compatibility, the root agent must be named `root_agent`
root_agent = balance_sequential_agent
