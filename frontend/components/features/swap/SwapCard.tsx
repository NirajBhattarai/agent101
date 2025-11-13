/**
 * SwapCard Component
 *
 * Displays swap transaction information with status, fees, and estimated output.
 * Uses green/teal styling to match the Swap Agent branding.
 * Executes actual swap when user clicks swap button - supports all swap types (native/token).
 */

import React, { useState, useEffect } from "react";
import { SwapData } from "@/types";
import { useAppKitAccount } from "@reown/appkit/react";
import { useWalletClient } from "wagmi";
import { executeSwap as executeSwapTransaction } from "@/lib/features/swap";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { resetSwapState } from "@/lib/store/slices/swapSlice";
import {
  SwapCardHeader,
  ErrorMessage,
  BalanceCheck,
  SwapAmountSummary,
  HighAmountWarning,
  SwapOptionsList,
  TransactionInfo,
  ApprovalDialog,
  SwapError,
  TransactionStatus,
  SwapActionButton,
} from "./components";

interface SwapCardProps {
  data: SwapData;
  onSwapInitiate?: (dex: string) => void;
}

export const SwapCard: React.FC<SwapCardProps> = ({ data, onSwapInitiate }) => {
  const { transaction, balance_check, swap_options } = data;

  // Debug logging to verify swap direction
  useEffect(() => {
    console.log("💱 SwapCard Display Values:", {
      token_in_symbol: data.token_in_symbol,
      token_out_symbol: data.token_out_symbol,
      amount_in: data.amount_in,
      chain: data.chain,
    });
  }, [data]);

  const [swappingState, setSwappingState] = useState<"idle" | "swapping" | "done">("idle");
  const [selectedDex, setSelectedDex] = useState<string | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Redux hooks
  const dispatch = useAppDispatch();
  const {
    approvalStatus,
    isSwapping,
    swapError: reduxSwapError,
    txHash,
  } = useAppSelector((state) => state.swap);

  // Wallet connection hooks
  const { address, isConnected } = useAppKitAccount?.() || ({} as any);
  const { data: walletClient } = useWalletClient();

  // Reset swap state when component unmounts or transaction changes
  useEffect(() => {
    return () => {
      dispatch(resetSwapState());
    };
  }, [dispatch, transaction]);

  // Sync Redux swap error with local state
  useEffect(() => {
    if (reduxSwapError) {
      setSwapError(reduxSwapError);
    }
  }, [reduxSwapError]);

  // Show approval dialog when approval is needed
  useEffect(() => {
    if (approvalStatus?.status === "needs_approval") {
      setShowApprovalDialog(true);
    }
  }, [approvalStatus]);

  /**
   * Execute swap - uses centralized swap executor
   */
  const executeSwap = async () => {
    if (!isConnected) {
      setSwapError("Please connect your wallet first");
      return;
    }

    if (!address || !walletClient) {
      setSwapError("Wallet address or client not available");
      return;
    }

    if (!transaction) {
      setSwapError("No swap transaction data available");
      return;
    }

    setSwappingState("swapping");
    setSwapError(null);
    setShowApprovalDialog(false);
    dispatch(resetSwapState());

    const result = await executeSwapTransaction(
      transaction as any,
      walletClient,
      address,
      dispatch,
      {
        onStateChange: (state) => {
          setSwappingState(state);
        },
        onError: (error) => {
          setSwapError(error);
          setSwappingState("idle");
        },
        onTxHash: (hash) => {
          // TxHash is now managed by Redux
          console.log("Transaction hash:", hash);
        },
        onProgress: (message) => {
          console.log(message);
        },
      },
    );

    if (result.success) {
      onSwapInitiate?.(transaction?.dex_name || selectedDex || "SaucerSwap");
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 my-3 border-2 border-[#DBDBE5] shadow-elevation-md animate-fade-in-up">
      <SwapCardHeader data={data} />

      <ErrorMessage message={data.error || ""} />

      {balance_check && <BalanceCheck balance_check={balance_check} />}

      <SwapAmountSummary data={data} />

      <HighAmountWarning data={data} hasTransaction={!!transaction} />

      {swap_options && swap_options.length > 0 && !transaction && (
        <SwapOptionsList
          data={data}
          swap_options={swap_options}
          selectedDex={selectedDex}
          isConnected={isConnected}
          onSelectDex={setSelectedDex}
          onShowApprovalDialog={() => setShowApprovalDialog(true)}
          setSwapError={setSwapError}
        />
      )}

      {transaction && <TransactionInfo transaction={transaction} />}

      {transaction && (
        <TransactionStatus
          transaction={transaction}
          txHash={txHash}
          swappingState={swappingState}
        />
      )}

      {showApprovalDialog && (
        <ApprovalDialog
          data={data}
          swappingState={swappingState}
          onConfirm={executeSwap}
          onCancel={() => {
            setShowApprovalDialog(false);
            setSwapError(null);
          }}
        />
      )}

      <SwapError error={swapError} onDismiss={() => setSwapError(null)} />

      {transaction && (
        <SwapActionButton
          transaction={transaction}
          isConnected={isConnected}
          swappingState={swappingState}
          onShowApprovalDialog={() => setShowApprovalDialog(true)}
          setSwapError={setSwapError}
        />
      )}
    </div>
  );
};
