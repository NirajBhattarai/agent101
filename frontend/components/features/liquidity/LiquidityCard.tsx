/**
 * LiquidityCard Component
 *
 * Displays liquidity pool information for both regular liquidity and multi-chain liquidity data.
 * Uses blue/purple gradient styling to match the LiquidityFinder branding.
 */

import React from "react";
import { LiquidityData, MultiChainLiquidityData } from "@/types";

interface LiquidityCardProps {
  data: LiquidityData | MultiChainLiquidityData;
}

/**
 * Get chain badge color and styling
 */
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

/**
 * Format number with commas and decimals
 */
const formatNumber = (value: number | string): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

/**
 * Format large number
 */
const formatLargeNumber = (value: number | string): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
};

export const LiquidityCard: React.FC<LiquidityCardProps> = ({ data }) => {
  // Check if it's multi-chain liquidity data
  const isMultiChain = data.type === "multichain_liquidity";
  const multiChainData = isMultiChain ? (data as MultiChainLiquidityData) : null;
  const regularData = !isMultiChain ? (data as LiquidityData) : null;

  // Error display
  if (data.error) {
    return (
      <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 my-3 border-2 border-red-200 shadow-elevation-md">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-xl font-bold text-red-800">Liquidity Query Error</h2>
        </div>
        <p className="text-sm text-red-600">{data.error}</p>
      </div>
    );
  }

  // Multi-Chain Liquidity Display
  if (multiChainData) {
    const { token_pair, chain, hedera_pairs, polygon_pairs, ethereum_pairs, all_pairs, chains } =
      multiChainData;
    const [base, quote] = token_pair ? token_pair.split("/") : ["", ""];
    const ethereumPairs = ethereum_pairs || chains?.ethereum?.pairs || [];

    return (
      <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 backdrop-blur-xl rounded-2xl p-8 my-4 border border-white/20 shadow-2xl shadow-blue-500/10 animate-fade-in-up overflow-hidden group">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-400/10 to-pink-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        {/* Header */}
        <div className="mb-8 relative z-10">
          <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl blur-lg opacity-50 animate-pulse" />
                  <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-xl transform group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl filter drop-shadow-lg">💧</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      LiquidityFinder
                    </h2>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md">
                      Multi-Chain
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {token_pair && (
                      <>
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-white/50 shadow-md">
                          <span className="text-lg font-bold text-gray-800">{base}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-lg font-bold text-gray-800">{quote}</span>
                        </div>
                        <span className="text-sm text-gray-600 font-medium">
                          across multiple chains
                        </span>
                      </>
                    )}
                    {!token_pair && chain && (
                      <span className="px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-white/50 shadow-md text-lg font-bold text-gray-800">
                        {chain.charAt(0).toUpperCase() + chain.slice(1)} Chain
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Total Pools
                </div>
                <div className="text-5xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-none">
                  {all_pairs.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">active pools</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chain Sections */}
        {(hedera_pairs.length > 0 || chains?.hedera) && (
          <div className="mb-8 relative z-10">
            <div className="mb-5">
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 backdrop-blur-sm border border-purple-300/30 shadow-lg">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md">
                  <span className="text-xl">🟣</span>
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent">
                  Hedera Network
                </h3>
                <div className="h-6 w-px bg-purple-300/50" />
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-white/80 text-purple-700 shadow-sm">
                  {hedera_pairs.length} {hedera_pairs.length === 1 ? "Pool" : "Pools"}
                </span>
              </div>
            </div>
            {hedera_pairs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hedera_pairs.map((pair, index) => {
                  const chainStyle = getChainColor("hedera");
                  return (
                    <div
                      key={index}
                      className="group relative bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-purple-200/50 hover:border-purple-400 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                    >
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-indigo-500/0 group-hover:from-purple-500/5 group-hover:to-indigo-500/5 transition-all duration-300" />
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 shadow-md">
                                <span className="text-sm font-bold text-white">{pair.dex}</span>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-purple-100/80 text-purple-700 text-xs font-bold border border-purple-300/50">
                                {pair.fee_bps / 100}% Fee
                              </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50/80 border border-gray-200/50">
                              <span className="text-xs text-gray-500 font-medium">Pool:</span>
                              <code
                                className="text-xs text-gray-700 font-mono truncate flex-1"
                                title={pair.pool_address}
                              >
                                {pair.pool_address.slice(0, 10)}...{pair.pool_address.slice(-8)}
                              </code>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50/80 to-indigo-50/80 rounded-xl p-4 border border-purple-200/50 shadow-sm">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                TVL
                              </div>
                              <div className="text-lg font-bold bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent">
                                {formatNumber(pair.tvl_usd)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Reserves
                              </div>
                              <div className="text-sm font-bold text-gray-800">
                                {formatLargeNumber(pair.reserve_base)} {pair.base}
                              </div>
                              <div className="text-sm font-bold text-gray-800">
                                {formatLargeNumber(pair.reserve_quote)} {pair.quote}
                              </div>
                            </div>
                          </div>
                          {pair.slot0 && (
                            <div className="mt-3 pt-3 border-t border-purple-200/50">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                Pool State
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Tick:</span>
                                  <span className="font-mono font-bold text-gray-800">
                                    {pair.slot0.tick.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Price:</span>
                                  <code
                                    className="font-mono text-gray-800 truncate max-w-[120px]"
                                    title={pair.slot0.sqrtPriceX96}
                                  >
                                    {pair.slot0.sqrtPriceX96?.slice(0, 12)}...
                                  </code>
                                </div>
                              </div>
                            </div>
                          )}
                          {pair.liquidity && (
                            <div className="mt-3 pt-3 border-t border-purple-200/50">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                                Liquidity
                              </div>
                              <code
                                className="text-xs font-mono text-gray-800 truncate block"
                                title={pair.liquidity}
                              >
                                {pair.liquidity.length > 24
                                  ? `${pair.liquidity.slice(0, 12)}...${pair.liquidity.slice(-8)}`
                                  : pair.liquidity}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-purple-50/50 to-indigo-50/50 backdrop-blur-sm rounded-2xl p-8 border-2 border-dashed border-purple-300/50 text-center">
                <div className="text-4xl mb-3 opacity-50">💧</div>
                <p className="text-sm font-medium text-purple-700">
                  No liquidity pools found on Hedera
                </p>
              </div>
            )}
          </div>
        )}

        {(polygon_pairs.length > 0 || chains?.polygon) && (
          <div className="mb-8 relative z-10">
            <div className="mb-5">
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border border-blue-300/30 shadow-lg">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md">
                  <span className="text-xl">🔵</span>
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
                  Polygon Network
                </h3>
                <div className="h-6 w-px bg-blue-300/50" />
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-white/80 text-blue-700 shadow-sm">
                  {polygon_pairs.length} {polygon_pairs.length === 1 ? "Pool" : "Pools"}
                </span>
              </div>
            </div>
            {polygon_pairs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {polygon_pairs.map((pair, index) => {
                  const chainStyle = getChainColor("polygon");
                  return (
                    <div
                      key={index}
                      className="group relative bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-blue-200/50 hover:border-blue-400 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                    >
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/5 group-hover:to-cyan-500/5 transition-all duration-300" />
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 shadow-md">
                                <span className="text-sm font-bold text-white">{pair.dex}</span>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-blue-100/80 text-blue-700 text-xs font-bold border border-blue-300/50">
                                {pair.fee_bps / 100}% Fee
                              </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50/80 border border-gray-200/50">
                              <span className="text-xs text-gray-500 font-medium">Pool:</span>
                              <code
                                className="text-xs text-gray-700 font-mono truncate flex-1"
                                title={pair.pool_address}
                              >
                                {pair.pool_address.slice(0, 10)}...{pair.pool_address.slice(-8)}
                              </code>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50/80 to-cyan-50/80 rounded-xl p-4 border border-blue-200/50 shadow-sm">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                TVL
                              </div>
                              <div className="text-lg font-bold bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
                                {formatNumber(pair.tvl_usd)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Reserves
                              </div>
                              <div className="text-sm font-bold text-gray-800">
                                {formatLargeNumber(pair.reserve_base)} {pair.base}
                              </div>
                              <div className="text-sm font-bold text-gray-800">
                                {formatLargeNumber(pair.reserve_quote)} {pair.quote}
                              </div>
                            </div>
                          </div>
                          {pair.slot0 && (
                            <div className="mt-3 pt-3 border-t border-blue-200/50">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                Pool State
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Tick:</span>
                                  <span className="font-mono font-bold text-gray-800">
                                    {pair.slot0.tick.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Price:</span>
                                  <code
                                    className="font-mono text-gray-800 truncate max-w-[120px]"
                                    title={pair.slot0.sqrtPriceX96}
                                  >
                                    {pair.slot0.sqrtPriceX96?.slice(0, 12)}...
                                  </code>
                                </div>
                              </div>
                            </div>
                          )}
                          {pair.liquidity && (
                            <div className="mt-3 pt-3 border-t border-blue-200/50">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                                Liquidity
                              </div>
                              <code
                                className="text-xs font-mono text-gray-800 truncate block"
                                title={pair.liquidity}
                              >
                                {pair.liquidity.length > 24
                                  ? `${pair.liquidity.slice(0, 12)}...${pair.liquidity.slice(-8)}`
                                  : pair.liquidity}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-blue-50/50 to-cyan-50/50 backdrop-blur-sm rounded-2xl p-8 border-2 border-dashed border-blue-300/50 text-center">
                <div className="text-4xl mb-3 opacity-50">💧</div>
                <p className="text-sm font-medium text-blue-700">
                  No liquidity pools found on Polygon
                </p>
              </div>
            )}
          </div>
        )}

        {(ethereumPairs.length > 0 || chains?.ethereum) && (
          <div className="mb-8 relative z-10">
            <div className="mb-5">
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-blue-500/10 backdrop-blur-sm border border-indigo-300/30 shadow-lg">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md">
                  <span className="text-xl">💎</span>
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-blue-700 bg-clip-text text-transparent">
                  Ethereum Network
                </h3>
                <div className="h-6 w-px bg-indigo-300/50" />
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-white/80 text-indigo-700 shadow-sm">
                  {ethereumPairs.length} {ethereumPairs.length === 1 ? "Pool" : "Pools"}
                </span>
              </div>
            </div>
            {ethereumPairs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ethereumPairs.map((pair: any, index: number) => {
                  const chainStyle = getChainColor("ethereum");
                  return (
                    <div
                      key={index}
                      className="group relative bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-indigo-200/50 hover:border-indigo-400 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                    >
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-blue-500/0 group-hover:from-indigo-500/5 group-hover:to-blue-500/5 transition-all duration-300" />
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 shadow-md">
                                <span className="text-sm font-bold text-white">{pair.dex}</span>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-indigo-100/80 text-indigo-700 text-xs font-bold border border-indigo-300/50">
                                {pair.fee_bps / 100}% Fee
                              </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50/80 border border-gray-200/50">
                              <span className="text-xs text-gray-500 font-medium">Pool:</span>
                              <code
                                className="text-xs text-gray-700 font-mono truncate flex-1"
                                title={pair.pool_address}
                              >
                                {pair.pool_address.slice(0, 10)}...{pair.pool_address.slice(-8)}
                              </code>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/80 rounded-xl p-4 border border-indigo-200/50 shadow-sm">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                TVL
                              </div>
                              <div className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-blue-700 bg-clip-text text-transparent">
                                {formatNumber(pair.tvl_usd)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Reserves
                              </div>
                              <div className="text-sm font-bold text-gray-800">
                                {formatLargeNumber(pair.reserve_base)} {pair.base}
                              </div>
                              <div className="text-sm font-bold text-gray-800">
                                {formatLargeNumber(pair.reserve_quote)} {pair.quote}
                              </div>
                            </div>
                          </div>
                          {pair.slot0 && (
                            <div className="mt-3 pt-3 border-t border-indigo-200/50">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                Pool State
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Tick:</span>
                                  <span className="font-mono font-bold text-gray-800">
                                    {pair.slot0.tick.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Price:</span>
                                  <code
                                    className="font-mono text-gray-800 truncate max-w-[120px]"
                                    title={pair.slot0.sqrtPriceX96}
                                  >
                                    {pair.slot0.sqrtPriceX96?.slice(0, 12)}...
                                  </code>
                                </div>
                              </div>
                            </div>
                          )}
                          {pair.liquidity && (
                            <div className="mt-3 pt-3 border-t border-indigo-200/50">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                                Liquidity
                              </div>
                              <code
                                className="text-xs font-mono text-gray-800 truncate block"
                                title={pair.liquidity}
                              >
                                {pair.liquidity.length > 24
                                  ? `${pair.liquidity.slice(0, 12)}...${pair.liquidity.slice(-8)}`
                                  : pair.liquidity}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 backdrop-blur-sm rounded-2xl p-8 border-2 border-dashed border-indigo-300/50 text-center">
                <div className="text-4xl mb-3 opacity-50">💧</div>
                <p className="text-sm font-medium text-indigo-700">
                  No liquidity pools found on Ethereum
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {all_pairs.length === 0 && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <div className="text-5xl mb-3">💧</div>
            <p className="text-base font-semibold text-gray-700 mb-1">No liquidity pools found</p>
            <p className="text-sm text-gray-500">
              No pools found for {token_pair} on Hedera, Polygon, or Ethereum
            </p>
          </div>
        )}
      </div>
    );
  }

  // Regular Liquidity Display (fallback)
  if (regularData) {
    const chainStyle = getChainColor(regularData.chain);
    return (
      <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 my-3 border-2 border-[#DBDBE5] shadow-elevation-md animate-fade-in-up">
        <div className="mb-6">
          <div className={`${chainStyle.light} rounded-xl p-4 mb-4 border ${chainStyle.border}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full ${chainStyle.gradient} shadow-lg`}
                >
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#010507] mb-1">Liquidity Pools</h2>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${chainStyle.gradient} flex items-center gap-1`}
                    >
                      <span>{chainStyle.icon}</span>
                      <span>{regularData.chain.toUpperCase()}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {regularData.pairs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {regularData.pairs.map((pair, index) => (
              <div
                key={index}
                className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-elevation-sm border-2 border-[#E9E9EF] hover:border-purple-300 hover:shadow-elevation-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-[#010507]">{pair.dex_name}</span>
                    </div>
                    <div className="text-sm text-[#57575B] mb-1">
                      {pair.token0} / {pair.token1}
                    </div>
                    <div
                      className="text-xs text-[#838389] font-mono truncate"
                      title={pair.pool_address}
                    >
                      {pair.pool_address.slice(0, 20)}...
                    </div>
                  </div>
                </div>
                <div className={`${chainStyle.light} rounded-lg p-3 border ${chainStyle.border}`}>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-[#57575B] mb-1">TVL</div>
                      <div className="text-sm font-bold text-[#010507]">{pair.tvl}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#57575B] mb-1">24h Volume</div>
                      <div className="text-sm font-bold text-[#010507]">{pair.volume_24h}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <div className="text-5xl mb-3">💧</div>
            <p className="text-base font-semibold text-gray-700 mb-1">No liquidity pools found</p>
          </div>
        )}
      </div>
    );
  }

  return null;
};
