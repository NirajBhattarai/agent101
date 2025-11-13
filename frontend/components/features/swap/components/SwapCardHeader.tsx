import React from "react";
import { getChainColor, getStatusColor } from "@/lib/features/swap/swap-helpers";
import { SwapData } from "@/types";

interface SwapCardHeaderProps {
  data: SwapData;
}

export const SwapCardHeader: React.FC<SwapCardHeaderProps> = ({ data }) => {
  const { transaction } = data;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">💱</span>
        <h2 className="text-2xl font-semibold text-[#010507]">
          {transaction ? "Swap Transaction" : "Swap Options"}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getChainColor(data.chain)}`}
        >
          {(data.chain || "UNKNOWN").toUpperCase()}
        </span>
        {transaction && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(transaction.status)}`}
          >
            {transaction.status.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
};
