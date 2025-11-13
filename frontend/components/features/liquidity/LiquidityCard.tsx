/**
 * LiquidityCard Component
 *
 * Displays liquidity pool information for both regular liquidity and parallel liquidity data.
 * Uses blue/purple gradient styling to match the Parallel Liquidity Agent branding.
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
  // Check if it's parallel liquidity data
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
      <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 my-3 border-2 border-[#DBDBE5] shadow-elevation-md animate-fade-in-up">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 shadow-lg">
                  <span className="text-2xl">💧🚀</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#010507] mb-1">Multi-Chain Liquidity</h2>
                  <div className="flex items-center gap-2">
                    {token_pair && (
                      <>
                        <span className="text-lg font-semibold text-[#010507]">
                          {base}/{quote}
                        </span>
                        <span className="text-xs text-[#838389]">across multiple chains</span>
                      </>
                    )}
                    {!token_pair && chain && (
                      <span className="text-lg font-semibold text-[#010507]">
                        {chain.charAt(0).toUpperCase() + chain.slice(1)} Chain
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-[#57575B] mb-1">Total Pools</div>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {all_pairs.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chain Sections */}
        {(hedera_pairs.length > 0 || chains?.hedera) && (
          <div className="mb-6">
            <div className="mb-4">
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 inline-flex items-center gap-2">
                <span className="text-lg">🟣</span>
                <h3 className="text-base font-bold text-purple-700">Hedera Chain</h3>
                <span className="text-xs text-purple-600 bg-white/60 px-2 py-1 rounded">
                  {hedera_pairs.length} pool{hedera_pairs.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            {hedera_pairs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hedera_pairs.map((pair, index) => {
                  const chainStyle = getChainColor("hedera");
                  return (
                    <div
                      key={index}
                      className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-elevation-sm border-2 border-[#E9E9EF] hover:border-purple-300 hover:shadow-elevation-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg font-bold text-[#010507]">{pair.dex}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold border border-purple-300">
                              {pair.fee_bps / 100}%
                            </span>
                          </div>
                          <div
                            className="text-xs text-[#838389] font-mono truncate"
                            title={pair.pool_address}
                          >
                            {pair.pool_address.slice(0, 20)}...
                          </div>
                        </div>
                      </div>
                      <div
                        className={`${chainStyle.light} rounded-lg p-3 border ${chainStyle.border}`}
                      >
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <div className="text-[10px] text-[#57575B] mb-1">TVL</div>
                            <div className="text-sm font-bold text-[#010507]">
                              {formatNumber(pair.tvl_usd)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#57575B] mb-1">Reserves</div>
                            <div className="text-xs font-semibold text-[#010507]">
                              {formatLargeNumber(pair.reserve_base)} {pair.base}
                            </div>
                            <div className="text-xs font-semibold text-[#010507]">
                              {formatLargeNumber(pair.reserve_quote)} {pair.quote}
                            </div>
                          </div>
                        </div>
                        {pair.slot0 && (
                          <div className="mt-2 pt-2 border-t border-purple-200">
                            <div className="text-[10px] text-[#57575B] mb-1">Slot0 Data</div>
                            <div className="text-xs font-mono text-[#010507] space-y-1">
                              <div>Tick: {pair.slot0.tick}</div>
                              <div className="truncate" title={pair.slot0.sqrtPriceX96}>
                                sqrtPriceX96: {pair.slot0.sqrtPriceX96?.slice(0, 20)}...
                              </div>
                            </div>
                          </div>
                        )}
                        {pair.liquidity && (
                          <div className="mt-2 pt-2 border-t border-purple-200">
                            <div className="text-[10px] text-[#57575B] mb-1">Liquidity</div>
                            <div
                              className="text-xs font-mono text-[#010507] truncate"
                              title={pair.liquidity}
                            >
                              {pair.liquidity.length > 20
                                ? `${pair.liquidity.slice(0, 20)}...`
                                : pair.liquidity}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border-2 border-dashed border-purple-200 text-center">
                <p className="text-sm text-purple-600">No liquidity pools found on Hedera</p>
              </div>
            )}
          </div>
        )}

        {(polygon_pairs.length > 0 || chains?.polygon) && (
          <div className="mb-6">
            <div className="mb-4">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 inline-flex items-center gap-2">
                <span className="text-lg">🔵</span>
                <h3 className="text-base font-bold text-blue-700">Polygon Chain</h3>
                <span className="text-xs text-blue-600 bg-white/60 px-2 py-1 rounded">
                  {polygon_pairs.length} pool{polygon_pairs.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            {polygon_pairs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {polygon_pairs.map((pair, index) => {
                  const chainStyle = getChainColor("polygon");
                  return (
                    <div
                      key={index}
                      className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-elevation-sm border-2 border-[#E9E9EF] hover:border-blue-300 hover:shadow-elevation-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg font-bold text-[#010507]">{pair.dex}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold border border-blue-300">
                              {pair.fee_bps / 100}%
                            </span>
                          </div>
                          <div
                            className="text-xs text-[#838389] font-mono truncate"
                            title={pair.pool_address}
                          >
                            {pair.pool_address.slice(0, 20)}...
                          </div>
                        </div>
                      </div>
                      <div
                        className={`${chainStyle.light} rounded-lg p-3 border ${chainStyle.border}`}
                      >
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <div className="text-[10px] text-[#57575B] mb-1">TVL</div>
                            <div className="text-sm font-bold text-[#010507]">
                              {formatNumber(pair.tvl_usd)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#57575B] mb-1">Reserves</div>
                            <div className="text-xs font-semibold text-[#010507]">
                              {formatLargeNumber(pair.reserve_base)} {pair.base}
                            </div>
                            <div className="text-xs font-semibold text-[#010507]">
                              {formatLargeNumber(pair.reserve_quote)} {pair.quote}
                            </div>
                          </div>
                        </div>
                        {pair.slot0 && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <div className="text-[10px] text-[#57575B] mb-1">Slot0 Data</div>
                            <div className="text-xs font-mono text-[#010507] space-y-1">
                              <div>Tick: {pair.slot0.tick}</div>
                              <div className="truncate" title={pair.slot0.sqrtPriceX96}>
                                sqrtPriceX96: {pair.slot0.sqrtPriceX96?.slice(0, 20)}...
                              </div>
                            </div>
                          </div>
                        )}
                        {pair.liquidity && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <div className="text-[10px] text-[#57575B] mb-1">Liquidity</div>
                            <div
                              className="text-xs font-mono text-[#010507] truncate"
                              title={pair.liquidity}
                            >
                              {pair.liquidity.length > 20
                                ? `${pair.liquidity.slice(0, 20)}...`
                                : pair.liquidity}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border-2 border-dashed border-blue-200 text-center">
                <p className="text-sm text-blue-600">No liquidity pools found on Polygon</p>
              </div>
            )}
          </div>
        )}

        {(ethereumPairs.length > 0 || chains?.ethereum) && (
          <div className="mb-6">
            <div className="mb-4">
              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200 inline-flex items-center gap-2">
                <span className="text-lg">💎</span>
                <h3 className="text-base font-bold text-indigo-700">Ethereum Chain</h3>
                <span className="text-xs text-indigo-600 bg-white/60 px-2 py-1 rounded">
                  {ethereumPairs.length} pool{ethereumPairs.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            {ethereumPairs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ethereumPairs.map((pair: any, index: number) => {
                  const chainStyle = getChainColor("ethereum");
                  return (
                    <div
                      key={index}
                      className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-elevation-sm border-2 border-[#E9E9EF] hover:border-indigo-300 hover:shadow-elevation-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg font-bold text-[#010507]">{pair.dex}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold border border-indigo-300">
                              {pair.fee_bps / 100}%
                            </span>
                          </div>
                          <div
                            className="text-xs text-[#838389] font-mono truncate"
                            title={pair.pool_address}
                          >
                            {pair.pool_address.slice(0, 20)}...
                          </div>
                        </div>
                      </div>
                      <div
                        className={`${chainStyle.light} rounded-lg p-3 border ${chainStyle.border}`}
                      >
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <div className="text-[10px] text-[#57575B] mb-1">TVL</div>
                            <div className="text-sm font-bold text-[#010507]">
                              {formatNumber(pair.tvl_usd)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#57575B] mb-1">Reserves</div>
                            <div className="text-xs font-semibold text-[#010507]">
                              {formatLargeNumber(pair.reserve_base)} {pair.base}
                            </div>
                            <div className="text-xs font-semibold text-[#010507]">
                              {formatLargeNumber(pair.reserve_quote)} {pair.quote}
                            </div>
                          </div>
                        </div>
                        {pair.slot0 && (
                          <div className="mt-2 pt-2 border-t border-indigo-200">
                            <div className="text-[10px] text-[#57575B] mb-1">Slot0 Data</div>
                            <div className="text-xs font-mono text-[#010507] space-y-1">
                              <div>Tick: {pair.slot0.tick}</div>
                              <div className="truncate" title={pair.slot0.sqrtPriceX96}>
                                sqrtPriceX96: {pair.slot0.sqrtPriceX96?.slice(0, 20)}...
                              </div>
                            </div>
                          </div>
                        )}
                        {pair.liquidity && (
                          <div className="mt-2 pt-2 border-t border-indigo-200">
                            <div className="text-[10px] text-[#57575B] mb-1">Liquidity</div>
                            <div
                              className="text-xs font-mono text-[#010507] truncate"
                              title={pair.liquidity}
                            >
                              {pair.liquidity.length > 20
                                ? `${pair.liquidity.slice(0, 20)}...`
                                : pair.liquidity}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border-2 border-dashed border-indigo-200 text-center">
                <p className="text-sm text-indigo-600">No liquidity pools found on Ethereum</p>
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
