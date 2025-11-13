"use client";

/**
 * LiquidityPaymentForm Component
 *
 * x402 payment form for liquidity queries. Users must pay before accessing liquidity data.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useAppKitAccount, useAppKit } from "@reown/appkit/react";
import { useWalletClient } from "wagmi";
import { ethers } from "ethers";
import {
  AccountId,
  Client,
  TransferTransaction,
  TransactionId,
  Hbar,
} from "@hashgraph/sdk";
import {
  PaymentRequirements,
  PaymentPayload,
  VerifyResponse,
  SettleResponse,
  serializeTransaction,
  createSignableMessage,
  signMessageWithWallet,
  accountIdToEvmAddress,
} from "@/lib/shared/blockchain/hedera/facilitator";

interface LiquidityPaymentFormProps {
  args: any;
  respond: any;
  onPaymentComplete?: (paymentProof: string) => void;
}

export const LiquidityPaymentForm: React.FC<LiquidityPaymentFormProps> = ({
  args,
  respond,
  onPaymentComplete,
}) => {
  const { address, isConnected } = useAppKitAccount?.() || ({} as any);
  const { open } = useAppKit?.() || ({} as any);
  const { data: walletClient } = useWalletClient();

  let parsedArgs = args;
  if (typeof args === "string") {
    try {
      parsedArgs = JSON.parse(args);
    } catch (e) {
      parsedArgs = {};
    }
  }

  const [network, setNetwork] = useState("hedera-testnet");
  const [amount, setAmount] = useState("10000000"); // 0.1 HBAR in tinybars (default payment for liquidity query)
  const [payerAccountId, setPayerAccountId] = useState("");
  const [facilitatorAccountId, setFacilitatorAccountId] = useState("");
  const [payToAccountId, setPayToAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "creating" | "verifying" | "verified" | "settling" | "completed" | "error"
  >("idle");
  const [paymentProof, setPaymentProof] = useState<string | null>(null);
  const [storedPaymentPayload, setStoredPaymentPayload] = useState<PaymentPayload | null>(null);
  const [storedPaymentRequirements, setStoredPaymentRequirements] = useState<PaymentRequirements | null>(null);

  // Fetch facilitator account ID
  useEffect(() => {
    fetch("/api/facilitator/supported")
      .then((res) => res.json())
      .then((data) => {
        if (data.kinds && data.kinds.length > 0) {
          const networkKind = data.kinds.find((k: any) => k.network === network);
          if (networkKind?.extra?.feePayer) {
            setFacilitatorAccountId(networkKind.extra.feePayer);
            setPayToAccountId(networkKind.extra.feePayer);
          }
        }
      })
      .catch((err) => console.error("Failed to fetch facilitator info:", err));
  }, [network]);

  // Helper to create Hedera client
  const createClient = (network: string): Client => {
    if (network === "hedera-testnet") {
      return Client.forTestnet();
    } else if (network === "hedera-mainnet") {
      return Client.forMainnet();
    } else {
      throw new Error(`Unsupported network: ${network}`);
    }
  };

  // Create HBAR transfer transaction
  const createHbarTransferTransaction = (
    fromAccount: AccountId,
    toAccount: AccountId,
    facilitatorAccount: AccountId,
    amount: string,
    client: Client,
  ): TransferTransaction => {
    const transactionId = TransactionId.generate(facilitatorAccount);
    const transaction = new TransferTransaction()
      .setTransactionId(transactionId)
      .addHbarTransfer(fromAccount, Hbar.fromTinybars(-parseInt(amount)))
      .addHbarTransfer(toAccount, Hbar.fromTinybars(parseInt(amount)));
    return transaction.freezeWith(client);
  };

  const handlePayment = async () => {
    if (!isConnected) {
      open?.();
      setError("Please connect your wallet first");
      return;
    }

    if (!payerAccountId || !payToAccountId || !facilitatorAccountId) {
      setError("Missing account information. Please ensure facilitator is configured.");
      return;
    }

    if (!walletClient) {
      setError("Wallet not connected. Please connect your wallet.");
      return;
    }

    setLoading(true);
    setError(null);
    setPaymentStatus("creating");

    try {
      const client = createClient(network);
      const payerAccountIdObj = AccountId.fromString(payerAccountId);
      const facilitatorAccountIdObj = AccountId.fromString(facilitatorAccountId);
      const toAccountIdObj = AccountId.fromString(payToAccountId);

      // Create transaction
      const transaction = createHbarTransferTransaction(
        payerAccountIdObj,
        toAccountIdObj,
        facilitatorAccountIdObj,
        amount,
        client,
      );

      const transactionId = transaction.transactionId!.toString();
      console.log("✅ Transaction created. Transaction ID:", transactionId);

      // Create signable message
      const walletAddress = address || "";
      const signedMessage = createSignableMessage(
        network,
        payerAccountId,
        payToAccountId,
        amount,
        "0.0.0", // HBAR
        transactionId,
      );

      // Sign message with wallet
      const provider = new ethers.BrowserProvider(walletClient as any);
      const walletSignature = await signMessageWithWallet(provider, signedMessage);
      console.log("✅ Message signed with wallet");

      // Serialize transaction
      const transactionBytes = Buffer.from(transaction.toBytes()).toString("base64");

      // Create payment requirements
      const paymentRequirements: PaymentRequirements = {
        scheme: "exact",
        network,
        maxAmountRequired: amount,
        asset: "0.0.0", // HBAR
        payTo: payToAccountId,
        resource: "liquidity-query",
        description: "Payment for multi-chain liquidity pool aggregator query",
        mimeType: "application/json",
        maxTimeoutSeconds: 60,
        extra: {
          feePayer: facilitatorAccountId,
        },
      };

      // Step 1: Create payment payload
      setPaymentStatus("creating");
      const createPayloadResponse = await fetch("/api/facilitator/create-payload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentRequirements,
          payerAccountId,
          walletSignature,
          walletAddress,
          signedMessage,
          transactionBytes,
          transactionId,
        }),
      });

      if (!createPayloadResponse.ok) {
        const errorData = await createPayloadResponse.json();
        throw new Error(errorData.error || "Failed to create payment payload");
      }

      const { paymentPayload } = await createPayloadResponse.json();
      console.log("✅ Payment payload created");

      // Step 2: Verify payment
      setPaymentStatus("verifying");
      const verifyResponse = await fetch("/api/facilitator/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentPayload,
          paymentRequirements,
          walletSignature,
          walletAddress,
          signedMessage,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || "Payment verification failed");
      }

      const verifyData: VerifyResponse = await verifyResponse.json();
      if (!verifyData.isValid) {
        throw new Error(verifyData.invalidReason || "Payment verification failed");
      }
      console.log("✅ Payment verified");

      // Store payment payload and requirements for later settlement
      setStoredPaymentPayload(paymentPayload);
      setStoredPaymentRequirements(paymentRequirements);
      setPaymentStatus("verified");

      // Notify parent component that payment is verified (but not settled yet)
      onPaymentComplete?.(JSON.stringify({ paymentPayload, paymentRequirements }));

      // Respond to orchestrator with verification status (settlement happens after response)
      respond?.({
        paymentVerified: true,
        paymentPayload: paymentPayload,
        paymentRequirements: paymentRequirements,
        readyForQuery: true,
      });
    } catch (err) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
      setPaymentStatus("error");
    } finally {
      setLoading(false);
    }
  };

  // Function to settle payment (called after liquidity response)
  const settlePayment = useCallback(async () => {
    if (!storedPaymentPayload || !storedPaymentRequirements) {
      setError("Payment data not found");
      return;
    }

    setPaymentStatus("settling");
    setLoading(true);
    setError(null);

    try {
      const settleResponse = await fetch("/api/facilitator/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentPayload: storedPaymentPayload,
          paymentRequirements: storedPaymentRequirements,
        }),
      });

      if (!settleResponse.ok) {
        const errorData = await settleResponse.json();
        throw new Error(errorData.error || "Payment settlement failed");
      }

      const settleData: SettleResponse = await settleResponse.json();
      if (!settleData.success) {
        throw new Error(settleData.errorReason || "Payment settlement failed");
      }

      console.log("✅ Payment settled. Transaction:", settleData.transaction);
      setPaymentProof(settleData.transaction);
      setPaymentStatus("completed");
    } catch (err) {
      console.error("Settlement error:", err);
      setError(err instanceof Error ? err.message : "Payment settlement failed");
      setPaymentStatus("error");
    } finally {
      setLoading(false);
    }
  }, [storedPaymentPayload, storedPaymentRequirements]);

  // Expose settle function via window for DeFiChat to call
  useEffect(() => {
    if (paymentStatus === "verified" && storedPaymentPayload) {
      (window as any).__liquidityPaymentSettle = settlePayment;
    }
    return () => {
      delete (window as any).__liquidityPaymentSettle;
    };
  }, [paymentStatus, storedPaymentPayload, settlePayment]);

  if (paymentStatus === "verified") {
    return (
      <div className="bg-blue-50/80 backdrop-blur-md border-2 border-blue-300 rounded-lg p-4 my-3 shadow-elevation-md">
        <div className="flex items-center gap-2">
          <div className="text-2xl">✅</div>
          <div>
            <h3 className="text-base font-semibold text-blue-800">Payment Verified</h3>
            <p className="text-xs text-blue-600 mt-1">
              Payment has been verified. Proceeding with liquidity query...
            </p>
            <p className="text-xs text-blue-500 mt-1">
              Settlement will occur after you receive the liquidity data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStatus === "completed" && paymentProof) {
    return (
      <div className="bg-green-50/80 backdrop-blur-md border-2 border-green-300 rounded-lg p-4 my-3 shadow-elevation-md">
        <div className="flex items-center gap-2">
          <div className="text-2xl">✅</div>
          <div>
            <h3 className="text-base font-semibold text-green-800">Payment Settled</h3>
            <p className="text-xs text-green-600 mt-1">
              Transaction: {paymentProof}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Payment has been completed on-chain.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50/80 backdrop-blur-md border-2 border-yellow-300 rounded-lg p-4 my-3 shadow-elevation-md">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-2xl">💳</div>
        <div>
          <h3 className="text-base font-semibold text-[#010507]">
            Payment Required for Liquidity Query
          </h3>
          <p className="text-xs text-[#57575B]">
            Pay {parseInt(amount) / 100000000} HBAR to access multi-chain liquidity data
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-[#010507] mb-1.5">
            Payer Account ID (Hedera)
          </label>
          <input
            type="text"
            value={payerAccountId}
            onChange={(e) => setPayerAccountId(e.target.value)}
            placeholder="0.0.123456"
            className="w-full px-3 py-2 text-sm rounded-lg border-2 border-[#DBDBE5] bg-white/80 backdrop-blur-sm focus:border-yellow-400 focus:outline-none"
          />
          <p className="text-xs text-[#57575B] mt-1">
            Your Hedera account ID that will pay for the query
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handlePayment}
            disabled={loading || !payerAccountId || !isConnected}
            className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all shadow-elevation-md ${
              loading || !payerAccountId || !isConnected
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-yellow-500 hover:bg-yellow-600 text-white shadow-elevation-lg"
            }`}
          >
            {loading ? (
              <span>
                {paymentStatus === "creating" && "Signing Payment..."}
                {paymentStatus === "verifying" && "Verifying Payment..."}
                {paymentStatus === "settling" && "Settling Payment..."}
              </span>
            ) : (
              `Sign & Verify Payment (${parseInt(amount) / 100000000} HBAR)`
            )}
          </button>
          {!isConnected && (
            <button
              onClick={() => open?.()}
              className="px-4 py-2.5 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

