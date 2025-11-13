"use client";

import React from "react";
import type { PoolCalculatorData } from "@/types";

interface PoolCalculatorCardProps {
  data: PoolCalculatorData;
}

const getChainColor = (chain: string) => {
  const chainLower = chain.toLowerCase();
  if (chainLower === "hedera") {
    return {
      gradient: "bg-gradient-to-r from-purple-500 to-indigo-500",
      light: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-700",
      icon: "🟣",
    };
  }
  if (chainLower === "polygon") {
    return {
      gradient: "bg-gradient-to-r from-blue-500 to-purple-500",
      light: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      icon: "🔵",
    };
  }
  if (chainLower === "ethereum" || chainLower === "eth") {
    return {
      gradient: "bg-gradient-to-r from-indigo-500 to-blue-500",
      light: "bg-indigo-50",
      border: "border-indigo-200",
      text: "text-indigo-700",
      icon: "💎",
    };
  }
  return {
    gradient: "bg-gradient-to-r from-gray-500 to-gray-600",
    light: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    icon: "⚪",
  };
};

const formatNumber = (value: number | string): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
};

export function PoolCalculatorCard({ data }: PoolCalculatorCardProps) {
  if (data.error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-red-800 mb-2">Error</h3>
        <p className="text-red-600">{data.error}</p>
      </div>
    );
  }

  const allocations = data.recommended_allocations || {};
  const totalAmount = Object.values(allocations).reduce(
    (sum: number, val: any) => sum + (typeof val === "number" ? val : parseFloat(val) || 0),
    0,
  );

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 my-3 border-2 border-[#DBDBE5] shadow-elevation-md animate-fade-in-up">
      {/* Header */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 mb-4 border border-teal-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 shadow-lg">
                <span className="text-2xl">🧮</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#010507] mb-1">Pool Calculator Analysis</h2>
                <p className="text-sm text-[#57575B]">Optimal allocation recommendations</p>
              </div>
            </div>
            {data.average_price_impact !== undefined && (
              <div className="text-right">
                <div className="text-sm text-[#57575B] mb-1">Avg Price Impact</div>
                <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  {data.average_price_impact.toFixed(2)}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Allocations by Chain */}
      {Object.keys(allocations).length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[#010507] mb-4">Recommended Allocations</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(allocations).map(([chain, amount]) => {
              const chainStyle = getChainColor(chain);
              const amountNum = typeof amount === "number" ? amount : parseFloat(amount) || 0;
              const percentage = totalAmount > 0 ? (amountNum / totalAmount) * 100 : 0;

              return (
                <div
                  key={chain}
                  className={`${chainStyle.light} rounded-xl p-4 border-2 ${chainStyle.border} hover:shadow-elevation-md transition-all duration-200`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{chainStyle.icon}</span>
                    <h4 className="font-semibold capitalize text-[#010507]">{chain}</h4>
                  </div>

                  {/* Percentage Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#57575B]">Allocation</span>
                      <span className={`text-sm font-bold ${chainStyle.text}`}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-white/60 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full ${chainStyle.gradient} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-center">
                    <div className="text-xs text-[#57575B] mb-1">Amount</div>
                    <div className={`text-xl font-bold ${chainStyle.text}`}>
                      {formatNumber(amountNum)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {(data.total_output !== undefined || data.average_price_impact !== undefined) && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {data.total_output !== undefined && (
            <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
              <div className="text-xs text-teal-600 mb-1">Estimated Total Output</div>
              <div className="text-lg font-semibold text-teal-800">
                {data.total_output.toFixed(4)}
              </div>
            </div>
          )}
          {data.average_price_impact !== undefined && (
            <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
              <div className="text-xs text-cyan-600 mb-1">Average Price Impact</div>
              <div className="text-lg font-semibold text-cyan-800">
                {data.average_price_impact.toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reasoning */}
      {data.reasoning && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-[#010507] mb-2">Analysis Reasoning</h4>
          <p className="text-sm text-[#57575B] whitespace-pre-line">{data.reasoning}</p>
        </div>
      )}
    </div>
  );
}
