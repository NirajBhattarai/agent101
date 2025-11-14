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
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-[#57575B]">Token In Address</div>
          {transaction.discovered_tokens?.token_in && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
              🔍 Discovered
            </span>
          )}
        </div>
        <div className="text-sm font-mono text-[#010507] break-all">
          {transaction.token_in_address}
        </div>
        {transaction.discovered_tokens?.token_in?.name && (
          <div className="text-xs text-[#57575B] mt-1">
            {transaction.discovered_tokens.token_in.name}
          </div>
        )}
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-elevation-sm border border-[#E9E9EF]">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-[#57575B]">Token Out Address</div>
          {transaction.discovered_tokens?.token_out && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
              🔍 Discovered
            </span>
          )}
        </div>
        <div className="text-sm font-mono text-[#010507] break-all">
          {transaction.token_out_address}
        </div>
        {transaction.discovered_tokens?.token_out?.name && (
          <div className="text-xs text-[#57575B] mt-1">
            {transaction.discovered_tokens.token_out.name}
          </div>
        )}
      </div>
    </div>
  );
};
