import React from "react";
import { SwapBalanceCheck } from "@/types";

interface BalanceCheckProps {
  balance_check: SwapBalanceCheck;
}

export const BalanceCheck: React.FC<BalanceCheckProps> = ({ balance_check }) => {
  return (
    <div
      className={`rounded-xl p-4 mb-4 border ${
        balance_check.balance_sufficient
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-[#57575B] mb-1">Balance Check</div>
          <div className="text-sm font-semibold text-[#010507]">
            {balance_check.balance_sufficient ? (
              <span className="text-green-700">✓ Sufficient Balance</span>
            ) : (
              <span className="text-red-700">✗ Insufficient Balance</span>
            )}
          </div>
          <div className="text-xs text-[#57575B] mt-1">
            Available: {balance_check.balance} {balance_check.token_symbol} | Required:{" "}
            {balance_check.required_amount} {balance_check.token_symbol}
          </div>
        </div>
        {!balance_check.balance_sufficient && <div className="text-red-600 font-bold">⚠️</div>}
      </div>
    </div>
  );
};
