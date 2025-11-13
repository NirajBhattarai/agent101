import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { A2AMiddlewareAgent } from "@ag-ui/a2a-middleware";

export async function POST(request: NextRequest) {
  // Define A2A agent URLs
  const multichainLiquidityAgentUrl =
    process.env.MULTICHAIN_LIQUIDITY_AGENT_URL || "http://localhost:9998";
  const orchestratorUrl = process.env.ORCHESTRATOR_URL || "http://localhost:9000";

  // Wrap orchestrator with HttpAgent (AG-UI client)
  const orchestrationAgent = new HttpAgent({ url: orchestratorUrl });

  // Create A2A Middleware Agent
  const a2aMiddlewareAgent = new A2AMiddlewareAgent({
    description:
      "DeFi orchestrator with multi-chain liquidity agent (Hedera, Polygon, Ethereum)",
    agentUrls: [
      multichainLiquidityAgentUrl, // Multi-Chain Liquidity Agent (ADK) - Port 9998
    ],
    orchestrationAgent,
    instructions: `
      You are a DeFi orchestrator that coordinates specialized agents to fetch liquidity information across chains (Hedera, Polygon, Ethereum).

      AVAILABLE SPECIALIZED AGENTS:

      1. **Multi-Chain Liquidity Agent** (ADK)
         - Retrieves liquidity pool information from multiple blockchain chains (Ethereum, Polygon, Hedera) using parallel execution
         - Queries Uniswap V3 pools on Ethereum and Polygon, and SaucerSwap pools on Hedera
         - Supports multiple fee tiers (500, 3000, 10000 basis points)
         - Returns pool addresses, liquidity amounts, current prices, and tick information
         - Format: "Get liquidity for token pair [token_a] and [token_b] on [chain]" or "Get liquidity for [token_pair]"
         - Example queries: 
           * "Get liquidity for token pair 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 and 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 on all chains"
           * "Get liquidity for HBAR/USDC"
           * "Check liquidity for 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 and 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270 on Polygon"

      WORKFLOW:
      1. When user requests liquidity information:
         - Extract token addresses or token pair from the user's message
         - Call Multi-Chain Liquidity Agent with the query
         - Present the liquidity information in a clear, organized format

      CRITICAL RULES:
      - Call agents ONE AT A TIME - never make multiple tool calls simultaneously
      - After making a tool call, WAIT for the result before making the next call
      - If an agent call succeeds, DO NOT call it again
      - If an agent call fails, present the error to the user and stop
      - Maximum ONE call per agent per user request
    `,
  });

  const runtime = new CopilotRuntime({
    agents: { a2a_chat: a2aMiddlewareAgent as any },
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  });

  return handleRequest(request);
}

