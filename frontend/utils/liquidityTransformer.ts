/**
 * Transform backend liquidity response to frontend format
 */

import {
  LiquidityResponse,
  LiquidityResult,
  MultiChainLiquidityData,
  MultiChainLiquidityPair,
} from "@/types";

/**
 * Get token symbol from address
 * Uses shortened address format as fallback since we don't have a token registry
 */
function getTokenSymbol(address: string): string {
  // For Hedera native token (0x0000...0000)
  if (address.toLowerCase() === "0x0000000000000000000000000000000000000000") {
    return "HBAR";
  }

  // For other addresses, use shortened format
  // In production, this should call a token registry service or the backend should provide symbols
  if (address.startsWith("0x")) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // For Hedera format (0.0.xxxxx)
  if (address.includes(".")) {
    return address;
  }

  return address;
}

/**
 * Get DEX name from chain
 */
function getDexName(chain: string): string {
  const dexMap: Record<string, string> = {
    ethereum: "Uniswap V3",
    polygon: "Uniswap V3",
    hedera: "SaucerSwap",
  };
  return dexMap[chain.toLowerCase()] || "Unknown DEX";
}

/**
 * Transform a single liquidity result to frontend pair format
 */
function transformResultToPair(
  result: LiquidityResult,
  tokenASymbol?: string,
  tokenBSymbol?: string,
): MultiChainLiquidityPair | null {
  if (result.status !== "success" || !result.pool_address) {
    return null;
  }

  const base = tokenASymbol || getTokenSymbol(result.token_a);
  const quote = tokenBSymbol || getTokenSymbol(result.token_b);

  // Calculate TVL (simplified - would need actual reserves in production)
  const liquidityNum = result.liquidity ? parseFloat(result.liquidity) : 0;
  const tvlUsd = liquidityNum > 0 ? liquidityNum / 1e18 : 0; // Simplified calculation

  return {
    base,
    quote,
    pool_address: result.pool_address,
    dex: getDexName(result.chain),
    tvl_usd: tvlUsd,
    reserve_base: 0, // Would need to fetch from pool
    reserve_quote: 0, // Would need to fetch from pool
    fee_bps: result.fee,
    chain: result.chain,
    liquidity: result.liquidity || undefined,
    slot0: {
      sqrtPriceX96: result.sqrt_price_x96,
      tick: result.tick,
    },
  };
}

/**
 * Transform backend liquidity response to frontend format
 */
export function transformLiquidityResponse(response: LiquidityResponse): MultiChainLiquidityData {
  const { chain, token_a, token_b, results, error } = response;

  // Get token symbols
  const tokenASymbol = getTokenSymbol(token_a);
  const tokenBSymbol = getTokenSymbol(token_b);
  const tokenPair = `${tokenASymbol}/${tokenBSymbol}`;

  // Transform results to pairs
  const pairs: MultiChainLiquidityPair[] = [];
  const hederaPairs: MultiChainLiquidityPair[] = [];
  const polygonPairs: MultiChainLiquidityPair[] = [];
  const ethereumPairs: MultiChainLiquidityPair[] = [];

  for (const result of results) {
    const pair = transformResultToPair(result, tokenASymbol, tokenBSymbol);
    if (pair) {
      pairs.push(pair);
      if (result.chain === "hedera") {
        hederaPairs.push(pair);
      } else if (result.chain === "polygon") {
        polygonPairs.push(pair);
      } else if (result.chain === "ethereum") {
        ethereumPairs.push(pair);
      }
    }
  }

  // Build chains object
  const chains: MultiChainLiquidityData["chains"] = {};
  if (hederaPairs.length > 0) {
    chains.hedera = {
      pairs: hederaPairs,
      total_pools: hederaPairs.length,
    };
  }
  if (polygonPairs.length > 0) {
    chains.polygon = {
      pairs: polygonPairs,
      total_pools: polygonPairs.length,
    };
  }
  if (ethereumPairs.length > 0) {
    chains.ethereum = {
      pairs: ethereumPairs,
      total_pools: ethereumPairs.length,
    };
  }

  return {
    type: "multichain_liquidity",
    token_pair: tokenPair,
    chain: chain === "all" ? undefined : chain,
    chains,
    hedera_pairs: hederaPairs,
    polygon_pairs: polygonPairs,
    ethereum_pairs: ethereumPairs.length > 0 ? ethereumPairs : undefined,
    all_pairs: pairs,
    error,
  };
}
