import React from "react";
import { SwapData } from "@/types";

interface SwapAmountSummaryProps {
  data: SwapData;
}

export const SwapAmountSummary: React.FC<SwapAmountSummaryProps> = ({ data }) => {
  const { transaction, swap_options } = data;

  return (
    <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4 mb-4 border border-green-200">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-[#57575B] mb-1">Amount In</div>
          <div className="text-2xl font-bold text-[#010507]">
            {data.amount_in} {data.token_in_symbol}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#57575B] mb-1">Amount Out</div>
          <div className="text-2xl font-bold text-green-600">
            {transaction?.amount_out || swap_options?.[0]?.amount_out || "—"}{" "}
            {data.token_out_symbol}
          </div>
        </div>
        {data.account_address && (
          <div className="col-span-2 mt-2">
            <div className="text-xs text-[#57575B] mb-1">Account</div>
            <div className="text-sm font-mono text-[#010507] break-all">
              {data.account_address.slice(0, 10)}...{data.account_address.slice(-8)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
