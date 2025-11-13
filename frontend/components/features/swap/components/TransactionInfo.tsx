import React from "react";
import { SwapTransaction } from "@/types";
import { getDexIcon } from "@/lib/features/swap/swap-helpers";

interface TransactionInfoProps {
  transaction: SwapTransaction;
}

export const TransactionInfo: React.FC<TransactionInfoProps> = ({ transaction }) => {
  return (
    <div className="space-y-3">
      <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-elevation-sm border border-[#E9E9EF]">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[#57575B] mb-1">DEX</div>
            <div className="text-sm font-semibold text-[#010507] flex items-center gap-2">
              <span>{getDexIcon(transaction.dex_name)}</span>
              {transaction.dex_name}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#57575B] mb-1">Estimated Time</div>
            <div className="text-sm font-semibold text-[#010507]">{transaction.estimated_time}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[#E9E9EF]">
          <div className="text-xs text-[#57575B] mb-1">Swap Fee</div>
          <div className="text-lg font-bold text-[#010507]">{transaction.swap_fee}</div>
        </div>
        {transaction.price_impact && (
          <div className="mt-3 pt-3 border-t border-[#E9E9EF]">
            <div className="text-xs text-[#57575B] mb-1">Price Impact</div>
            <div className="text-sm font-semibold text-[#010507]">{transaction.price_impact}</div>
          </div>
        )}
      </div>

      {transaction.transaction_hash && transaction.status === "completed" && (
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-elevation-sm border border-[#E9E9EF]">
          <div className="text-xs text-[#57575B] mb-1">Transaction Hash</div>
          <a
            href={`https://hashscan.io/mainnet/transaction/${transaction.transaction_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-[#010507] break-all hover:text-blue-600 hover:underline"
          >
            {transaction.transaction_hash}
          </a>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-elevation-sm border border-[#E9E9EF]">
        <div className="text-xs text-[#57575B] mb-1">Token In Address</div>
        <div className="text-sm font-mono text-[#010507] break-all">
          {transaction.token_in_address}
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-elevation-sm border border-[#E9E9EF]">
        <div className="text-xs text-[#57575B] mb-1">Token Out Address</div>
        <div className="text-sm font-mono text-[#010507] break-all">
          {transaction.token_out_address}
        </div>
      </div>
    </div>
  );
};
