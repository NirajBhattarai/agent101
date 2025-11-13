/**
 * BridgeRequirementsForm Component
 *
 * HITL form that collects bridge details (source chain, destination chain, token, amount)
 * at the start of the workflow. Supports pre-filling from user messages
 * and validates input before submission.
 */

import React, { useState, useEffect, useMemo } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { BRIDGEABLE_TOKENS, type Token as BridgeableToken } from "@/lib/constants/tokens";
import { CHAIN_OPTIONS } from "@/lib/constants/chains";
import { filterTokens, validateBridgeForm } from "./utils";

interface BridgeRequirementsFormProps {
  args: any;
  respond: any;
}

export const BridgeRequirementsForm: React.FC<BridgeRequirementsFormProps> = ({
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

  const [sourceChain, setSourceChain] = useState("hedera");
  const [destinationChain, setDestinationChain] = useState("polygon");
  const [tokenSymbol, setTokenSymbol] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [accountAddress, setAccountAddress] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [tokenSearch, setTokenSearch] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const { address: reownAddress } = useAppKitAccount?.() || ({} as any);

  // Pre-fill form from orchestrator extraction
  useEffect(() => {
    if (parsedArgs && parsedArgs.sourceChain && parsedArgs.sourceChain !== sourceChain) {
      setSourceChain(parsedArgs.sourceChain);
    }
    if (
      parsedArgs &&
      parsedArgs.destinationChain &&
      parsedArgs.destinationChain !== destinationChain
    ) {
      setDestinationChain(parsedArgs.destinationChain);
    }
    if (parsedArgs && parsedArgs.tokenSymbol && parsedArgs.tokenSymbol !== tokenSymbol) {
      setTokenSymbol(parsedArgs.tokenSymbol);
    }
    if (parsedArgs && parsedArgs.amount && parsedArgs.amount !== amount) {
      setAmount(parsedArgs.amount);
    }
    // Account address must be the connected wallet address and not editable
    if (reownAddress && reownAddress !== accountAddress) {
      setAccountAddress(reownAddress);
    }
  }, [
    parsedArgs?.sourceChain,
    parsedArgs?.destinationChain,
    parsedArgs?.tokenSymbol,
    parsedArgs?.amount,
    reownAddress,
  ]);

  // Filter tokens based on search with regex support
  const filteredTokens = useMemo(() => {
    return filterTokens(BRIDGEABLE_TOKENS, tokenSearch, useRegex);
  }, [tokenSearch, useRegex]);

  const handleTokenSelect = (token: BridgeableToken) => {
    setTokenSymbol(token.symbol);
    setShowTokenDropdown(false);
    setTokenSearch("");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".token-dropdown-container")) {
        setShowTokenDropdown(false);
      }
    };

    if (showTokenDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showTokenDropdown]);

  const validateForm = () => {
    const newErrors = validateBridgeForm({
      accountAddress,
      sourceChain,
      destinationChain,
      amount,
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    setSubmitted(true);
    respond?.({
      sourceChain,
      destinationChain,
      tokenSymbol,
      amount: amount.trim(),
      accountAddress: accountAddress.trim(),
    });
  };

  if (submitted) {
    return (
      <div className="bg-[#85E0CE]/30 backdrop-blur-md border-2 border-[#85E0CE] rounded-lg p-4 my-3 shadow-elevation-md">
        <div className="flex items-center gap-2">
          <div className="text-2xl">✓</div>
          <div>
            <h3 className="text-base font-semibold text-[#010507]">Bridge Request Submitted</h3>
            <p className="text-xs text-[#57575B]">
              Checking balance and finding best bridge options for {amount} {tokenSymbol} from{" "}
              {sourceChain} to {destinationChain}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#BEC2FF]/30 backdrop-blur-md border-2 border-[#BEC2FF] rounded-lg p-4 my-3 shadow-elevation-md">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-2xl">🌉</div>
        <div>
          <h3 className="text-base font-semibold text-[#010507]">Bridge Token Details</h3>
          <p className="text-xs text-[#57575B]">Please provide bridge information</p>
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
          <label className="block text-xs font-medium text-[#010507] mb-1.5">Source Chain *</label>
          <div className="grid grid-cols-2 gap-2">
            {CHAIN_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSourceChain(option.value)}
                className={`py-2 px-3 rounded-lg font-medium text-xs transition-all shadow-elevation-sm ${
                  sourceChain === option.value
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
            Destination Chain *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CHAIN_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setDestinationChain(option.value)}
                className={`py-2 px-3 rounded-lg font-medium text-xs transition-all shadow-elevation-sm ${
                  destinationChain === option.value
                    ? "bg-[#BEC2FF] text-white shadow-elevation-md scale-105"
                    : "bg-white/80 backdrop-blur-sm text-[#010507] border-2 border-[#DBDBE5] hover:border-[#BEC2FF]"
                }`}
              >
                <div className="text-base mb-0.5">{option.icon}</div>
                <div>{option.label}</div>
              </button>
            ))}
          </div>
          {errors.destinationChain && (
            <p className="text-xs text-[#FFAC4D] mt-1">{errors.destinationChain}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#010507] mb-1.5">Token *</label>
          <div className="relative token-dropdown-container">
            <div className="flex gap-2">
              <input
                type="text"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                onFocus={() => setShowTokenDropdown(true)}
                placeholder="e.g., USDC, HBAR, MATIC"
                className="flex-1 px-3 py-2 text-sm rounded-lg border-2 border-[#DBDBE5] bg-white/80 backdrop-blur-sm focus:border-[#BEC2FF] focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                className="px-3 py-2 bg-[#BEC2FF] hover:bg-[#A5A9FF] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                title="Select token"
              >
                🔽
              </button>
            </div>

            {showTokenDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-md rounded-lg border-2 border-[#DBDBE5] shadow-elevation-lg max-h-80 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-[#DBDBE5]">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tokenSearch}
                      onChange={(e) => setTokenSearch(e.target.value)}
                      placeholder={useRegex ? "Regex pattern..." : "Search tokens..."}
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
                </div>

                <div className="overflow-y-auto flex-1">
                  {filteredTokens.length > 0 ? (
                    filteredTokens.map((token, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleTokenSelect(token)}
                        className="w-full px-3 py-2 text-left hover:bg-[#BEC2FF]/20 transition-colors border-b border-[#E9E9EF] last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[#010507]">{token.symbol}</span>
                          <span className="text-[10px] text-[#57575B]">{token.name}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-xs text-[#57575B]">
                      No tokens found matching "{tokenSearch}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#010507] mb-1.5">Amount *</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 100.0"
            className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
              errors.amount
                ? "border-[#FFAC4D] bg-[#FFAC4D]/10"
                : "border-[#DBDBE5] bg-white/80 backdrop-blur-sm focus:border-[#BEC2FF] focus:outline-none"
            }`}
          />
          {errors.amount && <p className="text-xs text-[#FFAC4D] mt-1">{errors.amount}</p>}
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={handleSubmit}
          className="w-full bg-[#1B936F] hover:bg-[#189370] text-white font-semibold py-2.5 px-4 text-sm rounded-lg transition-all shadow-elevation-md hover:shadow-elevation-lg"
        >
          Initiate Bridge
        </button>
      </div>
    </div>
  );
};
