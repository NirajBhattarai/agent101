/**
 * BridgeCard Component
 *
 * Displays bridge transaction information with status, fees, and estimated time.
 * Uses orange/amber styling to match the Bridge Agent branding.
 */

import React, { useState, useEffect } from "react";
import { BridgeData, BridgeOption, BridgeTransaction } from "@/types";
import { useAppKitAccount } from "@reown/appkit/react";
import { useWalletClient } from "wagmi";
import { executeBridge } from "@/lib/features/bridge";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { resetBridgeState } from "@/lib/store/slices/bridgeSlice";
import { ApprovalDialog } from "./components/ApprovalDialog";

interface BridgeCardProps {
  data: BridgeData;
  onBridgeInitiate?: (protocol: string) => void;
}

/**
 * Get chain badge color
 */
const getChainColor = (chain: string) => {
  const chainLower = chain.toLowerCase();
  if (chainLower === "hedera") {
    return "bg-gradient-to-r from-purple-500 to-indigo-500";
  }
  if (chainLower === "polygon") {
    return "bg-gradient-to-r from-blue-500 to-purple-500";
  }
  return "bg-gradient-to-r from-gray-500 to-gray-600";
};

/**
 * Get status badge color
 */
const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower === "completed") {
    return "bg-green-100 text-green-800 border-green-300";
  }
  if (statusLower === "pending") {
    return "bg-yellow-100 text-yellow-800 border-yellow-300";
  }
  if (statusLower === "failed") {
    return "bg-red-100 text-red-800 border-red-300";
  }
  return "bg-gray-100 text-gray-800 border-gray-300";
};

export const BridgeCard: React.FC<BridgeCardProps> = ({ data, onBridgeInitiate }) => {
  // Early validation
  if (!data) {
    console.error("❌ BridgeCard: No data provided!");
    return null;
  }

  const { transaction: initialTransaction, balance_check, bridge_options } = data;

  // Debug logging
  useEffect(() => {
    console.log("🌉 BridgeCard rendered with data:", {
      has_data: !!data,
      source_chain: data?.source_chain,
      destination_chain: data?.destination_chain,
      token_symbol: data?.token_symbol,
      amount: data?.amount,
      has_bridge_options: !!bridge_options,
      bridge_options_count: bridge_options?.length || 0,
      has_transaction: !!initialTransaction,
      has_balance_check: !!balance_check,
      full_data: data,
    });
    console.log("🌉 BridgeCard is visible in DOM");
  }, [data, bridge_options, initialTransaction, balance_check]);
  const [initiating, setInitiating] = useState<string | null>(null);
  const [bridgingState, setBridgingState] = useState<"idle" | "bridging" | "done">("idle");
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [pendingTransaction, setPendingTransaction] = useState<BridgeTransaction | null>(null);
  // Use pendingTransaction if created, otherwise use initialTransaction
  const transaction = pendingTransaction || initialTransaction;

  // Auto-create transaction from bridge options when they're available (like swap does)
  useEffect(() => {
    // Only auto-create if we have bridge_options but no transaction yet
    if (bridge_options && bridge_options.length > 0 && !transaction) {
      // Find recommended option or use first option
      const recommendedOption =
        bridge_options.find((opt) => opt.is_recommended) || bridge_options[0];

      if (recommendedOption && balance_check?.balance_sufficient) {
        const newTransaction: BridgeTransaction = {
          source_chain: data.source_chain,
          destination_chain: data.destination_chain,
          token_symbol: data.token_symbol,
          token_address: recommendedOption.token_address || "",
          amount: data.amount,
          bridge_protocol: recommendedOption.bridge_protocol,
          bridge_fee: recommendedOption.bridge_fee,
          estimated_time: recommendedOption.estimated_time,
          transaction_hash: null,
          status: "pending",
          bridge_contract_address:
            recommendedOption.bridge_contract_address ||
            "0xdc038e291d83e218c7bdf549059412ed7ed9133e",
          source_chain_id:
            recommendedOption.source_chain_id || (data.source_chain === "hedera" ? 296 : 30106),
          destination_chain_id:
            recommendedOption.destination_chain_id ||
            (data.destination_chain === "hedera" ? 296 : 30106),
        };
        setPendingTransaction(newTransaction);
        setSelectedProtocol(recommendedOption.bridge_protocol);
        console.log("🌉 Auto-created bridge transaction from options:", newTransaction);
      }
    }
  }, [bridge_options, transaction, balance_check, data]);

  // Wallet connection hooks
  const { address, isConnected } = useAppKitAccount?.() || ({} as any);
  const { data: walletClient } = useWalletClient();
  const dispatch = useAppDispatch();

  // Redux hooks
  const {
    approvalStatus,
    isBridging,
    bridgeError: reduxBridgeError,
    txHash,
  } = useAppSelector((state) => state.bridge);

  // Reset bridge state when component unmounts or transaction changes
  useEffect(() => {
    return () => {
      dispatch(resetBridgeState());
    };
  }, [dispatch, transaction]);

  // Sync Redux bridge error with local state
  useEffect(() => {
    if (reduxBridgeError) {
      setBridgeError(reduxBridgeError);
    }
  }, [reduxBridgeError]);

  // Show approval dialog when approval is needed
  useEffect(() => {
    if (approvalStatus?.status === "needs_approval") {
      setShowApprovalDialog(true);
    }
  }, [approvalStatus]);

  /**
   * Execute bridge transaction
   */
  const executeBridgeTransaction = async () => {
    if (!isConnected) {
      setBridgeError("Please connect your wallet first");
      return;
    }

    if (!address || !walletClient) {
      setBridgeError("Wallet address or client not available");
      return;
    }

    if (!transaction) {
      setBridgeError("No bridge transaction data available");
      return;
    }

    if (!balance_check?.balance_sufficient) {
      setBridgeError("Insufficient balance to bridge");
      return;
    }

    setBridgingState("bridging");
    setBridgeError(null);
    setShowConfirmation(false);
    setShowApprovalDialog(false);
    dispatch(resetBridgeState());

    const result = await executeBridge(transaction as any, walletClient, address, dispatch, {
      onStateChange: (state) => {
        setBridgingState(state);
      },
      onError: (error) => {
        setBridgeError(error);
        setBridgingState("idle");
      },
      onTxHash: (hash) => {
        console.log("Bridge transaction hash:", hash);
      },
      onProgress: (message) => {
        console.log(message);
      },
    });

    if (result.success) {
      onBridgeInitiate?.(transaction?.bridge_protocol || "EtaBridge");
    }
  };

  // Always render the card if we have bridge data
  console.log("🌉 BridgeCard render check:", {
    has_data: !!data,
    has_transaction: !!transaction,
    has_bridge_options: !!bridge_options,
    bridge_options_count: bridge_options?.length || 0,
  });

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 my-3 border-2 border-[#DBDBE5] shadow-elevation-md animate-fade-in-up">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🌉</span>
          <h2 className="text-2xl font-semibold text-[#010507]">
            {transaction ? "Bridge Transaction" : "Bridge Options"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getChainColor(data.source_chain)}`}
            >
              {data.source_chain.toUpperCase()}
            </span>
            <span className="text-gray-400 text-lg">→</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getChainColor(data.destination_chain)}`}
            >
              {data.destination_chain.toUpperCase()}
            </span>
          </div>
          {transaction && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(transaction.status)}`}
            >
              {transaction.status.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {(data.error || bridgeError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-800">{data.error || bridgeError}</p>
        </div>
      )}

      {/* Balance Check - Enhanced with help text */}
      {balance_check && (
        <div
          className={`rounded-xl p-4 mb-4 border ${
            balance_check.balance_sufficient
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xs text-[#57575B]">Balance Check</div>
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  💡 Balance from Balance Agent
                </div>
              </div>
              <div className="text-sm font-semibold text-[#010507] mb-1">
                {balance_check.balance_sufficient ? (
                  <span className="text-green-700">✓ Sufficient Balance</span>
                ) : (
                  <span className="text-red-700">✗ Insufficient Balance</span>
                )}
              </div>
              <div className="text-xs text-[#57575B]">
                Available:{" "}
                <span className="font-semibold">
                  {balance_check.balance} {balance_check.token_symbol}
                </span>
              </div>
              <div className="text-xs text-[#57575B] mt-1">
                Required:{" "}
                <span className="font-semibold">
                  {balance_check.required_amount} {balance_check.token_symbol}
                </span>
              </div>
              {!balance_check.balance_sufficient && (
                <div className="text-xs text-red-600 mt-2">
                  ⚠️ You need more {balance_check.token_symbol} to complete this bridge. Please add
                  funds to your wallet.
                </div>
              )}
            </div>
            {!balance_check.balance_sufficient && (
              <div className="text-red-600 font-bold text-2xl">⚠️</div>
            )}
          </div>
        </div>
      )}

      {/* Bridge Amount Summary */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-4 border border-orange-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[#57575B] mb-1">Amount to Bridge</div>
            <div className="text-2xl font-bold text-[#010507]">
              {data.amount} {data.token_symbol}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#57575B] mb-1">Bridge To</div>
            <div className="text-lg font-semibold text-[#010507]">
              {data.destination_chain.toUpperCase()}
            </div>
          </div>
        </div>
        {data.account_address && (
          <div className="mt-3 pt-3 border-t border-orange-200">
            <div className="text-xs text-[#57575B] mb-1">Account</div>
            <div className="text-sm font-mono text-[#010507] break-all">
              {data.account_address.slice(0, 10)}...{data.account_address.slice(-8)}
            </div>
          </div>
        )}
      </div>

      {/* High Amount Warning */}
      {data.amount_exceeds_threshold && data.requires_confirmation && !transaction && (
        <div className="mb-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-900 mb-1">Confirmation Required</h4>
              <p className="text-xs text-yellow-800">
                The bridge amount ({data.amount} {data.token_symbol}) exceeds the threshold of{" "}
                {data.confirmation_threshold} {data.token_symbol}. Please review the options below
                and confirm before proceeding.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bridge Options Display Box (if not yet initiated) */}
      {/* Show options if: no transaction (same as swap card) */}
      {/* Also show a loading/placeholder if bridge_options is empty but we have bridge data */}
      {!transaction && (
        <>
          {bridge_options && bridge_options.length > 0 ? (
            <div className="mb-4">
              <div className="bg-white/90 backdrop-blur-md rounded-xl p-5 border-2 border-[#DBDBE5] shadow-elevation-md">
                <h3 className="text-lg font-semibold text-[#010507] mb-2">
                  Available Bridge Protocols
                </h3>
                <p className="text-sm text-[#57575B] mb-4">
                  {data.requires_confirmation && data.amount_exceeds_threshold
                    ? "Please select a protocol and confirm to proceed with the bridge."
                    : "Please select a protocol to proceed with the bridge. You can say 'Proceed with [Protocol Name]' or click on a protocol below."}
                </p>
                <div className="space-y-3">
                  {bridge_options.map((option: BridgeOption, index: number) => (
                    <div
                      key={index}
                      onClick={() => {
                        if (balance_check?.balance_sufficient && !initiating) {
                          setSelectedProtocol(option.bridge_protocol);
                        }
                      }}
                      className={`rounded-lg p-4 border-2 transition-all cursor-pointer ${
                        selectedProtocol === option.bridge_protocol
                          ? "border-orange-500 bg-orange-50 ring-2 ring-orange-200"
                          : option.is_recommended
                            ? "border-orange-300 bg-orange-50/50 hover:border-orange-400 hover:bg-orange-50"
                            : "border-[#E9E9EF] bg-white/80 hover:border-orange-200 hover:bg-orange-50/30"
                      } ${!balance_check?.balance_sufficient ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-base font-bold text-[#010507]">
                              {option.bridge_protocol}
                            </span>
                            {option.is_recommended && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">
                                RECOMMENDED
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-[#57575B]">Fee: </span>
                              <span className="font-bold text-[#010507]">{option.bridge_fee}</span>
                            </div>
                            <div>
                              <span className="text-[#57575B]">Estimated Time: </span>
                              <span className="font-semibold text-[#010507]">
                                {option.estimated_time}
                              </span>
                            </div>
                          </div>
                        </div>
                        {selectedProtocol === option.bridge_protocol && (
                          <div className="ml-3 flex-shrink-0">
                            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">✓</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Option Action Button */}
                {selectedProtocol && (
                  <div className="mt-4 pt-4 border-t border-[#E9E9EF]">
                    {(() => {
                      const option = bridge_options.find(
                        (opt) => opt.bridge_protocol === selectedProtocol,
                      );
                      if (!option) return null;
                      return (
                        <button
                          onClick={() => {
                            if (!balance_check?.balance_sufficient || !isConnected) return;

                            // Create transaction object from selected option
                            if (option && !transaction) {
                              const newTransaction: BridgeTransaction = {
                                source_chain: data.source_chain,
                                destination_chain: data.destination_chain,
                                token_symbol: data.token_symbol,
                                token_address: option.token_address || "", // Get from bridge option
                                amount: data.amount,
                                bridge_protocol: option.bridge_protocol,
                                bridge_fee: option.bridge_fee,
                                estimated_time: option.estimated_time,
                                transaction_hash: null,
                                status: "pending",
                                bridge_contract_address:
                                  option.bridge_contract_address ||
                                  "0xdc038e291d83e218c7bdf549059412ed7ed9133e",
                                source_chain_id:
                                  option.source_chain_id ||
                                  (data.source_chain === "hedera" ? 296 : 30106),
                                destination_chain_id:
                                  option.destination_chain_id ||
                                  (data.destination_chain === "hedera" ? 296 : 30106),
                              };
                              setPendingTransaction(newTransaction);
                            }

                            setShowApprovalDialog(true);
                          }}
                          disabled={
                            !balance_check?.balance_sufficient ||
                            !isConnected ||
                            bridgingState === "bridging"
                          }
                          className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all shadow-sm ${
                            balance_check?.balance_sufficient &&
                            isConnected &&
                            bridgingState !== "bridging"
                              ? "bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          {bridgingState === "bridging" ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="animate-spin">⏳</span>
                              Bridging...
                            </span>
                          ) : !isConnected ? (
                            "Connect Wallet to Bridge"
                          ) : (
                            `Bridge with ${option.bridge_protocol}`
                          )}
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Show loading state if bridge_options is not yet available
            <div className="mb-4">
              <div className="bg-white/90 backdrop-blur-md rounded-xl p-5 border-2 border-[#DBDBE5] shadow-elevation-md">
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin text-4xl mb-2">⏳</div>
                    <p className="text-sm text-[#57575B]">Loading bridge options...</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Transaction Information (show when transaction exists, even without hash - like swap) */}
      {transaction && (
        <div className="space-y-3">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-elevation-sm border border-[#E9E9EF]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[#57575B] mb-1">Bridge Protocol</div>
                <div className="text-sm font-semibold text-[#010507]">
                  {transaction.bridge_protocol}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#57575B] mb-1">Estimated Time</div>
                <div className="text-sm font-semibold text-[#010507]">
                  {transaction.estimated_time}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#E9E9EF]">
              <div className="text-xs text-[#57575B] mb-1">Bridge Fee</div>
              <div className="text-lg font-bold text-[#010507]">{transaction.bridge_fee}</div>
            </div>
          </div>

          {transaction.transaction_hash && (
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-elevation-sm border border-[#E9E9EF]">
              <div className="text-xs text-[#57575B] mb-1">Transaction Hash</div>
              <div className="text-sm font-mono text-[#010507] break-all">
                {transaction.transaction_hash}
              </div>
            </div>
          )}

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-elevation-sm border border-[#E9E9EF]">
            <div className="text-xs text-[#57575B] mb-1">Token Address (Source Chain)</div>
            <div className="text-sm font-mono text-[#010507] break-all">
              {transaction.token_address}
            </div>
          </div>
        </div>
      )}

      {/* Status Messages - Only show if transaction has been executed (has hash) */}
      {transaction && transaction.transaction_hash && transaction.status === "pending" && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⏳ Bridge transaction is pending. Transaction hash:{" "}
            {transaction.transaction_hash.slice(0, 10)}...
          </p>
        </div>
      )}

      {transaction && transaction.transaction_hash && transaction.status === "completed" && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-green-800 mb-1">
                ✅ Bridge transaction completed successfully!
              </p>
              <p className="text-xs text-green-700">
                Your {transaction.amount} {transaction.token_symbol} have been bridged to{" "}
                {transaction.destination_chain}.
              </p>
            </div>
          </div>
        </div>
      )}

      {transaction && transaction.transaction_hash && transaction.status === "failed" && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">
            ❌ Bridge transaction failed. Please try again or contact support.
          </p>
        </div>
      )}

      {/* Bridge Action Button (like SwapActionButton) - Show when transaction is pending */}
      {transaction && transaction.status === "pending" && !transaction.transaction_hash && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <button
            onClick={() => {
              if (!isConnected) {
                setBridgeError("Please connect your wallet first");
                return;
              }
              setShowApprovalDialog(true);
            }}
            disabled={
              bridgingState === "bridging" || !isConnected || !balance_check?.balance_sufficient
            }
            className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all shadow-sm ${
              bridgingState === "bridging"
                ? "bg-yellow-500 text-white cursor-not-allowed"
                : !isConnected || !balance_check?.balance_sufficient
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg"
            }`}
          >
            {bridgingState === "bridging" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Bridging...
              </span>
            ) : !isConnected ? (
              "Connect Wallet to Bridge"
            ) : !balance_check?.balance_sufficient ? (
              "Insufficient Balance"
            ) : (
              `Execute Bridge with ${transaction.bridge_protocol}`
            )}
          </button>
        </div>
      )}

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <ApprovalDialog
          data={data}
          bridgingState={bridgingState}
          onConfirm={executeBridgeTransaction}
          onCancel={() => {
            setShowApprovalDialog(false);
            dispatch(resetBridgeState());
          }}
        />
      )}
    </div>
  );
};
