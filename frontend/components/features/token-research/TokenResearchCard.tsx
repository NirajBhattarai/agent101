/**
 * TokenResearchCard Component
 *
 * Displays token research results including token search and discovery.
 */

import React from "react";
import { TokenResearchData, TokenInfo } from "@/types";

interface TokenResearchCardProps {
  data: TokenResearchData;
}

export const TokenResearchCard: React.FC<TokenResearchCardProps> = ({ data }) => {
  const { query_type, search_result, discovery_result, error, token_symbol, chain } = data;

  if (error) {
    return (
      <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 my-3 border-2 border-red-200 shadow-elevation-md">
        <h3 className="text-xl font-semibold text-[#010507] mb-4">Token Research Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // Token Search Results
  if (query_type === "search" && search_result) {
    return (
      <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 my-3 border-2 border-[#DBDBE5] shadow-elevation-md">
        <h3 className="text-xl font-semibold text-[#010507] mb-4">
          Token Search Results: {search_result.token_symbol}
        </h3>

        {search_result.tokens.length > 0 ? (
          <div className="space-y-4">
            {search_result.tokens.map((token: TokenInfo, index: number) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-[#010507]">
                      {token.name} ({token.symbol})
                    </h4>
                    {token.chain && (
                      <span className="text-xs text-gray-500 capitalize">{token.chain}</span>
                    )}
                  </div>
                  {token.market_cap_rank && (
                    <span className="text-xs text-gray-500">Rank: #{token.market_cap_rank}</span>
                  )}
                </div>
                {token.address && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Contract Address:</p>
                    <p className="text-sm font-mono text-[#010507] break-all">{token.address}</p>
                  </div>
                )}
                {token.decimals && (
                  <p className="text-xs text-gray-500 mt-2">Decimals: {token.decimals}</p>
                )}
              </div>
            ))}
          </div>
        ) : search_result.web_results && search_result.web_results.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-3">
              No contract addresses found. Web search results:
            </p>
            {search_result.web_results.map((result, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <h5 className="font-semibold text-sm text-[#010507] mb-1">{result.title}</h5>
                <p className="text-xs text-gray-600">{result.snippet}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No results found for {search_result.token_symbol}</p>
        )}

        <p className="text-xs text-gray-500 mt-4">Source: {search_result.source}</p>
      </div>
    );
  }

  // Token Discovery Results
  if (query_type === "discovery" && discovery_result) {
    return (
      <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 my-3 border-2 border-[#DBDBE5] shadow-elevation-md">
        <h3 className="text-xl font-semibold text-[#010507] mb-4">
          Discovered Tokens ({discovery_result.total_tokens})
        </h3>

        <div className="space-y-6">
          {/* Tokens by Chain */}
          {Object.entries(discovery_result.tokens_by_chain).map(([chainName, tokens]) => {
            if (!tokens || tokens.length === 0) return null;
            return (
              <div key={chainName} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-[#010507] mb-3 capitalize">
                  {chainName} ({tokens.length} tokens)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tokens.map((token: TokenInfo, index: number) => (
                    <div
                      key={index}
                      className="bg-white rounded p-3 border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{token.symbol}</span>
                        {token.market_cap_rank && (
                          <span className="text-xs text-gray-500">#{token.market_cap_rank}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{token.name}</p>
                      {token.address && (
                        <p className="text-xs font-mono text-gray-500 truncate" title={token.address}>
                          {token.address}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 my-3 border-2 border-[#DBDBE5] shadow-elevation-md">
      <h3 className="text-xl font-semibold text-[#010507] mb-4">Token Research</h3>
      <p className="text-gray-600">No results available</p>
    </div>
  );
};

