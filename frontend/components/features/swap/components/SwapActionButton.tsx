import React from "react";
import { SwapTransaction } from "@/types";

interface SwapActionButtonProps {
  transaction: SwapTransaction;
  isConnected: boolean;
  swappingState: "idle" | "swapping" | "done";
  onShowApprovalDialog: () => void;
  setSwapError: (error: string) => void;
}

export const SwapActionButton: React.FC<SwapActionButtonProps> = ({
  transaction,
  isConnected,
  swappingState,
  onShowApprovalDialog,
  setSwapError,
}) => {
  if (transaction.status !== "pending") return null;

  const handleClick = () => {
    if (!isConnected) {
      setSwapError("Please connect your wallet first");
      return;
    }
    onShowApprovalDialog();
  };

  return (
    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <button
        onClick={handleClick}
        disabled={swappingState === "swapping" || !isConnected}
        className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all shadow-sm ${
          swappingState === "swapping"
            ? "bg-yellow-500 text-white cursor-not-allowed"
            : !isConnected
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
        }`}
      >
        {swappingState === "swapping" ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            Swapping...
          </span>
        ) : !isConnected ? (
          "Connect Wallet to Swap"
        ) : (
          `Execute Swap with ${transaction.dex_name}`
        )}
      </button>
    </div>
  );
};
