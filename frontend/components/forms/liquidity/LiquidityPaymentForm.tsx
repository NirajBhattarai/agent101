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
  PrivateKey,
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
import { PrivateKeyImport } from "../payment/PrivateKeyImport";
import {
  getEncryptedKey,
  getCachedPassword,
  cachePassword,
  clearPasswordCache,
  updateLastActivity,
  hasCachedPassword,
  getPasswordCacheTimeRemaining,
  isUserIdle,
} from "@/lib/shared/crypto/keyStorage";
import { decryptPrivateKey } from "@/lib/shared/crypto/encryption";

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
  const [storedPaymentRequirements, setStoredPaymentRequirements] =
    useState<PaymentRequirements | null>(null);
  const [keyPassword, setKeyPassword] = useState("");
  const [keyImported, setKeyImported] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(true);

  // Check for cached password and update activity on mount
  useEffect(() => {
    updateLastActivity();
    const cached = getCachedPassword();
    if (cached) {
      setKeyPassword(cached);
      setShowPasswordInput(false);
    }
  }, []);

  // Track user activity to detect idle
  useEffect(() => {
    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    let activityTimer: NodeJS.Timeout;

    const handleActivity = () => {
      updateLastActivity();
      // Clear any existing timer
      if (activityTimer) {
        clearTimeout(activityTimer);
      }
      // Check if user became idle after 5 minutes
      activityTimer = setTimeout(
        () => {
          if (isUserIdle()) {
            clearPasswordCache();
            setKeyPassword("");
            setShowPasswordInput(true);
          }
        },
        5 * 60 * 1000,
      ); // 5 minutes
    };

    // Add event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, true);
    });

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity, true);
      });
      if (activityTimer) {
        clearTimeout(activityTimer);
      }
    };
  }, []);

  // Check if private key is already imported
  useEffect(() => {
    const stored = getEncryptedKey();
    if (stored) {
      setKeyImported(true);
      setPayerAccountId(stored.accountId);
    }
  }, []);

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

  const handleKeyImported = (accountId: string) => {
    setKeyImported(true);
    setPayerAccountId(accountId);
  };

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
    // Check if using private key or wallet
    const storedKey = getEncryptedKey();
    let privateKeyToUse: string | null = null;

    if (storedKey) {
      // Using private key - need password to decrypt
      // First try cached password
      let passwordToUse = keyPassword || getCachedPassword();

      if (!passwordToUse) {
        setError("Please enter your password to decrypt the private key");
        setShowPasswordInput(true);
        return;
      }

      try {
        privateKeyToUse = await decryptPrivateKey(storedKey.encryptedKey, passwordToUse);
        // Cache the password for 15 minutes
        cachePassword(passwordToUse);
        updateLastActivity();
        setShowPasswordInput(false);
      } catch (err: any) {
        // If cached password failed, clear it and ask user
        clearPasswordCache();
        setError("Failed to decrypt private key. Please check your password.");
        setShowPasswordInput(true);
        setKeyPassword("");
        return;
      }
    } else {
      // Using wallet - need wallet connection
      if (!isConnected) {
        open?.();
        setError("Please connect your wallet or import a private key");
        return;
      }

      if (!walletClient) {
        setError("Wallet not connected. Please connect your wallet.");
        return;
      }
    }

    if (!payerAccountId || !payToAccountId || !facilitatorAccountId) {
      setError("Missing account information. Please ensure facilitator is configured.");
      return;
    }

    setLoading(true);
    setError(null);
    setPaymentStatus("creating");

    try {
      const client = createClient(network);

      // Create account ID objects - handle potential alias keys
      let payerAccountIdObj: AccountId;
      try {
        payerAccountIdObj = AccountId.fromString(payerAccountId);
      } catch (error: any) {
        // If account ID parsing fails (e.g., alias key), provide helpful error
        if (error.message && error.message.includes("aliasKey")) {
          throw new Error(
            `Account ID ${payerAccountId} appears to have an alias key. ` +
              `Please use the numeric account ID format (0.0.xxxxx) instead of an EVM address or alias.`,
          );
        }
        throw new Error(
          `Invalid account ID format: ${payerAccountId}. Please use format 0.0.xxxxx`,
        );
      }

      // Try to populate EVM address if needed (for accounts with alias)
      // But don't fail if it doesn't work - we can use the account ID as-is
      try {
        payerAccountIdObj = await payerAccountIdObj.populateAccountEvmAddress(client);
      } catch (e) {
        // If population fails, use account ID as-is (this is fine for most cases)
        console.log(
          `⚠️ Could not populate EVM address for ${payerAccountId}, using account ID directly`,
        );
      }

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

      // Sign transaction with private key or wallet
      let signedTransactionBytes: string;
      let walletSignature: string | undefined;
      let walletAddress: string | undefined;
      let signedMessage: string | undefined;

      if (privateKeyToUse) {
        // Sign with private key
        console.log("📝 Signing transaction with private key...");
        const hederaPrivateKey = PrivateKey.fromStringECDSA(privateKeyToUse);
        const signedTransaction = await transaction.sign(hederaPrivateKey);
        signedTransactionBytes = Buffer.from(signedTransaction.toBytes()).toString("base64");
        console.log("✅ Transaction signed with private key");
      } else {
        // Sign with wallet (original flow)
        walletAddress = address || "";
        signedMessage = createSignableMessage(
          network,
          payerAccountId,
          payToAccountId,
          amount,
          "0.0.0", // HBAR
          transactionId,
        );

        // Sign message with wallet
        const provider = new ethers.BrowserProvider(walletClient as any);
        walletSignature = await signMessageWithWallet(provider, signedMessage);
        console.log("✅ Message signed with wallet");

        // Serialize unsigned transaction for wallet flow
        signedTransactionBytes = Buffer.from(transaction.toBytes()).toString("base64");
      }

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
      const createPayloadBody: any = {
        paymentRequirements,
        payerAccountId,
        transactionBytes: signedTransactionBytes,
        transactionId,
      };

      // Add private key or wallet signature based on flow
      if (privateKeyToUse) {
        createPayloadBody.payerPrivateKey = privateKeyToUse;
      } else {
        createPayloadBody.walletSignature = walletSignature;
        createPayloadBody.walletAddress = walletAddress;
        createPayloadBody.signedMessage = signedMessage;
      }

      const createPayloadResponse = await fetch("/api/facilitator/create-payload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createPayloadBody),
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

      // Step 3: Automatically settle payment (like testFacilitator.ts)
      setPaymentStatus("settling");
      console.log("💰 Settling payment...");

      const settleResponse = await fetch("/api/facilitator/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentPayload,
          paymentRequirements,
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

      // Store payment payload and requirements (for reference)
      setStoredPaymentPayload(paymentPayload);
      setStoredPaymentRequirements(paymentRequirements);

      // Notify parent component that payment is completed
      onPaymentComplete?.(settleData.transaction);

      // Respond to orchestrator with settlement status
      respond?.({
        paymentStatus: "completed",
        transactionId: settleData.transaction,
        message: `Payment settled successfully. Transaction: ${settleData.transaction}`,
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
            <p className="text-xs text-green-600 mt-1">Transaction: {paymentProof}</p>
            <p className="text-xs text-green-600 mt-1">Payment has been completed on-chain.</p>
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
        {/* Private Key Import Section */}
        <PrivateKeyImport onKeyImported={handleKeyImported} network={network} />

        {/* Password input if key is imported and not cached */}
        {keyImported && showPasswordInput && (
          <div>
            <label className="block text-xs font-medium text-[#010507] mb-1.5">
              Password to Decrypt Private Key
            </label>
            <input
              type="password"
              value={keyPassword}
              onChange={(e) => setKeyPassword(e.target.value)}
              placeholder="Enter password to decrypt your private key"
              className="w-full px-3 py-2 text-sm rounded-lg border-2 border-[#DBDBE5] bg-white/80 backdrop-blur-sm focus:border-yellow-400 focus:outline-none"
            />
            <p className="text-xs text-[#57575B] mt-1">
              Your private key is encrypted. Enter your password to decrypt it when signing
              transactions.
              {hasCachedPassword() && (
                <span className="text-green-600 ml-1">
                  (Password cached for {Math.floor(getPasswordCacheTimeRemaining() / 60)} more
                  minutes)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Show cached password status */}
        {keyImported && !showPasswordInput && hasCachedPassword() && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              ✅ Password cached. You won't need to enter it again for{" "}
              {Math.floor(getPasswordCacheTimeRemaining() / 60)} more minutes.
            </p>
            <button
              onClick={() => {
                clearPasswordCache();
                setKeyPassword("");
                setShowPasswordInput(true);
              }}
              className="text-xs text-blue-600 underline mt-1"
            >
              Clear password cache
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {!keyImported && !isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              ⚠️ Import a private key above or connect your wallet to proceed.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handlePayment}
            disabled={loading || !payerAccountId || (!keyImported && !isConnected)}
            className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all shadow-elevation-md ${
              loading || !payerAccountId || (!keyImported && !isConnected)
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
          {!keyImported && !isConnected && (
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
