"use client";

import React from "react";
import type { MarketInsightsData } from "@/types";

interface MarketInsightsCardProps {
  data: MarketInsightsData;
}

const getNetworkColor = (network?: string): string => {
  const networkLower = network?.toLowerCase() || "";
  if (networkLower === "eth" || networkLower === "ethereum") {
    return "bg-blue-100 border-blue-300 text-blue-800";
  }
  if (networkLower === "polygon") {
    return "bg-purple-100 border-purple-300 text-purple-800";
  }
  if (networkLower === "hedera") {
    return "bg-green-100 border-green-300 text-green-800";
  }
  return "bg-gray-100 border-gray-300 text-gray-800";
};

const formatNumber = (num?: number): string => {
  if (!num) return "0";
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(2)}K`;
  }
  return `$${num.toFixed(2)}`;
};

const formatPriceChange = (change?: number): string => {
  if (!change) return "0%";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
};

export function MarketInsightsCard({ data }: MarketInsightsCardProps) {
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
        <h2 className="text-2xl font-semibold text-[#010507] mb-2">Market Insights</h2>
        {data.network && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getNetworkColor(data.network)}`}
          >
            {data.network.toUpperCase()}
          </span>
        )}
      </div>

      {/* Pool Liquidity */}
      {data.pool_liquidity && (
        <div className="mb-6 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-200">
          <h3 className="text-lg font-semibold text-[#010507] mb-3">Pool Liquidity</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-[#57575B] mb-1">Pool Address</div>
              <div className="text-sm font-mono text-[#010507] break-all">
                {data.pool_liquidity.pool_address}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#57575B] mb-1">Reserve (USD)</div>
              <div className="text-lg font-semibold text-[#010507]">
                {formatNumber(data.pool_liquidity.reserve_in_usd)}
              </div>
            </div>
            {data.pool_liquidity.volume_24h_usd && (
              <div>
                <div className="text-xs text-[#57575B] mb-1">24h Volume</div>
                <div className="text-lg font-semibold text-[#010507]">
                  {formatNumber(data.pool_liquidity.volume_24h_usd)}
                </div>
              </div>
            )}
            {data.pool_liquidity.price_change_24h !== undefined && (
              <div>
                <div className="text-xs text-[#57575B] mb-1">24h Change</div>
                <div
                  className={`text-lg font-semibold ${
                    data.pool_liquidity.price_change_24h >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatPriceChange(data.pool_liquidity.price_change_24h)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Token Liquidity */}
      {data.token_liquidity && (
        <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
          <h3 className="text-lg font-semibold text-[#010507] mb-3">Token Liquidity</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-[#57575B] mb-1">Token Address</div>
              <div className="text-sm font-mono text-[#010507] break-all">
                {data.token_liquidity.token_address}
              </div>
            </div>
            {data.token_liquidity.price_usd && (
              <div>
                <div className="text-xs text-[#57575B] mb-1">Price (USD)</div>
                <div className="text-lg font-semibold text-[#010507]">
                  ${data.token_liquidity.price_usd.toFixed(4)}
                </div>
              </div>
            )}
            {data.token_liquidity.total_reserve_in_usd && (
              <div>
                <div className="text-xs text-[#57575B] mb-1">Total Reserve</div>
                <div className="text-lg font-semibold text-[#010507]">
                  {formatNumber(data.token_liquidity.total_reserve_in_usd)}
                </div>
              </div>
            )}
            {data.token_liquidity.volume_24h_usd && (
              <div>
                <div className="text-xs text-[#57575B] mb-1">24h Volume</div>
                <div className="text-lg font-semibold text-[#010507]">
                  {formatNumber(data.token_liquidity.volume_24h_usd)}
                </div>
              </div>
            )}
            {data.token_liquidity.price_change_24h !== undefined && (
              <div>
                <div className="text-xs text-[#57575B] mb-1">24h Change</div>
                <div
                  className={`text-lg font-semibold ${
                    data.token_liquidity.price_change_24h >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatPriceChange(data.token_liquidity.price_change_24h)}
                </div>
              </div>
            )}
          </div>

          {/* Top Pools */}
          {data.token_liquidity.top_pools && data.token_liquidity.top_pools.length > 0 && (
            <div>
              <div className="text-xs text-[#57575B] mb-2">Top Pools</div>
              <div className="space-y-2">
                {data.token_liquidity.top_pools.map((pool, idx) => (
                  <div key={idx} className="bg-white/60 rounded-lg p-3 border border-indigo-100">
                    <div className="flex justify-between items-center">
                      <div className="text-xs font-mono text-[#010507]">
                        {pool.pool_address.slice(0, 20)}...
                      </div>
                      {pool.reserve_in_usd && (
                        <div className="text-sm font-semibold text-[#010507]">
                          {formatNumber(pool.reserve_in_usd)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trending Tokens */}
      {data.trending_tokens && data.trending_tokens.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200">
          <h3 className="text-lg font-semibold text-[#010507] mb-3">
            Trending Tokens ({data.trending_tokens.length})
          </h3>
          <div className="space-y-3">
            {data.trending_tokens.map((token, idx) => {
              const tokenAddress = token.token_address || "Unknown";
              const network = token.network || data.network || "unknown";

              return (
                <div
                  key={idx}
                  className="bg-white/60 rounded-lg p-4 border border-orange-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getNetworkColor(network)}`}
                        >
                          {network.toUpperCase()}
                        </span>
                        <span className="text-xs text-[#57575B]">Token</span>
                      </div>
                      <div className="text-sm font-semibold text-[#010507] mb-1">
                        {tokenAddress}
                      </div>
                      <div className="text-xs font-mono text-[#57575B] break-all">
                        {tokenAddress}
                      </div>
                    </div>
                    {token.price_usd && (
                      <div className="text-right ml-4">
                        <div className="text-xs text-[#57575B] mb-1">Price</div>
                        <div className="text-lg font-semibold text-[#010507]">
                          ${token.price_usd.toFixed(4)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    {token.volume_24h_usd && (
                      <div className="bg-blue-50 rounded p-2">
                        <div className="text-[#57575B] mb-1">24h Volume</div>
                        <div className="font-semibold text-[#010507]">
                          {formatNumber(token.volume_24h_usd)}
                        </div>
                      </div>
                    )}
                    {token.reserve_in_usd && (
                      <div className="bg-purple-50 rounded p-2">
                        <div className="text-[#57575B] mb-1">Liquidity</div>
                        <div className="font-semibold text-[#010507]">
                          {formatNumber(token.reserve_in_usd)}
                        </div>
                      </div>
                    )}
                    {token.price_change_24h !== undefined && (
                      <div
                        className={`rounded p-2 ${token.price_change_24h >= 0 ? "bg-green-50" : "bg-red-50"}`}
                      >
                        <div className="text-[#57575B] mb-1">24h Change</div>
                        <div
                          className={`font-semibold ${
                            token.price_change_24h >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatPriceChange(token.price_change_24h)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {(data.price_usd || data.volume_24h_usd) && (
        <div className="grid grid-cols-2 gap-4">
          {data.price_usd && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-xs text-blue-600 mb-1">Current Price</div>
              <div className="text-lg font-semibold text-blue-800">
                ${data.price_usd.toFixed(4)}
              </div>
            </div>
          )}
          {data.volume_24h_usd && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-xs text-purple-600 mb-1">24h Volume</div>
              <div className="text-lg font-semibold text-purple-800">
                {formatNumber(data.volume_24h_usd)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
