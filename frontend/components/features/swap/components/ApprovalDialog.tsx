import React from "react";
import { SwapData } from "@/types";
import { useAppSelector } from "@/lib/store/hooks";

interface ApprovalDialogProps {
  data: SwapData;
  swappingState: "idle" | "swapping" | "done";
  onConfirm: () => void;
  onCancel: () => void;
}

export const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
  data,
  swappingState,
  onConfirm,
  onCancel,
}) => {
  const { transaction, swap_options } = data;
  const { approvalStatus } = useAppSelector((state) => state.swap);

  // Determine if this is an approval dialog or swap confirmation
  const isApprovalNeeded =
    approvalStatus?.status === "needs_approval" ||
    approvalStatus?.status === "checking" ||
    approvalStatus?.status === "approving";
  const isTokenToToken =
    !data.token_in_symbol?.match(/^(HBAR|ETH|MATIC)$/i) &&
    !data.token_out_symbol?.match(/^(HBAR|ETH|MATIC)$/i);
  const isTokenToNative =
    !data.token_in_symbol?.match(/^(HBAR|ETH|MATIC)$/i) &&
    data.token_out_symbol?.match(/^(HBAR|ETH|MATIC)$/i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-green-200">
        <h3 className="text-xl font-bold text-[#010507] mb-4">
          {isApprovalNeeded ? "Token Approval Required" : "Confirm Swap"}
        </h3>
        {isApprovalNeeded && approvalStatus && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              {approvalStatus.status === "checking" && "Checking approval status..."}
              {approvalStatus.status === "needs_approval" &&
                `You need to approve ${approvalStatus.tokenSymbol} before swapping.`}
              {approvalStatus.status === "approving" && "Approving token..."}
              {approvalStatus.status === "approved" && "Token approved! Proceeding with swap..."}
              {approvalStatus.status === "error" && `Approval error: ${approvalStatus.error}`}
            </p>
            {(isTokenToToken || isTokenToNative) && (
              <p className="text-xs text-yellow-700 mt-1">
                This is required for token-to-token or token-to-native swaps.
              </p>
            )}
          </div>
        )}
        <div className="space-y-3 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-[#57575B] mb-1">You are swapping</div>
            <div className="text-lg font-bold text-[#010507]">
              {data.amount_in} {data.token_in_symbol} → {data.token_out_symbol}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-[#57575B] mb-1">You will receive (estimated)</div>
            <div className="text-lg font-bold text-green-600">
              {swap_options?.[0]?.amount_out || transaction?.amount_out || "—"}{" "}
              {data.token_out_symbol}
            </div>
          </div>
          {transaction?.swap_fee && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-[#57575B] mb-1">Swap Fee</div>
              <div className="text-lg font-bold text-[#010507]">{transaction.swap_fee}</div>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-lg font-semibold text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={
              swappingState === "swapping" ||
              approvalStatus?.status === "approving" ||
              approvalStatus?.status === "checking"
            }
            className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
              swappingState === "swapping" ||
              approvalStatus?.status === "approving" ||
              approvalStatus?.status === "checking"
                ? "bg-yellow-500 text-white cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
            }`}
          >
            {approvalStatus?.status === "checking" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Checking...
              </span>
            ) : approvalStatus?.status === "approving" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Approving...
              </span>
            ) : swappingState === "swapping" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Processing...
              </span>
            ) : isApprovalNeeded ? (
              "Approve & Swap"
            ) : (
              "Confirm Swap"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
