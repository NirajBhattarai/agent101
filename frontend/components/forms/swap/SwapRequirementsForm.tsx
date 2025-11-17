/**
 * SwapRequirementsForm Component
 *
 * HITL form that collects swap details (chain, token in, token out, amount, slippage)
 * at the start of the workflow. Supports pre-filling from user messages
 * and validates input before submission.
 */

import React, { useState, useEffect } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { CHAIN_OPTIONS } from "@/lib/constants/chains";
import { validateSwapForm, getDefaultTokensForChain } from "./utils";

interface SwapRequirementsFormProps {
  args: any;
  respond: any;
}

export const SwapRequirementsForm: React.FC<SwapRequirementsFormProps> = ({ args, respond }) => {
  let parsedArgs = args;
  if (typeof args === "string") {
    try {
      parsedArgs = JSON.parse(args);
    } catch (e) {
      parsedArgs = {};
    }
  }

  const [chain, setChain] = useState("");
  const [tokenInSymbol, setTokenInSymbol] = useState("");
  const [tokenOutSymbol, setTokenOutSymbol] = useState("");
  const [amountIn, setAmountIn] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState("0.5");
  const [accountAddress, setAccountAddress] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Removed dropdown state - using simple input fields only
  const { address: reownAddress } = useAppKitAccount?.() || ({} as any);

  // Pre-fill form from orchestrator extraction
  useEffect(() => {
    if (parsedArgs && parsedArgs.chain && parsedArgs.chain !== chain) {
      setChain(parsedArgs.chain);
      // Update default tokens based on chain
      const defaults = getDefaultTokensForChain(parsedArgs.chain);
      if (!parsedArgs.tokenInSymbol) setTokenInSymbol(defaults.tokenIn);
      if (!parsedArgs.tokenOutSymbol) setTokenOutSymbol(defaults.tokenOut);
    }
    if (parsedArgs && parsedArgs.tokenInSymbol && parsedArgs.tokenInSymbol !== tokenInSymbol) {
      setTokenInSymbol(parsedArgs.tokenInSymbol);
    }
    if (parsedArgs && parsedArgs.tokenOutSymbol && parsedArgs.tokenOutSymbol !== tokenOutSymbol) {
      setTokenOutSymbol(parsedArgs.tokenOutSymbol);
    }
    if (parsedArgs && parsedArgs.amountIn && parsedArgs.amountIn !== amountIn) {
      setAmountIn(parsedArgs.amountIn);
    }
    if (
      parsedArgs &&
      parsedArgs.slippageTolerance &&
      parsedArgs.slippageTolerance !== slippageTolerance
    ) {
      setSlippageTolerance(parsedArgs.slippageTolerance);
    }
    // Account address must be the connected wallet address and not editable
    if (reownAddress && reownAddress !== accountAddress) {
      setAccountAddress(reownAddress);
    }
  }, [
    parsedArgs?.chain,
    parsedArgs?.tokenInSymbol,
    parsedArgs?.tokenOutSymbol,
    parsedArgs?.amountIn,
    parsedArgs?.slippageTolerance,
    reownAddress,
  ]);

  // Update default tokens when chain changes
  useEffect(() => {
    if (!chain) {
      // Reset tokens when chain is deselected
      setTokenInSymbol("");
      setTokenOutSymbol("");
      return;
    }

    const defaults = getDefaultTokensForChain(chain);

    // Set defaults only if tokens are not set
    if (!tokenInSymbol) {
      setTokenInSymbol(defaults.tokenIn);
    }
    if (!tokenOutSymbol) {
      setTokenOutSymbol(defaults.tokenOut);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain]);

  // Removed all dropdown logic - using simple input fields only

  const validateForm = () => {
    const formData = {
      chain,
      tokenInSymbol,
      tokenOutSymbol,
      amountIn,
      slippageTolerance,
      accountAddress,
    };

    const newErrors = validateSwapForm(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    setSubmitted(true);
    // Ensure tokens are in capital letters
    respond?.({
      chain,
      tokenInSymbol: tokenInSymbol.trim().toUpperCase(),
      tokenOutSymbol: tokenOutSymbol.trim().toUpperCase(),
      amountIn: amountIn.trim(),
      slippageTolerance: slippageTolerance.trim(),
      accountAddress: accountAddress.trim(),
    });
  };

  if (submitted) {
    return (
      <div className="bg-[#85E0CE]/30 backdrop-blur-md border-2 border-[#85E0CE] rounded-lg p-4 my-3 shadow-elevation-md">
        <div className="flex items-center gap-2">
          <div className="text-2xl">✓</div>
          <div>
            <h3 className="text-base font-semibold text-[#010507]">Processing Swap Request</h3>
            <p className="text-xs text-[#57575B]">
              Analyzing optimal swap routes for {amountIn} {tokenInSymbol.toUpperCase()} →{" "}
              {tokenOutSymbol.toUpperCase()} on {chain}. Comparing rates across multiple DEXes...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#BEC2FF]/30 backdrop-blur-md border-2 border-[#BEC2FF] rounded-lg p-4 my-3 shadow-elevation-md">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-2xl">💱</div>
        <div>
          <h3 className="text-base font-semibold text-[#010507]">Token Swap Configuration</h3>
          <p className="text-xs text-[#57575B]">
            Configure your swap parameters. Enter token symbols in uppercase (e.g., USDC, HBAR,
            MATIC)
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-[#010507] mb-1.5">
            Account Address *
          </label>
          <input
            type="text"
            value={accountAddress}
            readOnly
            placeholder="Connected wallet address"
            className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
              errors.accountAddress
                ? "border-[#FFAC4D] bg-[#FFAC4D]/10"
                : "border-[#DBDBE5] bg-gray-50 text-gray-700"
            }`}
          />
          {errors.accountAddress && (
            <p className="text-xs text-[#FFAC4D] mt-1">{errors.accountAddress}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#010507] mb-1.5">Chain *</label>
          <div className="grid grid-cols-2 gap-2">
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
          {errors.chain && <p className="text-xs text-[#FFAC4D] mt-1">{errors.chain}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#010507] mb-1.5">Token In *</label>
          <input
            type="text"
            value={tokenInSymbol}
            onChange={(e) => setTokenInSymbol(e.target.value.toUpperCase())}
            placeholder="Enter token symbol (e.g., USDC, PEPE, MATIC)"
            className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
              errors.tokenInSymbol
                ? "border-[#FFAC4D] bg-[#FFAC4D]/10"
                : "border-[#DBDBE5] bg-white/80 backdrop-blur-sm focus:border-[#BEC2FF] focus:outline-none"
            }`}
          />
          {errors.tokenInSymbol && (
            <p className="text-xs text-[#FFAC4D] mt-1">{errors.tokenInSymbol}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#010507] mb-1.5">Token Out *</label>
          <input
            type="text"
            value={tokenOutSymbol}
            onChange={(e) => setTokenOutSymbol(e.target.value.toUpperCase())}
            placeholder="Enter token symbol (e.g., PEPE, SOL, USDC)"
            className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
              errors.tokenOutSymbol
                ? "border-[#FFAC4D] bg-[#FFAC4D]/10"
                : "border-[#DBDBE5] bg-white/80 backdrop-blur-sm focus:border-[#BEC2FF] focus:outline-none"
            }`}
          />
          {errors.tokenOutSymbol && (
            <p className="text-xs text-[#FFAC4D] mt-1">{errors.tokenOutSymbol}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#010507] mb-1.5">Amount In *</label>
          <input
            type="text"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            placeholder="e.g., 100.0"
            className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
              errors.amountIn
                ? "border-[#FFAC4D] bg-[#FFAC4D]/10"
                : "border-[#DBDBE5] bg-white/80 backdrop-blur-sm focus:border-[#BEC2FF] focus:outline-none"
            }`}
          />
          {errors.amountIn && <p className="text-xs text-[#FFAC4D] mt-1">{errors.amountIn}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#010507] mb-1.5">
            Slippage Tolerance (%) *
          </label>
          <input
            type="text"
            value={slippageTolerance}
            onChange={(e) => setSlippageTolerance(e.target.value)}
            placeholder="e.g., 0.5"
            className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
              errors.slippageTolerance
                ? "border-[#FFAC4D] bg-[#FFAC4D]/10"
                : "border-[#DBDBE5] bg-white/80 backdrop-blur-sm focus:border-[#BEC2FF] focus:outline-none"
            }`}
          />
          {errors.slippageTolerance && (
            <p className="text-xs text-[#FFAC4D] mt-1">{errors.slippageTolerance}</p>
          )}
          <p className="text-[10px] text-[#57575B] mt-1">
            Recommended: 0.5% for stablecoins, 1-3% for volatile pairs
          </p>
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={handleSubmit}
          className="w-full bg-[#1B936F] hover:bg-[#189370] text-white font-semibold py-2.5 px-4 text-sm rounded-lg transition-all shadow-elevation-md hover:shadow-elevation-lg"
        >
          Get Swap Quotes
        </button>
      </div>
    </div>
  );
};
