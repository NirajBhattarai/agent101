import React from "react";
import { SwapData } from "@/types";

interface SwapAmountSummaryProps {
  data: SwapData;
}

export const SwapAmountSummary: React.FC<SwapAmountSummaryProps> = ({ data }) => {
  const { transaction, swap_options } = data;
  
  const tokenInInfo = transaction?.discovered_tokens?.token_in;
  const tokenOutInfo = transaction?.discovered_tokens?.token_out;

  return (
    <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4 mb-4 border border-green-200">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-[#57575B] mb-1">Amount In</div>
          <div className="text-2xl font-bold text-[#010507]">
            {data.amount_in} {data.token_in_symbol}
          </div>
          {tokenInInfo?.address && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-[#57575B] font-mono break-all">
                {tokenInInfo.address}
              </div>
              {tokenInInfo.explorer_url && (
                <a
                  href={tokenInInfo.explorer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                >
                  View on {data.chain === "hedera" ? "HashScan" : data.chain === "polygon" ? "PolygonScan" : "Etherscan"} →
                </a>
              )}
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-[#57575B] mb-1">Amount Out</div>
          <div className="text-2xl font-bold text-green-600">
            {transaction?.amount_out || swap_options?.[0]?.amount_out || "—"}{" "}
            {data.token_out_symbol}
          </div>
          {tokenOutInfo?.address && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-[#57575B] font-mono break-all">
                {tokenOutInfo.address}
              </div>
              {tokenOutInfo.explorer_url && (
                <a
                  href={tokenOutInfo.explorer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                >
                  View on {data.chain === "hedera" ? "HashScan" : data.chain === "polygon" ? "PolygonScan" : "Etherscan"} →
                </a>
              )}
            </div>
          )}
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
