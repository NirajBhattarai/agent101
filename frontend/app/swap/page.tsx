"use client";

import { useEffect, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { DeFiChat } from "@/components/chat";
import { SwapCard } from "@/components/features/swap";
import { WalletConnect } from "@/components/shared";
import type { SwapData } from "@/types";
import "../copilot.css";

export default function SwapPage() {
  const [swapData, setSwapData] = useState<SwapData | null>(null);
  const { address } = useAppKitAccount?.() || ({} as any);
  const isConnected = Boolean(address);

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-[#DEDEE9]">
      {/* Wallet Connection Header */}
      <div className="flex justify-end items-center p-4 z-20 bg-white/30 backdrop-blur-sm border-b border-[#DBDBE5]">
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
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-lg shadow-green-500/25">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                  >
                    <path
                      d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="text-center text-[11px] font-semibold tracking-wider text-[#6B6B75] uppercase">
                  Multi‑chain Token Swap
                </div>
                <h2 className="mt-1 text-center text-2xl font-semibold tracking-tight text-[#010507]">
                  Connect your wallet
                </h2>
                <p className="mt-2 text-center text-sm leading-relaxed text-[#57575B]">
                  Swap tokens on Hedera and Polygon chains with the best rates.
                </p>

                {/* Benefits / bullets */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#57575B]">
                  <div className="flex items-center gap-2 rounded-lg border border-[#E7E7F2] bg-white/70 px-2.5 py-2">
                    <span className="text-[13px]">💱</span>
                    <span className="font-medium">Token swaps</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-[#E7E7F2] bg-white/70 px-2.5 py-2">
                    <span className="text-[13px]">📊</span>
                    <span className="font-medium">Best rates</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-[#E7E7F2] bg-white/70 px-2.5 py-2">
                    <span className="text-[13px]">⚡</span>
                    <span className="font-medium">Fast execution</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-6 flex justify-center">
                  <div className="[&>appkit-button]:!px-5 [&>appkit-button]:!py-2.5 [&>appkit-button]:!rounded-xl [&>appkit-button]:!text-sm [&>appkit-button]:!bg-gradient-to-r [&>appkit-button]:from-green-600 [&>appkit-button]:to-teal-600 [&>appkit-button]:hover:from-green-500 [&>appkit-button]:hover:to-teal-500 [&>appkit-button]:!text-white">
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
              <h1 className="text-2xl font-semibold text-[#010507] mb-1">Swap Assistant</h1>
              <p className="text-sm text-[#57575B] leading-relaxed">
                Multi-Agent A2A Demo: <span className="text-green-600 font-semibold">Swap</span>{" "}
                Agent for Hedera & Polygon
              </p>
              <p className="text-xs text-[#838389] mt-1">Orchestrator-mediated A2A Protocol</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <DeFiChat onSwapUpdate={setSwapData} />
            </div>
          </div>

          {/* Right content area */}
          <div className="flex-1 overflow-y-auto rounded-lg bg-white/30 backdrop-blur-sm">
            <div className="max-w-5xl mx-auto p-8">
              <div className="mb-8">
                <h2 className="text-3xl font-semibold text-[#010507] mb-2">Token Swap</h2>
                <p className="text-[#57575B]">
                  Swap tokens on Hedera and Polygon chains with the best rates from multiple DEXs
                </p>
              </div>

              {!swapData && (
                <div className="flex items-center justify-center h-[400px] bg-white/60 backdrop-blur-md rounded-xl border-2 border-dashed border-[#DBDBE5] shadow-elevation-sm">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💱</div>
                    <h3 className="text-xl font-semibold text-[#010507] mb-2">
                      Start Your Token Swap
                    </h3>
                    <p className="text-[#57575B] max-w-md">
                      Ask the assistant to swap tokens. Watch as specialized agents collaborate
                      through A2A Protocol to get the best swap rates.
                    </p>
                  </div>
                </div>
              )}

              {swapData && (
                <div className="mb-4">
                  <SwapCard
                    data={swapData}
                    onSwapInitiate={(dex) => {
                      console.log("Initiating swap with DEX:", dex);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
