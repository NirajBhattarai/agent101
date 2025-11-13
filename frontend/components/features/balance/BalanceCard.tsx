/**
 * BalanceCard Component
 *
 * Displays account balance information with token breakdowns and USD values.
 * Uses purple/indigo styling to match the Balance Agent branding.
 */

import React from "react";
import { BalanceData } from "@/types";

interface BalanceCardProps {
  data: BalanceData;
}

/**
 * Format token symbol for display
 */
const formatTokenSymbol = (symbol: string): string => {
  return symbol.toUpperCase();
};

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
  return {
    gradient: "bg-gradient-to-r from-gray-500 to-gray-600",
    light: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    icon: "⚪",
  };
};

/**
 * Get token icon based on symbol
 */
const getTokenIcon = (symbol: string, tokenType: string): string => {
  const sym = symbol.toUpperCase();
  if (tokenType === "native") {
    if (sym === "HBAR") return "💎";
    if (sym === "MATIC" || sym === "ETH") return "💠";
    return "🪙";
  }
  // Stablecoins
  if (sym === "USDC" || sym === "USDT") return "💵";
  if (sym.includes("USD")) return "💲";
  // Hedera tokens
  if (sym === "SAUCE") return "🍯";
  if (sym === "JAM") return "🎵";
  if (sym === "DOV") return "🌱";
  if (sym === "HBARX") return "💎";
  if (sym === "SHIBR") return "🐕";
  if (sym === "SKUX") return "📦";
  if (sym === "TNG") return "🔺";
  if (sym === "HTC") return "⚕️";
  // Polygon tokens
  if (sym === "WMATIC" || sym === "POL") return "💠";
  if (sym === "WETH") return "💎";
  if (sym === "DAI") return "💵";
  if (sym === "AAVE") return "🏦";
  if (sym === "LINK") return "🔗";
  if (sym === "QUICK") return "⚡";
  if (sym === "SAND") return "🏖️";
  return "🪙";
};

export const BalanceCard: React.FC<BalanceCardProps> = ({ data }) => {
  // Group balances by chain if multiple chains
  const balancesByChain =
    data.chain === "all"
      ? data.balances.reduce(
          (acc, balance) => {
            const chain = balance.chain || "unknown";
            if (!acc[chain]) acc[chain] = [];
            acc[chain].push(balance);
            return acc;
          },
          {} as Record<string, typeof data.balances>,
        )
      : { [data.chain]: data.balances };

  const chainInfo = data.chain !== "all" ? getChainColor(data.chain) : null;

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 my-3 border-2 border-[#DBDBE5] shadow-elevation-md animate-fade-in-up">
      {/* Header with Gradient Background */}
      <div className="mb-6">
        <div
          className={`${chainInfo?.light || "bg-gradient-to-r from-purple-50 to-indigo-50"} rounded-xl p-4 mb-4 border ${chainInfo?.border || "border-purple-200"}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400 shadow-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#010507] mb-1">Account Balance</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#838389] font-mono bg-white/60 px-2 py-1 rounded">
                    {data.account_address.slice(0, 10)}...{data.account_address.slice(-8)}
                  </span>
                  {data.chain !== "all" && chainInfo && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${chainInfo.gradient} flex items-center gap-1`}
                    >
                      <span>{chainInfo.icon}</span>
                      <span>{data.chain.toUpperCase()}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            {data.total_usd_value && (
              <div className="text-right">
                <div className="text-sm text-[#57575B] mb-1">Total Value</div>
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {data.total_usd_value}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {data.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-800">{data.error}</p>
        </div>
      )}

      {/* Balances by Chain */}
      {Object.entries(balancesByChain).map(([chain, balances]) => {
        const chainStyle = getChainColor(chain);
        return (
          <div key={chain} className="mb-6">
            {data.chain === "all" && (
              <div className="mb-4">
                <div
                  className={`${chainStyle.light} rounded-lg p-3 border ${chainStyle.border} inline-flex items-center gap-2`}
                >
                  <span className="text-lg">{chainStyle.icon}</span>
                  <h3 className={`text-base font-bold ${chainStyle.text}`}>
                    {chain.toUpperCase()} Chain
                  </h3>
                </div>
              </div>
            )}

            {/* Token Count Summary */}
            {balances.length > 0 && (
              <div className="mb-3 text-sm text-[#57575B]">
                Showing {balances.length} token{balances.length !== 1 ? "s" : ""}
              </div>
            )}

            {/* Token Balances Grid - Responsive columns for more tokens */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[800px] overflow-y-auto pr-2">
              {balances.map((balance, index) => {
                const tokenIcon = getTokenIcon(balance.token_symbol, balance.token_type);
                const isNative = balance.token_type === "native";

                return (
                  <div
                    key={index}
                    className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-elevation-sm border-2 border-[#E9E9EF] hover:border-purple-300 hover:shadow-elevation-md transition-all duration-200 group"
                  >
                    {/* Token Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${
                            isNative
                              ? "bg-gradient-to-br from-purple-400 to-indigo-500 shadow-lg"
                              : "bg-gradient-to-br from-indigo-400 to-blue-500 shadow-lg"
                          } group-hover:scale-110 transition-transform duration-200`}
                        >
                          <span className="text-xl">{tokenIcon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="text-lg font-bold text-[#010507] truncate">
                              {formatTokenSymbol(balance.token_symbol)}
                            </span>
                            {isNative ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 font-bold border border-purple-300 flex-shrink-0">
                                NATIVE
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-700 font-bold border border-indigo-300 flex-shrink-0">
                                TOKEN
                              </span>
                            )}
                          </div>
                          <div
                            className="text-[9px] text-[#838389] font-mono truncate"
                            title={balance.token_address}
                          >
                            {balance.token_address.length > 20
                              ? `${balance.token_address.slice(0, 10)}...${balance.token_address.slice(-8)}`
                              : balance.token_address}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Balance Amount */}
                    <div
                      className={`${chainStyle.light} rounded-lg p-2 mb-2 border ${chainStyle.border}`}
                    >
                      <div className="text-[10px] text-[#57575B] mb-0.5">Balance</div>
                      <div
                        className="text-xl font-bold text-[#010507] mb-0.5 truncate"
                        title={balance.balance}
                      >
                        {balance.balance}
                      </div>
                      <div
                        className="text-[9px] text-[#838389] font-mono truncate"
                        title={balance.balance_raw}
                      >
                        Raw:{" "}
                        {balance.balance_raw.length > 15
                          ? `${balance.balance_raw.slice(0, 10)}...`
                          : balance.balance_raw}
                      </div>
                    </div>

                    {/* Token Metadata */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-gray-50 rounded-lg p-1.5 text-center">
                        <div className="text-[9px] text-[#57575B] mb-0.5">Decimals</div>
                        <div className="text-xs font-bold text-[#010507]">{balance.decimals}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-1.5 text-center">
                        <div className="text-[9px] text-[#57575B] mb-0.5">Type</div>
                        <div className="text-xs font-bold text-[#010507] capitalize">
                          {balance.token_type}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {data.balances.length === 0 && !data.error && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
          <div className="text-5xl mb-3">💸</div>
          <p className="text-base font-semibold text-gray-700 mb-1">No balances found</p>
          <p className="text-sm text-gray-500">
            This account has no tokens on {data.chain !== "all" ? data.chain : "these chains"}
          </p>
        </div>
      )}
    </div>
  );
};
