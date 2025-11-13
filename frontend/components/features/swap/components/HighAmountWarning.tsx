import React from "react";
import { SwapData } from "@/types";

interface HighAmountWarningProps {
  data: SwapData;
  hasTransaction: boolean;
}

export const HighAmountWarning: React.FC<HighAmountWarningProps> = ({ data, hasTransaction }) => {
  if (!data.amount_exceeds_threshold || !data.requires_confirmation || hasTransaction) {
    return null;
  }

  return (
    <div className="mb-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">⚠️</div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-yellow-900 mb-1">Confirmation Required</h4>
          <p className="text-xs text-yellow-800">
            The swap amount ({data.amount_in} {data.token_in_symbol}) exceeds the threshold of{" "}
            {data.confirmation_threshold} {data.token_in_symbol}. Please review the options below
            and confirm before proceeding.
          </p>
        </div>
      </div>
    </div>
  );
};
