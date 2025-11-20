/**
 * LiquidityRequirementsForm Component
 *
 * HITL form that collects liquidity query details (chain, token pair)
 * at the start of the workflow. Supports pre-filling from user messages
 * and validates input before submission.
 */

import React, { useState, useEffect } from "react";
import { CHAIN_OPTIONS_WITH_ALL as CHAIN_OPTIONS } from "@/lib/constants/chains";
import { validateLiquidityForm } from "./utils";

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

  // Pre-fill form from orchestrator extraction
  useEffect(() => {
    if (parsedArgs && parsedArgs.chain && parsedArgs.chain !== chain) {
      setChain(parsedArgs.chain);
    }
    if (parsedArgs && parsedArgs.tokenPair && parsedArgs.tokenPair !== tokenPair) {
      setTokenPair(parsedArgs.tokenPair);
    }
  }, [parsedArgs?.chain, parsedArgs?.tokenPair]);

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
            <h3 className="text-base font-semibold text-[#010507]">Analysis in Progress</h3>
            <p className="text-xs text-[#57575B]">
              Scanning liquidity pools on {chain === "all" ? "all networks" : chain}
              {tokenPair ? ` for ${tokenPair}` : ""}. This may take a few moments...
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
          <h3 className="text-base font-semibold text-[#010507]">Liquidity Pool Analysis</h3>
          <p className="text-xs text-[#57575B]">
            Specify network and token pair to analyze liquidity pools and trading opportunities
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-[#010507] mb-1.5">Chain *</label>
          <div
            className={`grid gap-2 ${CHAIN_OPTIONS.length === 4 ? "grid-cols-2" : CHAIN_OPTIONS.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
          >
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
          <input
            type="text"
            value={tokenPair}
            onChange={(e) => setTokenPair(e.target.value)}
            placeholder="e.g., HBAR/USDC, ETH/USDT, MATIC/USDC (leave empty for all pairs)"
            className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
              errors.tokenPair
                ? "border-[#FFAC4D] bg-[#FFAC4D]/10"
                : "border-[#DBDBE5] bg-white/80 backdrop-blur-sm focus:border-[#BEC2FF] focus:outline-none"
            }`}
          />
          {errors.tokenPair && <p className="text-xs text-[#FFAC4D] mt-1">{errors.tokenPair}</p>}
          <p className="text-xs text-[#57575B] mt-1">
            Leave empty to get all liquidity pairs, or specify a pair (e.g., HBAR/USDC, ETH/USDT)
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
