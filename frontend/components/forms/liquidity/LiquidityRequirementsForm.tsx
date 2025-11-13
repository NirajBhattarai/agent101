/**
 * LiquidityRequirementsForm Component
 *
 * HITL form that collects liquidity query details (chain, token pair)
 * at the start of the workflow. Supports pre-filling from user messages
 * and validates input before submission.
 */

import React, { useState, useEffect, useMemo } from "react";
import { STANDARD_PAIRS } from "@/lib/constants/tokens";
import { CHAIN_OPTIONS_WITH_ALL as CHAIN_OPTIONS } from "@/lib/constants/chains";
import { filterPairs, validateLiquidityForm } from "./utils";

interface LiquidityRequirementsFormProps {
  args: any;
  respond: any;
}

export const LiquidityRequirementsForm: React.FC<LiquidityRequirementsFormProps> = ({
  args,
  respond,
}) => {
  let parsedArgs = args;
  if (typeof args === "string") {
    try {
      parsedArgs = JSON.parse(args);
    } catch (e) {
      parsedArgs = {};
    }
  }

  const [chain, setChain] = useState("all");
  const [tokenPair, setTokenPair] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPairDropdown, setShowPairDropdown] = useState(false);
  const [pairSearch, setPairSearch] = useState("");
  const [useRegex, setUseRegex] = useState(false);

  // Pre-fill form from orchestrator extraction
  useEffect(() => {
    if (parsedArgs && parsedArgs.chain && parsedArgs.chain !== chain) {
      setChain(parsedArgs.chain);
    }
    if (parsedArgs && parsedArgs.tokenPair && parsedArgs.tokenPair !== tokenPair) {
      setTokenPair(parsedArgs.tokenPair);
    }
  }, [parsedArgs?.chain, parsedArgs?.tokenPair]);

  // Filter pairs based on search with regex support
  const filteredPairs = useMemo(() => {
    return filterPairs(STANDARD_PAIRS, pairSearch, useRegex);
  }, [pairSearch, useRegex]);

  const handlePairSelect = (pair: string) => {
    setTokenPair(pair);
    setShowPairDropdown(false);
    setPairSearch("");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".pair-dropdown-container")) {
        setShowPairDropdown(false);
      }
    };

    if (showPairDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPairDropdown]);

  const validateForm = () => {
    const newErrors = validateLiquidityForm({ tokenPair });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    setSubmitted(true);
    respond?.({
      chain,
      tokenPair: tokenPair.trim() || undefined,
    });
  };

  if (submitted) {
    return (
      <div className="bg-[#85E0CE]/30 backdrop-blur-md border-2 border-[#85E0CE] rounded-lg p-4 my-3 shadow-elevation-md">
        <div className="flex items-center gap-2">
          <div className="text-2xl">✓</div>
          <div>
            <h3 className="text-base font-semibold text-[#010507]">Liquidity Query Submitted</h3>
            <p className="text-xs text-[#57575B]">
              Fetching liquidity pools on {chain === "all" ? "all chains" : chain}
              {tokenPair ? ` for pair ${tokenPair}` : ""}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#BEC2FF]/30 backdrop-blur-md border-2 border-[#BEC2FF] rounded-lg p-4 my-3 shadow-elevation-md">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-2xl">💧</div>
        <div>
          <h3 className="text-base font-semibold text-[#010507]">Liquidity Query Details</h3>
          <p className="text-xs text-[#57575B]">Please provide chain and token pair information</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-[#010507] mb-1.5">Chain *</label>
          <div className="grid grid-cols-3 gap-2">
            {CHAIN_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setChain(option.value)}
                className={`py-2 px-3 rounded-lg font-medium text-xs transition-all shadow-elevation-sm ${
                  chain === option.value
                    ? "bg-[#BEC2FF] text-white shadow-elevation-md scale-105"
                    : "bg-white/80 backdrop-blur-sm text-[#010507] border-2 border-[#DBDBE5] hover:border-[#BEC2FF]"
                }`}
              >
                <div className="text-base mb-0.5">{option.icon}</div>
                <div>{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#010507] mb-1.5">
            Token Pair (Optional)
          </label>
          <div className="relative pair-dropdown-container">
            <div className="flex gap-2">
              <input
                type="text"
                value={tokenPair}
                onChange={(e) => setTokenPair(e.target.value.toUpperCase())}
                onFocus={() => setShowPairDropdown(true)}
                placeholder="e.g., HBAR/USDC, MATIC/USDC (leave empty for all pairs)"
                className={`flex-1 px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
                  errors.tokenPair
                    ? "border-[#FFAC4D] bg-[#FFAC4D]/10"
                    : "border-[#DBDBE5] bg-white/80 backdrop-blur-sm focus:border-[#BEC2FF] focus:outline-none"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPairDropdown(!showPairDropdown)}
                className="px-3 py-2 bg-[#BEC2FF] hover:bg-[#A5A9FF] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                title="Select from standard pairs"
              >
                🔽
              </button>
            </div>

            {showPairDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-md rounded-lg border-2 border-[#DBDBE5] shadow-elevation-lg max-h-80 overflow-hidden flex flex-col">
                {/* Search Bar with Regex Toggle */}
                <div className="p-2 border-b border-[#DBDBE5]">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={pairSearch}
                      onChange={(e) => setPairSearch(e.target.value)}
                      placeholder={useRegex ? "Regex pattern..." : "Search pairs..."}
                      className="flex-1 px-2 py-1.5 text-xs rounded border border-[#DBDBE5] bg-white focus:border-[#BEC2FF] focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      type="button"
                      onClick={() => setUseRegex(!useRegex)}
                      className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                        useRegex
                          ? "bg-purple-100 border-purple-300 text-purple-700 font-semibold"
                          : "bg-gray-100 border-gray-300 text-gray-600"
                      }`}
                      title={useRegex ? "Using regex search" : "Click to enable regex"}
                    >
                      {useRegex ? ".*" : ".*"}
                    </button>
                  </div>
                  {useRegex && (
                    <p className="text-[10px] text-[#57575B]">
                      Regex enabled. Use patterns like: ^HBAR/, USDC$, HBAR|MATIC, etc.
                    </p>
                  )}
                </div>

                {/* Pair List */}
                <div className="overflow-y-auto flex-1">
                  {filteredPairs.length > 0 ? (
                    filteredPairs.map((pair, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePairSelect(pair)}
                        className="w-full px-3 py-2 text-left hover:bg-[#BEC2FF]/20 transition-colors border-b border-[#E9E9EF] last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#010507]">{pair}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-xs text-[#57575B]">
                      No pairs found matching "{pairSearch}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {errors.tokenPair && <p className="text-xs text-[#FFAC4D] mt-1">{errors.tokenPair}</p>}
          <p className="text-xs text-[#57575B] mt-1">
            Leave empty to get all liquidity pairs, or specify a pair (e.g., HBAR/USDC)
          </p>
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={handleSubmit}
          className="w-full bg-[#1B936F] hover:bg-[#189370] text-white font-semibold py-2.5 px-4 text-sm rounded-lg transition-all shadow-elevation-md hover:shadow-elevation-lg"
        >
          Get Liquidity
        </button>
      </div>
    </div>
  );
};
