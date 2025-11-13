"use client";

import React from "react";
import type { SwapRouterData, SwapRouterRoute } from "@/types";

interface SwapRouterCardProps {
  data: SwapRouterData;
}

const getChainColor = (chain: string): string => {
  const colors: Record<string, string> = {
    ethereum: "bg-blue-100 border-blue-300 text-blue-800",
    polygon: "bg-purple-100 border-purple-300 text-purple-800",
    hedera: "bg-green-100 border-green-300 text-green-800",
  };
  return colors[chain.toLowerCase()] || "bg-gray-100 border-gray-300 text-gray-800";
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }
  return num.toFixed(2);
};

export function SwapRouterCard({ data }: SwapRouterCardProps) {
  if (data.error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-red-800 mb-2">Error</h3>
        <p className="text-red-600">{data.error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-xl border-2 border-[#DBDBE5] shadow-elevation-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#010507] mb-2">Swap Router Recommendation</h2>
        <div className="flex items-center gap-4 text-sm text-[#57575B]">
          <span>
            {formatNumber(data.total_input)} {data.token_in}
          </span>
          <span>→</span>
          <span className="font-semibold text-[#010507]">
            {data.total_output.toFixed(4)} {data.token_out}
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-xs text-blue-600 mb-1">Price Impact</div>
          <div className="text-lg font-semibold text-blue-800">
            {data.total_price_impact_percent.toFixed(2)}%
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-xs text-purple-600 mb-1">Gas Cost</div>
          <div className="text-lg font-semibold text-purple-800">
            ${data.total_gas_cost_usd.toFixed(2)}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-xs text-green-600 mb-1">Efficiency</div>
          <div className="text-lg font-semibold text-green-800">
            {data.efficiency_percent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Routes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#010507] mb-3">
          Recommended Routes ({data.routes.length})
        </h3>
        {data.routes.map((route: SwapRouterRoute, index: number) => (
          <div key={index} className={`border-2 rounded-lg p-4 ${getChainColor(route.chain)}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold capitalize">{route.chain}</span>
                <span className="text-xs font-bold bg-white/60 px-2 py-1 rounded">
                  {((route.amount_in / data.total_input) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-xs opacity-75">
                Confidence: {(route.confidence * 100).toFixed(0)}%
              </div>
            </div>

            {/* Percentage Bar */}
            <div className="mb-3">
              <div className="w-full bg-white/60 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${(route.amount_in / data.total_input) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-xs opacity-75 mb-1">Input</div>
                <div className="font-semibold">
                  {formatNumber(route.amount_in)} {route.token_in}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-75 mb-1">Output</div>
                <div className="font-semibold">
                  {route.amount_out.toFixed(4)} {route.token_out}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="opacity-75">Impact: </span>
                <span className="font-semibold">{route.price_impact_percent.toFixed(2)}%</span>
              </div>
              <div>
                <span className="opacity-75">Gas: </span>
                <span className="font-semibold">${route.gas_cost_usd.toFixed(2)}</span>
              </div>
              <div>
                <span className="opacity-75">Time: </span>
                <span className="font-semibold">{route.execution_time_seconds}s</span>
              </div>
            </div>

            <div className="mt-2 text-xs opacity-60">
              Pool: {route.pool.pool_address.slice(0, 10)}...{route.pool.pool_address.slice(-8)}
            </div>
          </div>
        ))}
      </div>

      {/* Recommendation Text */}
      {data.recommendation_text && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-[#010507] mb-2">Recommendation</h4>
          <p className="text-sm text-[#57575B] whitespace-pre-line">{data.recommendation_text}</p>
        </div>
      )}
    </div>
  );
}
