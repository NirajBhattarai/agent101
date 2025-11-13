/**
 * BalanceRequirementsForm Component
 *
 * HITL form that collects balance query details (account address, chain, token)
 * at the start of the workflow. Supports pre-filling from user messages
 * and validates input before submission.
 */

import React, { useState, useEffect, useMemo } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { BALANCE_TOKENS as STANDARD_TOKENS, type Token } from "@/lib/constants/tokens";
import { CHAIN_OPTIONS_WITH_ALL as CHAIN_OPTIONS } from "@/lib/constants/chains";
import { filterTokens, validateBalanceForm } from "./utils";

interface BalanceRequirementsFormProps {
  args: any;
  respond: any;
}

export const BalanceRequirementsForm: React.FC<BalanceRequirementsFormProps> = ({
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

  const [accountAddress, setAccountAddress] = useState("");
  const [chain, setChain] = useState("all");
  const [tokenAddress, setTokenAddress] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [tokenSearch, setTokenSearch] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const { address: reownAddress } = useAppKitAccount?.() || ({} as any);

  // Pre-fill form from orchestrator extraction
  useEffect(() => {
    if (parsedArgs && parsedArgs.accountAddress && parsedArgs.accountAddress !== accountAddress) {
      setAccountAddress(parsedArgs.accountAddress);
    }
    if (parsedArgs && parsedArgs.chain && parsedArgs.chain !== chain) {
      setChain(parsedArgs.chain);
    }
    if (parsedArgs && parsedArgs.tokenAddress && parsedArgs.tokenAddress !== tokenAddress) {
      setTokenAddress(parsedArgs.tokenAddress);
    }
  }, [parsedArgs?.accountAddress, parsedArgs?.chain, parsedArgs?.tokenAddress]);

  useEffect(() => {
    if (!accountAddress?.trim() && reownAddress) {
      setAccountAddress(reownAddress);
    }
  }, [accountAddress, reownAddress]);

  // Filter tokens based on search with regex support
  const filteredTokens = useMemo(() => {
    return filterTokens(STANDARD_TOKENS, tokenSearch, useRegex);
  }, [tokenSearch, useRegex]);

  const handleTokenSelect = (token: Token) => {
    setTokenAddress(token.symbol);
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
    const newErrors = validateBalanceForm({ accountAddress });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    setSubmitted(true);
    respond?.({
      accountAddress: accountAddress.trim(),
      chain,
      tokenAddress: tokenAddress.trim() || undefined,
    });
  };

  if (submitted) {
    return (
      <div className="bg-[#85E0CE]/30 backdrop-blur-md border-2 border-[#85E0CE] rounded-lg p-4 my-3 shadow-elevation-md">
        <div className="flex items-center gap-2">
          <div className="text-2xl">✓</div>
          <div>
            <h3 className="text-base font-semibold text-[#010507]">Balance Query Submitted</h3>
            <p className="text-xs text-[#57575B]">
              Fetching balance for {accountAddress} on {chain === "all" ? "all chains" : chain}
              {tokenAddress ? ` for token ${tokenAddress}` : ""}...
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
          <h3 className="text-base font-semibold text-[#010507]">Balance Query Details</h3>
          <p className="text-xs text-[#57575B]">
            Please provide account information to check balance
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
            onChange={(e) => setAccountAddress(e.target.value)}
            placeholder="e.g., 0.0.123456 (Hedera) or 0x1234... (EVM)"
            className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
              errors.accountAddress
                ? "border-[#FFAC4D] bg-[#FFAC4D]/10"
                : "border-[#DBDBE5] bg-white/80 backdrop-blur-sm focus:border-[#BEC2FF] focus:outline-none"
            }`}
          />
          {errors.accountAddress && (
            <p className="text-xs text-[#FFAC4D] mt-1">{errors.accountAddress}</p>
          )}
        </div>

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
            Token Address (Optional)
          </label>
          <div className="relative token-dropdown-container">
            <div className="flex gap-2">
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                onFocus={() => setShowTokenDropdown(true)}
                placeholder="e.g., USDC, 0x2791... (leave empty for all tokens)"
                className="flex-1 px-3 py-2 text-sm rounded-lg border-2 border-[#DBDBE5] bg-white/80 backdrop-blur-sm focus:border-[#BEC2FF] focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                className="px-3 py-2 bg-[#BEC2FF] hover:bg-[#A5A9FF] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                title="Select from standard tokens"
              >
                🔽
              </button>
            </div>

            {showTokenDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-md rounded-lg border-2 border-[#DBDBE5] shadow-elevation-lg max-h-80 overflow-hidden flex flex-col">
                {/* Search Bar with Regex Toggle */}
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
                  {useRegex && (
                    <p className="text-[10px] text-[#57575B]">
                      Regex enabled. Use patterns like: ^USDC$, HBAR|MATIC, etc.
                    </p>
                  )}
                </div>

                {/* Token List */}
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
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#010507]">{token.symbol}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {token.type}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#838389] font-mono truncate max-w-[120px]">
                            {token.address ? `${token.address.slice(0, 10)}...` : "N/A"}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#57575B] mt-0.5">{token.name}</div>
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
          <p className="text-xs text-[#57575B] mt-1">
            Leave empty to get all token balances, or specify a token symbol/address
          </p>
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={handleSubmit}
          className="w-full bg-[#1B936F] hover:bg-[#189370] text-white font-semibold py-2.5 px-4 text-sm rounded-lg transition-all shadow-elevation-md hover:shadow-elevation-lg"
        >
          Get Balance
        </button>
      </div>
    </div>
  );
};
