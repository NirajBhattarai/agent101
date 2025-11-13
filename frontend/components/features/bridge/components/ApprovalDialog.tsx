import React from "react";
import { BridgeData } from "@/types";
import { useAppSelector } from "@/lib/store/hooks";

interface ApprovalDialogProps {
  data: BridgeData;
  bridgingState: "idle" | "bridging" | "done";
  onConfirm: () => void;
  onCancel: () => void;
}

export const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
  data,
  bridgingState,
  onConfirm,
  onCancel,
}) => {
  const { transaction } = data;
  const { approvalStatus } = useAppSelector((state) => state.bridge);

  // Determine if this is an approval dialog or bridge confirmation
  const isApprovalNeeded =
    approvalStatus?.status === "needs_approval" ||
    approvalStatus?.status === "checking" ||
    approvalStatus?.status === "approving";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-orange-200">
        <h3 className="text-xl font-bold text-[#010507] mb-4">
          {isApprovalNeeded ? "Token Approval Required" : "Confirm Bridge"}
        </h3>
        {isApprovalNeeded && approvalStatus && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              {approvalStatus.status === "checking" && "Checking approval status..."}
              {approvalStatus.status === "needs_approval" &&
                `You need to approve ${approvalStatus.tokenSymbol} before bridging.`}
              {approvalStatus.status === "approving" && "Approving token..."}
              {approvalStatus.status === "approved" && "Token approved! Proceeding with bridge..."}
              {approvalStatus.status === "error" && `Approval error: ${approvalStatus.error}`}
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              This is required for bridging ERC20 tokens like USDC.
            </p>
          </div>
        )}
        <div className="space-y-3 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-[#57575B] mb-1">You are bridging</div>
            <div className="text-lg font-bold text-[#010507]">
              {data.amount} {data.token_symbol}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-[#57575B] mb-1">From</div>
            <div className="text-lg font-bold text-[#010507]">
              {data.source_chain.charAt(0).toUpperCase() + data.source_chain.slice(1)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-[#57575B] mb-1">To</div>
            <div className="text-lg font-bold text-[#010507]">
              {data.destination_chain.charAt(0).toUpperCase() + data.destination_chain.slice(1)}
            </div>
          </div>
          {transaction?.bridge_fee && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-[#57575B] mb-1">Bridge Fee</div>
              <div className="text-lg font-bold text-[#010507]">{transaction.bridge_fee}</div>
            </div>
          )}
          {transaction?.estimated_time && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-[#57575B] mb-1">Estimated Time</div>
              <div className="text-lg font-bold text-[#010507]">{transaction.estimated_time}</div>
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
              bridgingState === "bridging" ||
              approvalStatus?.status === "approving" ||
              approvalStatus?.status === "checking"
            }
            className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
              bridgingState === "bridging" ||
              approvalStatus?.status === "approving" ||
              approvalStatus?.status === "checking"
                ? "bg-yellow-500 text-white cursor-not-allowed"
                : "bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg"
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
            ) : bridgingState === "bridging" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Processing...
              </span>
            ) : isApprovalNeeded ? (
              "Approve & Bridge"
            ) : (
              "Confirm Bridge"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
