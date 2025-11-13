"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { DeFiChat } from "@/components/chat";
import { BalanceCard } from "@/components/features/balance";
import { SwapCard } from "@/components/features/swap";
import { LiquidityCard } from "@/components/features/liquidity";
import { SwapRouterCard } from "@/components/features/swap_router";
import { PoolCalculatorCard } from "@/components/features/pool_calculator";
import { MarketInsightsCard } from "@/components/features/market_insights";
import { BridgeCard } from "@/components/features/bridge";
import { WalletConnect, Logo } from "@/components/shared";
import type {
  BalanceData,
  LiquidityData,
  MultiChainLiquidityData,
  SwapData,
  SwapRouterData,
  PoolCalculatorData,
  MarketInsightsData,
  BridgeData,
} from "@/types";
import "../copilot.css";
import Link from "next/link";

export default function ChatPage() {
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [liquidityData, setLiquidityData] = useState<
    LiquidityData | MultiChainLiquidityData | null
  >(null);
  const [swapData, setSwapData] = useState<SwapData | null>(null);
  const [swapRouterData, setSwapRouterData] = useState<SwapRouterData | null>(null);
  const [poolCalculatorData, setPoolCalculatorData] = useState<PoolCalculatorData | null>(null);
  const [marketInsightsData, setMarketInsightsData] = useState<MarketInsightsData | null>(null);
  const [bridgeData, setBridgeData] = useState<BridgeData | null>(null);
  const { address } = useAppKitAccount?.() || ({} as any);
  const isConnected = Boolean(address);

  // Stable callback for bridge updates
  const handleBridgeUpdate = useCallback((data: BridgeData | null) => {
    console.log("🌉 handleBridgeUpdate called with data:", data);
    console.log("🌉 Setting bridgeData state with:", data);
    setBridgeData((prev) => {
      console.log("🌉 setBridgeData functional update - prev:", prev, "new:", data);
      return data;
    });
    console.log("🌉 setBridgeData called");
  }, []);

  // Debug logging for bridge data
  useEffect(() => {
    console.log("🌉 BridgeData state changed:", {
      has_data: !!bridgeData,
      is_null: bridgeData === null,
      is_undefined: bridgeData === undefined,
      value: bridgeData,
    });
    if (bridgeData) {
      console.log("🌉 BridgeData state updated in ChatPage:", {
        has_data: !!bridgeData,
        source_chain: bridgeData.source_chain,
        destination_chain: bridgeData.destination_chain,
        token_symbol: bridgeData.token_symbol,
        amount: bridgeData.amount,
        has_bridge_options: !!bridgeData.bridge_options,
        bridge_options_count: bridgeData.bridge_options?.length || 0,
        full_bridge_data: bridgeData,
      });
      console.log("🌉 BridgeCard should render now - bridgeData exists:", !!bridgeData);
    } else {
      console.log("⚠️ BridgeData is null/undefined - card will not render");
    }
  }, [bridgeData]);

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-[#DEDEE9]">
      {/* Wallet Connection Header */}
      <div className="flex justify-between items-center p-4 z-20 bg-white/30 backdrop-blur-sm border-b border-[#DBDBE5]">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-[#57575B] hover:text-[#010507] transition-colors"
        >
          <Logo size={28} variant="icon" />
          <span>← Back to Home</span>
        </Link>
        <WalletConnect />
      </div>

      {/* Blocker modal when wallet is not connected */}
      {!isConnected && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-gradient-to-b from-black/50 to-black/40 backdrop-blur-md">
          {/* Glow background accents */}
          <div className="absolute -z-0 w-[580px] h-[580px] rounded-full bg-gradient-to-tr from-purple-400/30 via-fuchsia-300/20 to-amber-300/20 blur-3xl" />
          <div className="absolute -z-0 w-[380px] h-[380px] translate-x-40 -translate-y-40 rounded-full bg-gradient-to-br from-sky-300/30 to-violet-300/20 blur-3xl" />

          {/* Modal card */}
          <div className="relative z-10 w-full max-w-lg mx-4">
            <div className="relative rounded-2xl border border-white/40 bg-white/80 backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.45)]">
              {/* Animated gradient ring */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5 [mask-image:radial-gradient(80%_80%_at_50%_0%,black,transparent)]" />

              <div className="p-6 sm:p-8">
                {/* Icon */}
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                  >
                    <path
                      d="M4 12c0-4.418 3.582-8 8-8a8 8 0 1 1-7.071 11.314"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8.5 12A3.5 3.5 0 1 0 12 8.5V7m0 10v-3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="text-center text-[11px] font-semibold tracking-wider text-[#6B6B75] uppercase">
                  Multi‑chain DeFi assistant
                </div>
                <h2 className="mt-1 text-center text-2xl font-semibold tracking-tight text-[#010507]">
                  Connect your wallet
                </h2>
                <p className="mt-2 text-center text-sm leading-relaxed text-[#57575B]">
                  View balances, scan liquidity, and swap tokens for your address.
                </p>

                {/* Benefits / bullets */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#57575B]">
                  <div className="flex items-center gap-2 rounded-lg border border-[#E7E7F2] bg-white/70 px-2.5 py-2">
                    <span className="text-[13px]">💰</span>
                    <span className="font-medium">Balance insights</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-[#E7E7F2] bg-white/70 px-2.5 py-2">
                    <span className="text-[13px]">📊</span>
                    <span className="font-medium">Liquidity scan</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-[#E7E7F2] bg-white/70 px-2.5 py-2">
                    <span className="text-[13px]">💱</span>
                    <span className="font-medium">Token swaps</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-6 flex justify-center">
                  <div className="[&>appkit-button]:!px-5 [&>appkit-button]:!py-2.5 [&>appkit-button]:!rounded-xl [&>appkit-button]:!text-sm [&>appkit-button]:!bg-gradient-to-r [&>appkit-button]:from-purple-600 [&>appkit-button]:to-fuchsia-600 [&>appkit-button]:hover:from-purple-500 [&>appkit-button]:hover:to-fuchsia-500 [&>appkit-button]:!text-white">
                    <WalletConnect />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex flex-1 overflow-hidden p-2">
        {/* Background blobs (match ui) */}
        <div
          className="absolute w-[445.84px] h-[445.84px] left-[1040px] top-[11px] rounded-full z-0"
          style={{ background: "rgba(255, 172, 77, 0.2)", filter: "blur(103.196px)" }}
        />
        <div
          className="absolute w-[609.35px] h-[609.35px] left-[1338.97px] top-[624.5px] rounded-full z-0"
          style={{ background: "#C9C9DA", filter: "blur(103.196px)" }}
        />
        <div
          className="absolute w-[609.35px] h-[609.35px] left-[670px] top-[-365px] rounded-full z-0"
          style={{ background: "#C9C9DA", filter: "blur(103.196px)" }}
        />
        <div
          className="absolute w-[609.35px] h-[609.35px] left-[507.87px] top-[702.14px] rounded-full z-0"
          style={{ background: "#F3F3FC", filter: "blur(103.196px)" }}
        />
        <div
          className="absolute w-[445.84px] h-[445.84px] left-[127.91px] top-[331px] rounded-full z-0"
          style={{ background: "rgba(255, 243, 136, 0.3)", filter: "blur(103.196px)" }}
        />
        <div
          className="absolute w-[445.84px] h-[445.84px] left-[-205px] top-[802.72px] rounded-full z-0"
          style={{ background: "rgba(255, 172, 77, 0.2)", filter: "blur(103.196px)" }}
        />

        <div className="flex flex-1 overflow-hidden z-10 gap-2">
          {/* Left fixed chat card (450px) */}
          <div className="w-[450px] flex-shrink-0 border-2 border-white bg-white/50 backdrop-blur-md shadow-elevation-lg flex flex-col rounded-lg overflow-hidden">
            <div className="p-6 border-b border-[#DBDBE5]">
              <h1 className="text-2xl font-semibold text-[#010507] mb-1">DeFi Assistant</h1>
              <p className="text-sm text-[#57575B] leading-relaxed">
                Multi-Agent A2A Demo: <span className="text-purple-600 font-semibold">Balance</span>{" "}
                + <span className="text-teal-600 font-semibold">Liquidity</span> +{" "}
                <span className="text-green-600 font-semibold">Swap</span>
              </p>
              <p className="text-xs text-[#838389] mt-1">Orchestrator-mediated A2A Protocol</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <DeFiChat
                onBalanceUpdate={setBalanceData}
                onLiquidityUpdate={setLiquidityData}
                onSwapUpdate={setSwapData}
                onSwapRouterUpdate={setSwapRouterData}
                onPoolCalculatorUpdate={setPoolCalculatorData}
                onMarketInsightsUpdate={setMarketInsightsData}
                onBridgeUpdate={handleBridgeUpdate}
              />
            </div>
          </div>

          {/* Right content area */}
          <div className="flex-1 overflow-y-auto rounded-lg bg-white/30 backdrop-blur-sm">
            <div className="max-w-5xl mx-auto p-8">
              <div className="mb-8">
                <h2 className="text-3xl font-semibold text-[#010507] mb-2">Your DeFi Data</h2>
                <p className="text-[#57575B]">
                  Multi-agent coordination: Balance, Liquidity, Parallel Liquidity, and Swap agents
                  with A2A Protocol
                </p>
              </div>

              {!balanceData &&
                !liquidityData &&
                !swapData &&
                !swapRouterData &&
                !poolCalculatorData &&
                !marketInsightsData &&
                !bridgeData && (
                  <div className="flex items-center justify-center h-[400px] bg-white/60 backdrop-blur-md rounded-xl border-2 border-dashed border-[#DBDBE5] shadow-elevation-sm">
                    <div className="text-center">
                      <div className="text-6xl mb-4">💰</div>
                      <h3 className="text-xl font-semibold text-[#010507] mb-2">
                        Start Querying Your DeFi Data
                      </h3>
                      <p className="text-[#57575B] max-w-md">
                        Ask the assistant to check your balance, get liquidity information, or swap
                        tokens. Watch as specialized agents collaborate through A2A Protocol to
                        fetch your on-chain data and execute DeFi operations.
                      </p>
                    </div>
                  </div>
                )}

              {balanceData && (
                <div className="mb-4">
                  <BalanceCard data={balanceData} />
                </div>
              )}

              {liquidityData && (
                <div className="mb-4">
                  <LiquidityCard data={liquidityData} />
                </div>
              )}

              {poolCalculatorData && (
                <div className="mb-4">
                  <PoolCalculatorCard data={poolCalculatorData} />
                </div>
              )}

              {swapRouterData && (
                <div className="mb-4">
                  <SwapRouterCard data={swapRouterData} />
                </div>
              )}

              {swapData && (
                <div className="mb-4">
                  <SwapCard
                    data={swapData}
                    onSwapInitiate={(dex) => {
                      // When user clicks "Swap" button, send a message to the chat
                      // to trigger the orchestrator to initiate the swap
                      console.log("Initiating swap with DEX:", dex);
                      // The orchestrator will handle this via chat message
                      // In a real implementation, you might want to send a message programmatically
                      // For now, the user can click the button and the UI will show the state
                      // The actual swap initiation happens via orchestrator when user says "swap with [dex]"
                    }}
                  />
                </div>
              )}

              {marketInsightsData && (
                <div className="mb-4">
                  <MarketInsightsCard data={marketInsightsData} />
                </div>
              )}

              {/* Bridge Card - Always check if bridgeData exists */}
              {(() => {
                console.log("🌉 Render check - bridgeData:", bridgeData);
                if (bridgeData) {
                  console.log("🌉 Rendering BridgeCard with data:", bridgeData);
                  return (
                    <div className="mb-4">
                      <BridgeCard
                        data={bridgeData}
                        onBridgeInitiate={(protocol) => {
                          console.log("Initiating bridge with protocol:", protocol);
                        }}
                      />
                    </div>
                  );
                } else {
                  console.log("🌉 Not rendering BridgeCard - bridgeData is null/undefined");
                  return null;
                }
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
