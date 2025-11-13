"use client";

/**
 * DeFi Chat Component
 *
 * Demonstrates key patterns:
 * - A2A Communication: Visualizes message flow between orchestrator and agents
 * - HITL: Balance requirements form for gathering account information
 * - Multi-Agent: Coordinates balance and liquidity agents via A2A Protocol
 */

import React, { useState, useEffect } from "react";
import { CopilotKit, useCopilotChat, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotAction } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { BalanceRequirementsForm } from "../forms/balance/BalanceRequirementsForm";
import { LiquidityRequirementsForm } from "../forms/liquidity/LiquidityRequirementsForm";
import { LiquidityPaymentForm } from "../forms/liquidity/LiquidityPaymentForm";
import { SwapRequirementsForm } from "../forms/swap/SwapRequirementsForm";
import { BridgeRequirementsForm } from "../forms/bridge/BridgeRequirementsForm";
import { MessageToA2A } from "./a2a/MessageToA2A";
import { MessageFromA2A } from "./a2a/MessageFromA2A";
import type {
  DeFiChatProps,
  BalanceData,
  LiquidityData,
  MultiChainLiquidityData,
  SwapData,
  SwapRouterData,
  PoolCalculatorData,
  MarketInsightsData,
  BridgeData,
  MessageActionRenderProps,
} from "@/types";

const ChatInner = ({
  onBalanceUpdate,
  onLiquidityUpdate,
  onSwapUpdate,
  onSwapRouterUpdate,
  onPoolCalculatorUpdate,
  onMarketInsightsUpdate,
  onBridgeUpdate,
}: DeFiChatProps) => {
  const { visibleMessages } = useCopilotChat();

  // Extract structured data from A2A agent responses
  useEffect(() => {
    const extractDataFromMessages = () => {
      for (const message of visibleMessages) {
        const msg = message as any;

        if (msg.type === "ResultMessage" && msg.actionName === "send_message_to_a2a_agent") {
          try {
            const result = msg.result;
            console.log("📥 Raw A2A result:", typeof result, result?.substring?.(0, 200) || result);
            let parsed;

            if (typeof result === "string") {
              let cleanResult = result;
              if (result.startsWith("A2A Agent Response: ")) {
                cleanResult = result.substring("A2A Agent Response: ".length);
              }

              // Try to parse as JSON directly
              try {
                parsed = JSON.parse(cleanResult);
              } catch (e) {
                // If direct parsing fails, try to extract JSON from the string
                // Strategy: Find the largest valid JSON object in the string
                let found = false;
                let bestMatch = null;
                let bestLength = 0;

                // Find all potential JSON object starts
                for (let i = 0; i < cleanResult.length; i++) {
                  if (cleanResult[i] === "{") {
                    // Try to find the matching closing brace
                    let braceCount = 0;
                    let j = i;
                    while (j < cleanResult.length) {
                      if (cleanResult[j] === "{") braceCount++;
                      if (cleanResult[j] === "}") {
                        braceCount--;
                        if (braceCount === 0) {
                          // Found a complete JSON object
                          const candidate = cleanResult.substring(i, j + 1);
                          try {
                            const candidateParsed = JSON.parse(candidate);
                            // Verify it's a valid structured response with a type field
                            if (
                              candidateParsed &&
                              typeof candidateParsed === "object" &&
                              candidateParsed.type
                            ) {
                              if (candidate.length > bestLength) {
                                bestMatch = candidateParsed;
                                bestLength = candidate.length;
                                found = true;
                              }
                            }
                          } catch (e2) {
                            // Not valid JSON, continue
                          }
                          break;
                        }
                      }
                      j++;
                    }
                  }
                }

                if (found && bestMatch) {
                  parsed = bestMatch;
                  console.log("✅ Extracted JSON with type:", parsed.type, "Length:", bestLength);
                } else {
                  // Try one more time with a simpler approach - look for bridge type specifically
                  const bridgeMatch = cleanResult.match(/type["\s]*:["\s]*"bridge"/i);
                  if (bridgeMatch) {
                    // Try to extract a larger JSON block around the bridge type
                    const startIdx = cleanResult.indexOf("{");
                    const endIdx = cleanResult.lastIndexOf("}");
                    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                      try {
                        const candidate = cleanResult.substring(startIdx, endIdx + 1);
                        parsed = JSON.parse(candidate);
                        console.log("✅ Extracted bridge JSON with fallback method");
                      } catch (e) {
                        console.warn(
                          "No valid JSON found in result string. Raw result:",
                          cleanResult.substring(0, 500),
                        );
                        return; // Skip this message
                      }
                    } else {
                      console.warn(
                        "No valid JSON found in result string. Raw result:",
                        cleanResult.substring(0, 500),
                      );
                      return; // Skip this message
                    }
                  } else {
                    console.warn(
                      "No valid JSON found in result string. Raw result:",
                      cleanResult.substring(0, 500),
                    );
                    return; // Skip this message
                  }
                }
              }
            } else if (typeof result === "object" && result !== null) {
              parsed = result;
            }

            if (parsed) {
              // Check if it's balance data
              if (parsed.type === "balance" && parsed.balances && Array.isArray(parsed.balances)) {
                onBalanceUpdate?.(parsed as BalanceData);
              }
              // Check if it's liquidity data (regular or parallel)
              else if (parsed.type === "multichain_liquidity") {
                console.log("💧 Multi-Chain Liquidity Data Received:", {
                  token_pair: parsed.token_pair,
                  chain: parsed.chain,
                  chains: parsed.chains,
                  hedera_pairs: parsed.hedera_pairs?.length || 0,
                  polygon_pairs: parsed.polygon_pairs?.length || 0,
                  ethereum_pairs: parsed.ethereum_pairs?.length || 0,
                  all_pairs: parsed.all_pairs?.length || 0,
                });
                onLiquidityUpdate?.(parsed as MultiChainLiquidityData);
                
                // Trigger payment settlement after receiving liquidity data
                if (typeof (window as any).__liquidityPaymentSettle === "function") {
                  console.log("💰 Triggering payment settlement after liquidity response...");
                  setTimeout(() => {
                    (window as any).__liquidityPaymentSettle();
                  }, 1000); // Small delay to ensure UI updates
                }
              } else if (
                parsed.type === "liquidity" &&
                parsed.pairs &&
                Array.isArray(parsed.pairs)
              ) {
                onLiquidityUpdate?.(parsed as LiquidityData);
              }
              // Check if it's pool calculator data
              else if (
                parsed.recommended_allocations &&
                typeof parsed.recommended_allocations === "object"
              ) {
                console.log("🧮 Pool Calculator Data Received:", {
                  chains: Object.keys(parsed.recommended_allocations),
                  total_output: parsed.total_output,
                  average_price_impact: parsed.average_price_impact,
                });
                onPoolCalculatorUpdate?.(parsed as PoolCalculatorData);
              }
              // Check if it's swap router data
              else if (parsed.type === "swap_router") {
                console.log("🔄 Swap Router Data Received:", {
                  total_input: parsed.total_input,
                  token_in: parsed.token_in,
                  total_output: parsed.total_output,
                  routes: parsed.routes?.length || 0,
                });
                onSwapRouterUpdate?.(parsed as SwapRouterData);
              }
              // Check if it's swap data
              // Swap data can have transaction OR swap_options (or both)
              else if (parsed.type === "swap") {
                // Debug logging to verify swap direction
                console.log("🔄 Swap Data Received:", {
                  token_in_symbol: parsed.token_in_symbol,
                  token_out_symbol: parsed.token_out_symbol,
                  amount_in: parsed.amount_in,
                  chain: parsed.chain,
                });
                onSwapUpdate?.(parsed as SwapData);
              }
              // Check if it's market insights data
              else if (parsed.type === "market_insights") {
                console.log("📊 Market Insights Data Received:", {
                  network: parsed.network,
                  token_address: parsed.token_address,
                  pool_address: parsed.pool_address,
                  has_pool_liquidity: !!parsed.pool_liquidity,
                  has_token_liquidity: !!parsed.token_liquidity,
                  trending_tokens_count: parsed.trending_tokens?.length || 0,
                });
                onMarketInsightsUpdate?.(parsed as MarketInsightsData);
              }
              // Check if it's bridge data
              else if (parsed.type === "bridge") {
                console.log("🌉 Bridge Data Received:", {
                  type: parsed.type,
                  source_chain: parsed.source_chain,
                  destination_chain: parsed.destination_chain,
                  token_symbol: parsed.token_symbol,
                  amount: parsed.amount,
                  account_address: parsed.account_address,
                  has_transaction: !!parsed.transaction,
                  has_bridge_options: !!parsed.bridge_options,
                  bridge_options_count: parsed.bridge_options?.length || 0,
                  has_balance_check: !!parsed.balance_check,
                  full_data: parsed,
                });
                // Always call onBridgeUpdate when bridge data is received (even if bridge_options is empty)
                // The bridge card will handle displaying the appropriate state
                try {
                  console.log("🌉 About to call onBridgeUpdate callback...");
                  console.log("🌉 onBridgeUpdate exists?", typeof onBridgeUpdate === "function");
                  if (onBridgeUpdate) {
                    const bridgeData = parsed as BridgeData;
                    console.log("🌉 Calling onBridgeUpdate with:", bridgeData);
                    onBridgeUpdate(bridgeData);
                    console.log("✅ Bridge data passed to onBridgeUpdate callback");
                    console.log("✅ Bridge data structure:", JSON.stringify(parsed, null, 2));
                  } else {
                    console.error("❌ onBridgeUpdate callback is not defined!");
                  }
                } catch (error) {
                  console.error("❌ Error calling onBridgeUpdate:", error);
                  console.error(
                    "❌ Error stack:",
                    error instanceof Error ? error.stack : "No stack",
                  );
                }
              } else if (parsed.type) {
                // Debug: log what type we got (but only if it has a type)
                console.log("🔍 Received data type:", parsed.type, "Full parsed:", parsed);
              }
            }
          } catch (e) {
            // Silently ignore parsing errors
          }
        }
      }
    };

    extractDataFromMessages();
  }, [
    visibleMessages,
    onBalanceUpdate,
    onLiquidityUpdate,
    onSwapUpdate,
    onSwapRouterUpdate,
    onPoolCalculatorUpdate,
    onMarketInsightsUpdate,
    onBridgeUpdate,
  ]);

  // Register HITL balance requirements form (collects account info at start)
  useCopilotAction({
    name: "gather_balance_requirements",
    description:
      "Gather balance query requirements from the user (account address, chain, optional token)",
    parameters: [
      {
        name: "accountAddress",
        type: "string",
        description:
          "The account address to query (Hedera format: 0.0.123456 or EVM format: 0x...). May be pre-filled from user message.",
        required: false,
      },
      {
        name: "chain",
        type: "string",
        description: "The blockchain chain to query: hedera, polygon, or all",
        required: false,
      },
      {
        name: "tokenAddress",
        type: "string",
        description: "Optional token address or symbol to query. Leave empty for all tokens.",
        required: false,
      },
    ],
    renderAndWaitForResponse: ({ args, respond }) => {
      return <BalanceRequirementsForm args={args} respond={respond} />;
    },
  });

  // Register HITL liquidity payment form (collects payment before liquidity query)
  useCopilotAction({
    name: "gather_liquidity_payment",
    description: "Collect x402 payment from user before accessing liquidity data",
    parameters: [
      {
        name: "payerAccountId",
        type: "string",
        description: "The Hedera account ID that will pay for the liquidity query",
        required: false,
      },
    ],
    renderAndWaitForResponse: ({ args, respond }) => {
      return (
        <LiquidityPaymentForm
          args={args}
          respond={respond}
          onPaymentComplete={(paymentProof) => {
            console.log("✅ Payment completed:", paymentProof);
          }}
        />
      );
    },
  });

  // Register HITL liquidity requirements form (collects chain and token pair info at start)
  useCopilotAction({
    name: "gather_liquidity_requirements",
    description: "Gather liquidity query requirements from the user (chain, optional token pair)",
    parameters: [
      {
        name: "chain",
        type: "string",
        description:
          "The blockchain chain to query: hedera, polygon, or all. May be pre-filled from user message.",
        required: false,
      },
      {
        name: "tokenPair",
        type: "string",
        description:
          "Optional token pair to query (e.g., HBAR/USDC). May be pre-filled from user message.",
        required: false,
      },
    ],
    renderAndWaitForResponse: ({ args, respond }) => {
      return <LiquidityRequirementsForm args={args} respond={respond} />;
    },
  });

  // Register HITL swap requirements form (collects swap details at start)
  useCopilotAction({
    name: "gather_swap_requirements",
    description:
      "Gather swap requirements from the user (account address, chain, token in, token out, amount, slippage tolerance)",
    parameters: [
      {
        name: "accountAddress",
        type: "string",
        description:
          "The account address to swap from (Hedera format: 0.0.123456 or EVM format: 0x...). May be pre-filled from user message.",
        required: false,
      },
      {
        name: "chain",
        type: "string",
        description: "Chain: hedera or polygon. May be pre-filled from user message.",
        required: false,
      },
      {
        name: "tokenInSymbol",
        type: "string",
        description:
          "Token symbol to swap from (e.g., USDC, HBAR, MATIC). May be pre-filled from user message.",
        required: false,
      },
      {
        name: "tokenOutSymbol",
        type: "string",
        description:
          "Token symbol to swap to (e.g., USDC, HBAR, MATIC). May be pre-filled from user message.",
        required: false,
      },
      {
        name: "amountIn",
        type: "string",
        description: "Amount to swap (e.g., 100.0). May be pre-filled from user message.",
        required: false,
      },
      {
        name: "slippageTolerance",
        type: "string",
        description:
          "Slippage tolerance percentage (e.g., 0.5 for 0.5%). May be pre-filled from user message.",
        required: false,
      },
    ],
    renderAndWaitForResponse: ({ args, respond }) => {
      return <SwapRequirementsForm args={args} respond={respond} />;
    },
  });

  // Register HITL bridge requirements form (collects bridge details at start)
  useCopilotAction({
    name: "gather_bridge_requirements",
    description:
      "Gather bridge requirements from the user (account address, source chain, destination chain, token, amount)",
    parameters: [
      {
        name: "accountAddress",
        type: "string",
        description:
          "The account address to bridge from (Hedera format: 0.0.123456 or EVM format: 0x...). May be pre-filled from user message.",
        required: false,
      },
      {
        name: "sourceChain",
        type: "string",
        description: "Source chain: hedera or polygon. May be pre-filled from user message.",
        required: false,
      },
      {
        name: "destinationChain",
        type: "string",
        description: "Destination chain: hedera or polygon. May be pre-filled from user message.",
        required: false,
      },
      {
        name: "tokenSymbol",
        type: "string",
        description:
          "Token symbol to bridge (e.g., USDC). Note: EtaBridge only supports USDC. May be pre-filled from user message.",
        required: false,
      },
      {
        name: "amount",
        type: "string",
        description: "Amount to bridge (e.g., 100.0). May be pre-filled from user message.",
        required: false,
      },
    ],
    renderAndWaitForResponse: ({ args, respond }) => {
      return <BridgeRequirementsForm args={args} respond={respond} />;
    },
  });

  // Register A2A message visualizer (renders green/blue communication boxes)
  useCopilotAction({
    name: "send_message_to_a2a_agent",
    description: "Sends a message to an A2A agent",
    available: "frontend",
    parameters: [
      {
        name: "agentName",
        type: "string",
        description: "The name of the A2A agent to send the message to",
      },
      {
        name: "task",
        type: "string",
        description: "The message to send to the A2A agent",
      },
    ],
    render: (actionRenderProps: MessageActionRenderProps) => {
      return (
        <>
          <MessageToA2A {...actionRenderProps} />
          <MessageFromA2A {...actionRenderProps} />
        </>
      );
    },
  });

  return (
    <div className="h-full">
      <CopilotChat
        className="h-full"
        labels={{
          initial:
            "👋 Hi! I'm your DeFi liquidity assistant.\n\nAsk me to check balances or get liquidity information and I'll coordinate with specialized agents to fetch on-chain data!",
        }}
        instructions="You are a helpful DeFi assistant. Help users query balances and liquidity by coordinating with specialized agents."
      />
    </div>
  );
};

export default function DeFiChat({
  onBalanceUpdate,
  onLiquidityUpdate,
  onSwapUpdate,
  onSwapRouterUpdate,
  onPoolCalculatorUpdate,
  onMarketInsightsUpdate,
  onBridgeUpdate,
}: DeFiChatProps) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" showDevConsole={false} agent="a2a_chat">
      <ChatInner
        onBalanceUpdate={onBalanceUpdate}
        onLiquidityUpdate={onLiquidityUpdate}
        onSwapUpdate={onSwapUpdate}
        onSwapRouterUpdate={onSwapRouterUpdate}
        onPoolCalculatorUpdate={onPoolCalculatorUpdate}
        onMarketInsightsUpdate={onMarketInsightsUpdate}
        onBridgeUpdate={onBridgeUpdate}
      />
    </CopilotKit>
  );
}
