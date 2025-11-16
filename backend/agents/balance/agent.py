"""
Balance Agent Definition

Defines the root_agent (SequentialAgent) that handles balance queries using ADK SequentialAgent.
Uses SequentialAgent pipeline: Token Extraction -> Balance Extraction -> Balance Execution

REQUEST FORMAT:
The agent receives a user query string that may contain:
- Account addresses (Hedera format: 0.0.123456 or EVM format: 0x...)
- Blockchain network names (e.g., "Ethereum", "Polygon", "Hedera", "all chains")
- Token symbols (e.g., "USDT", "USDC", "HBAR", "ETH", "MATIC")
- Requests for "all balances" or "popular tokens"

Example Requests:
- "Get balance for 0.0.123456 on Hedera"
- "Get USDT balance for 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb on Ethereum"
- "Get all balances for 0x46f3da7d7811bb339cea36bb7199361a543de22f" (no chain = all chains)
- "Get USDC balance" (requires address)
- "Get popular tokens"
- "Show me HBAR balance for account 0.0.456789"
- "Get all token balances for 0x1234567890123456789012345678901234567890 on Polygon"

EXECUTION FLOW:
1. Token Extraction Agent runs first:
   - Extracts token information (symbols, addresses, networks)
   - Stores result in session.state['token_data']
   - Returns structured token data organized by network

2. Balance Extraction Agent runs second:
   - Uses token_data from previous agent
   - Extracts account address and chain information
   - Optionally calls balance tools directly (get_balance_hedera, get_balance_ethereum, etc.)
   - Stores result in session.state['balance_data']

RESPONSE FORMAT:
The SequentialAgent orchestrates the two sub-agents and stores their outputs in session state.
The final response is processed by the BalanceExecutor which can return:

1. TOOL RESPONSE (when balance agent called tools directly):
{
  "type": "balance",
  "chain": "hedera" | "ethereum" | "polygon" | "all",
  "account_address": "0.0.123456" | "0x...",
  "balances": [
    {
      "token_type": "native",
      "token_symbol": "HBAR",
      "token_address": "0.0.0",
      "balance": "103.43977453",
      "balance_raw": "10343977453",
      "decimals": 8
    },
    {
      "token_type": "token",
      "token_symbol": "USDC",
      "token_address": "0.0.1055472",
      "balance": "1000.0",
      "balance_raw": "1000000000",
      "decimals": 6
    }
  ],
  "total_usd_value": "$0.00"
}

For "all" chains, returns:
{
  "type": "balance_summary",
  "account_address": "0x...",
  "token_address": "USDC" | null,
  "chains": {
    "hedera": {
      "type": "balance",
      "chain": "hedera",
      "account_address": "0.0.123456",
      "balances": [...],
      "total_usd_value": "$0.00"
    },
    "ethereum": {...},
    "polygon": {...}
  },
  "total_usd_value": "$0.00"
}

2. EXTRACTION RESPONSE (when balance agent only extracted parameters):
{
  "account_address": "0.0.123456" | "0x..." | null,
  "token_symbol": "USDT" | null,
  "chain": "ethereum" | "polygon" | "hedera" | "all" | "unknown",
  "query_type": "popular_tokens" | "all_chains_token" | "specific_token_chain" | "standard_balance",
  "requires_address": true | false,
  "address_error": null | "error message if address is invalid/required"
}

SESSION STATE:
After execution, the session contains:
- session.state['token_data']: Token information from Token Extraction Agent
  - Contains networks, tokens, addresses organized by blockchain
- session.state['balance_data']: Balance data from Balance Extraction Agent
  - Either tool response (complete balance data) or extraction response (parameters)

The BalanceExecutor reads these session state values to build the final response.
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
