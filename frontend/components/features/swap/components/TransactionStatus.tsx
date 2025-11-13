import React from "react";
import { SwapTransaction } from "@/types";

interface TransactionStatusProps {
  transaction: SwapTransaction;
  txHash?: string | null;
  swappingState?: "idle" | "swapping" | "done";
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  transaction,
  txHash,
  swappingState,
}) => {
  // Determine network for HashScan link
  const network = transaction.chain?.toLowerCase().includes("testnet") ? "testnet" : "mainnet";
  const hashScanUrl = (hash: string) => `https://hashscan.io/${network}/transaction/${hash}`;

  // Show success message when swap is done or transaction is completed
  const isCompleted = swappingState === "done" || transaction.status === "completed";
  const hasTxHash = txHash || transaction.transaction_hash;

  if (transaction.status === "pending" && !isCompleted) {
    return (
      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm text-yellow-800">
          ⏳ Swap transaction is pending. It will be completed in approximately{" "}
          {transaction.estimated_time}.
        </p>
      </div>
    );
  }

  if (isCompleted || transaction.status === "completed") {
    return (
      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-green-800 mb-1">
              ✅ Swap transaction completed successfully!
            </p>
            {transaction.amount_out && transaction.amount_in && (
              <p className="text-xs text-green-700">
                You received {transaction.amount_out} {transaction.token_out_symbol} for{" "}
                {transaction.amount_in} {transaction.token_in_symbol}.
              </p>
            )}
          </div>
        </div>
        {hasTxHash && (
          <div className="mt-3 pt-3 border-t border-green-200">
            <div className="text-xs text-green-800 mb-2 font-semibold">Transaction Hash</div>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={hashScanUrl(hasTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-green-900 break-all hover:text-green-700 hover:underline flex-1 min-w-0"
              >
                {hasTxHash}
              </a>
              <a
                href={hashScanUrl(hasTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-700 hover:text-green-900 underline whitespace-nowrap"
              >
                View on HashScan →
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (transaction.status === "failed") {
    return (
      <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-sm text-red-800">
          ❌ Swap transaction failed. Please try again or contact support.
        </p>
        {hasTxHash && (
          <div className="mt-3 pt-3 border-t border-red-200">
            <div className="text-xs text-red-800 mb-2">Transaction Hash</div>
            <a
              href={hashScanUrl(hasTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-red-900 break-all hover:text-red-700 hover:underline"
            >
              {hasTxHash}
            </a>
          </div>
        )}
      </div>
    );
  }

  // Show transaction hash even if status is not set but we have a hash and swap is done
  if (hasTxHash && swappingState === "done") {
    return (
      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-green-800 mb-1">
              ✅ Swap transaction completed successfully!
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-green-200">
          <div className="text-xs text-green-800 mb-2 font-semibold">Transaction Hash</div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={hashScanUrl(hasTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-green-900 break-all hover:text-green-700 hover:underline flex-1 min-w-0"
            >
              {hasTxHash}
            </a>
            <a
              href={hashScanUrl(hasTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-700 hover:text-green-900 underline whitespace-nowrap"
            >
              View on HashScan →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
