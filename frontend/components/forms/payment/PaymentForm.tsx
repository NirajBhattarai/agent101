"use client";

import React, { useState, useEffect } from "react";
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
  TokenId,
} from "@hashgraph/sdk";
import {
  PaymentRequirements,
  PaymentPayload,
  VerifyResponse,
  SettleResponse,
  serializeTransaction,
} from "@/lib/shared/blockchain/hedera/facilitator";
import { PrivateKeyImport } from "./PrivateKeyImport";
import {
  getEncryptedKey,
  clearStoredKey,
  getCachedPassword,
  cachePassword,
  clearPasswordCache,
  updateLastActivity,
  hasCachedPassword,
  getPasswordCacheTimeRemaining,
  isUserIdle,
} from "@/lib/shared/crypto/keyStorage";
import { decryptPrivateKey } from "@/lib/shared/crypto/encryption";

interface PaymentFormProps {
  facilitatorAccountId?: string;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ facilitatorAccountId }) => {
  const { address, isConnected } = useAppKitAccount?.() || ({} as any);
  const { open } = useAppKit?.() || ({} as any);
  const { data: walletClient } = useWalletClient();

  const [network, setNetwork] = useState("hedera-testnet");
  const [asset, setAsset] = useState("0.0.0"); // HBAR by default
  const [amount, setAmount] = useState("100000000"); // 1 HBAR in tinybars (hardcoded)
  const [payTo, setPayTo] = useState(""); // Recipient account ID
  const [feePayer, setFeePayer] = useState(""); // Facilitator account ID (pays fees)
  const [payerAccountId, setPayerAccountId] = useState("0.0.7191699"); // Payer account (hardcoded)
  const [description, setDescription] = useState("Test payment via x402 facilitator");
  const [resource, setResource] = useState("https://example.com/resource");
  const [maxTimeoutSeconds, setMaxTimeoutSeconds] = useState(60);

  // Default delegated account ID (used transparently for wallet signing flow)
  const DEFAULT_DELEGATED_ACCOUNT_ID = "0.0.6805685";

  const [paymentPayload, setPaymentPayload] = useState<PaymentPayload | null>(null);
  const [verifyResponse, setVerifyResponse] = useState<VerifyResponse | null>(null);
  const [settleResponse, setSettleResponse] = useState<SettleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "verify" | "settle">("form");
  const [keyPassword, setKeyPassword] = useState("");
  const [keyImported, setKeyImported] = useState(false);
  const [decryptedPrivateKey, setDecryptedPrivateKey] = useState<string | null>(null);
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

  // Fetch facilitator account ID when network changes
  useEffect(() => {
    fetch("/api/facilitator/supported")
      .then((res) => res.json())
      .then((data) => {
        if (data.kinds && data.kinds.length > 0) {
          const networkKind = data.kinds.find((k: any) => k.network === network);
          if (networkKind?.extra?.feePayer) {
            setFeePayer(networkKind.extra.feePayer);
            // Default payTo to facilitator if not set
            if (!payTo) {
              setPayTo(networkKind.extra.feePayer);
            }
          }
        }
      })
      .catch((err) => console.error("Failed to fetch facilitator info:", err));
  }, [network, payTo]);

  // Check if private key is already imported
  useEffect(() => {
    const stored = getEncryptedKey();
    if (stored) {
      setKeyImported(true);
      setPayerAccountId(stored.accountId);
    }
  }, []);

  // Auto-fill payer account ID from connected wallet (only if not already set)
  useEffect(() => {
    if (address && !payerAccountId && !keyImported) {
      // If payerAccountId is empty, try to use wallet address
      // Note: EVM addresses need to be converted to Hedera account IDs
      // For now, if the address is already a Hedera account ID format, use it
      // Otherwise, let user enter manually
      if (address.match(/^\d+\.\d+\.\d+$/)) {
        // It's already a Hedera account ID format
        setPayerAccountId(address);
      }
      // If it's an EVM address (0x...), user needs to enter their Hedera account ID manually
    }
  }, [address, payerAccountId, keyImported]);

  const handleKeyImported = (accountId: string) => {
    setKeyImported(true);
    setPayerAccountId(accountId);
  };

  // Helper function to create Hedera client
  const createClient = (network: string): Client => {
    if (network === "hedera-testnet") {
      return Client.forTestnet();
    } else if (network === "hedera-mainnet") {
      return Client.forMainnet();
    } else {
      throw new Error(`Unsupported network: ${network}`);
    }
  };

  // Helper function to create HBAR transfer transaction
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

  // Helper function to create token transfer transaction
  const createTokenTransferTransaction = (
    fromAccount: AccountId,
    toAccount: AccountId,
    facilitatorAccount: AccountId,
    tokenId: TokenId,
    amount: string,
    client: Client,
  ): TransferTransaction => {
    const transactionId = TransactionId.generate(facilitatorAccount);

    const transaction = new TransferTransaction()
      .setTransactionId(transactionId)
      .addTokenTransfer(tokenId, fromAccount, -parseInt(amount))
      .addTokenTransfer(tokenId, toAccount, parseInt(amount));

    return transaction.freezeWith(client);
  };

  const createPaymentPayload = async () => {
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
        setDecryptedPrivateKey(privateKeyToUse);
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

    if (!payerAccountId || !payTo || !amount || !feePayer) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get facilitator URL (current origin)
      const facilitatorUrl = typeof window !== "undefined" ? window.location.origin : "";

      const paymentRequirements: PaymentRequirements = {
        scheme: "exact",
        network,
        maxAmountRequired: amount,
        asset,
        payTo,
        resource,
        description,
        mimeType: "application/json",
        maxTimeoutSeconds,
        extra: {
          feePayer: feePayer,
        },
      };

      // Step 1: Create transaction client-side (like testFacilitatorEthers.ts)
      console.log("📝 Step 1: Creating transaction client-side...");
      const client = createClient(network);
      const payerAccountIdObj = AccountId.fromString(payerAccountId);
      const facilitatorAccountId = AccountId.fromString(feePayer);
      const toAccountId = AccountId.fromString(payTo);

      let transaction: TransferTransaction;
      if (asset === "0.0.0" || asset.toLowerCase() === "hbar") {
        transaction = createHbarTransferTransaction(
          payerAccountIdObj,
          toAccountId,
          facilitatorAccountId,
          amount,
          client,
        );
      } else {
        const tokenId = TokenId.fromString(asset);
        transaction = createTokenTransferTransaction(
          payerAccountIdObj,
          toAccountId,
          facilitatorAccountId,
          tokenId,
          amount,
          client,
        );
      }

      const transactionId = transaction.transactionId!.toString();
      console.log("✅ Transaction created. Transaction ID:", transactionId);

      // Step 2: Sign transaction with private key or wallet
      let signedTransactionBytes: string;
      let walletSignature: string | undefined;
      let walletAddress: string | undefined;
      let signedMessage: string | undefined;

      if (privateKeyToUse) {
        // Sign with private key
        console.log("📝 Step 2: Signing transaction with private key...");
        const hederaPrivateKey = PrivateKey.fromStringECDSA(privateKeyToUse);
        const signedTransaction = await transaction.sign(hederaPrivateKey);
        signedTransactionBytes = Buffer.from(signedTransaction.toBytes()).toString("base64");
        console.log("✅ Transaction signed with private key");
      } else {
        // Sign with wallet (original flow)
        console.log("📝 Step 2: Signing authorization message with wallet...");
        const authorizationMessage = `Hedera x402 Payment Authorization

Network: ${network}
Payer Account: ${payerAccountId}
Recipient: ${payTo}
Amount: ${amount}
Asset: ${asset === "0.0.0" ? "HBAR" : asset}
Transaction ID: ${transactionId}
Description: ${description}

By signing this message, you authorize this payment transaction.`;

        const provider = new ethers.BrowserProvider(walletClient as any);
        const signer = await provider.getSigner();
        walletSignature = await signer.signMessage(authorizationMessage);
        walletAddress = address || "";
        signedMessage = authorizationMessage;
        console.log("✅ Authorization message signed:", walletSignature.substring(0, 20) + "...");

        // Serialize unsigned transaction for wallet flow
        signedTransactionBytes = Buffer.from(transaction.toBytes()).toString("base64");
      }

      // Step 3: Create payment payload
      const paymentPayload: PaymentPayload = {
        x402Version: 1,
        scheme: "exact",
        network: network,
        payload: {
          transaction: signedTransactionBytes,
        },
      };

      console.log("✅ Payment payload created");

      // Add wallet signature if using wallet flow
      if (walletSignature) {
        (paymentPayload as any).walletSignature = walletSignature;
        (paymentPayload as any).walletAddress = walletAddress;
        (paymentPayload as any).signedMessage = signedMessage;
      }

      // If using private key, include it in the payload for direct signing
      if (privateKeyToUse) {
        (paymentPayload as any).payerPrivateKey = privateKeyToUse;
      }

      setPaymentPayload(paymentPayload);

      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to create payment payload");
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async () => {
    if (!paymentPayload) return;

    setLoading(true);
    setError(null);

    try {
      const facilitatorUrl = typeof window !== "undefined" ? window.location.origin : "";
      const paymentRequirements: PaymentRequirements = {
        scheme: "exact",
        network,
        maxAmountRequired: amount,
        asset,
        payTo,
        resource,
        description,
        mimeType: "application/json",
        maxTimeoutSeconds,
        extra: {
          feePayer: feePayer,
        },
      };

      const response = await fetch(`${facilitatorUrl}/api/facilitator/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentPayload,
          paymentRequirements,
          walletSignature: (paymentPayload as any).walletSignature,
          walletAddress: (paymentPayload as any).walletAddress,
          signedMessage: (paymentPayload as any).signedMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Verification failed");
      }

      const data = await response.json();
      setVerifyResponse(data);

      if (data.isValid) {
        setStep("settle");
      } else {
        setError(`Verification failed: ${data.invalidReason || "Unknown reason"}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify payment");
    } finally {
      setLoading(false);
    }
  };

  const settlePayment = async () => {
    if (!paymentPayload) return;

    setLoading(true);
    setError(null);

    try {
      const facilitatorUrl = typeof window !== "undefined" ? window.location.origin : "";
      const paymentRequirements: PaymentRequirements = {
        scheme: "exact",
        network,
        maxAmountRequired: amount,
        asset,
        payTo,
        resource,
        description,
        mimeType: "application/json",
        maxTimeoutSeconds,
        extra: {
          feePayer: feePayer,
        },
      };

      const response = await fetch(`${facilitatorUrl}/api/facilitator/settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentPayload,
          paymentRequirements,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Settlement failed");
      }

      const data = await response.json();
      setSettleResponse(data);
    } catch (err: any) {
      setError(err.message || "Failed to settle payment");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPaymentPayload(null);
    setVerifyResponse(null);
    setSettleResponse(null);
    setStep("form");
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Hedera x402 Payment Form</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {step === "form" && (
        <div className="space-y-4">
          {/* Private Key Import Section */}
          <PrivateKeyImport onKeyImported={handleKeyImported} network={network} />

          {/* Password input if key is imported and not cached */}
          {keyImported && showPasswordInput && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Password to Decrypt Private Key
              </label>
              <input
                type="password"
                value={keyPassword}
                onChange={(e) => setKeyPassword(e.target.value)}
                placeholder="Enter password to decrypt your private key"
                className="w-full p-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
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

          <div>
            <label className="block text-sm font-medium mb-1">Network</label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="hedera-testnet">Hedera Testnet</option>
              <option value="hedera-mainnet">Hedera Mainnet</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Asset Type</label>
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="0.0.0">HBAR</option>
              <option value="0.0.429274">USDC (Testnet)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Amount (in smallest unit, e.g., tinybars for HBAR)
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50000000 (0.5 HBAR)"
              className="w-full p-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">For HBAR: 1 HBAR = 100,000,000 tinybars</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Pay To (Recipient Account ID)</label>
            <input
              type="text"
              value={payTo}
              onChange={(e) => setPayTo(e.target.value)}
              placeholder="0.0.123456"
              className="w-full p-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Account that will receive the payment</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Fee Payer (Facilitator Account ID)
            </label>
            <input
              type="text"
              value={feePayer}
              onChange={(e) => setFeePayer(e.target.value)}
              placeholder="Auto-filled from facilitator"
              className="w-full p-2 border rounded-lg bg-gray-50"
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">
              Account that will pay transaction fees (auto-filled)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Your Payer Account ID</label>
            <input
              type="text"
              value={payerAccountId}
              onChange={(e) => setPayerAccountId(e.target.value)}
              placeholder={address && address.match(/^\d+\.\d+\.\d+$/) ? address : "0.0.123456"}
              className="w-full p-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              {address && address.match(/^\d+\.\d+\.\d+$/)
                ? `Auto-filled from connected wallet: ${address}`
                : address
                  ? `Connected wallet: ${address}. Enter your Hedera account ID (0.0.xxxxx format).`
                  : "Enter your Hedera account ID (0.0.xxxxx format) or connect wallet"}
            </p>
          </div>

          {!keyImported && !isConnected && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Import a private key above or connect your wallet (MetaMask) to proceed. The
                wallet button is in the top right corner.
              </p>
            </div>
          )}

          {keyImported && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ <strong>Private Key Signing:</strong> Your private key is encrypted and stored
                securely. Transactions will be signed directly with your private key.
              </p>
            </div>
          )}

          {!keyImported && isConnected && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ✅ <strong>Wallet Signing:</strong> Your crypto wallet will sign an authorization
                message for this payment. No private key needed - everything is signed securely
                through your connected wallet!
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Resource URL</label>
            <input
              type="text"
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <button
            onClick={createPaymentPayload}
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating Payment..." : "Create & Sign Payment"}
          </button>
        </div>
      )}

      {step === "verify" && paymentPayload && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✅ Payment Payload Created</h3>
            <p className="text-sm text-green-700">Transaction signed and ready for verification.</p>
          </div>

          <button
            onClick={verifyPayment}
            disabled={loading}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify Payment"}
          </button>

          {verifyResponse && (
            <div
              className={`p-4 rounded-lg border ${
                verifyResponse.isValid ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              }`}
            >
              <h3 className="font-semibold mb-2">
                {verifyResponse.isValid ? "✅ Verification Successful" : "❌ Verification Failed"}
              </h3>
              <pre className="text-xs overflow-auto">{JSON.stringify(verifyResponse, null, 2)}</pre>
            </div>
          )}

          <button
            onClick={() => setStep("form")}
            className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Back to Form
          </button>
        </div>
      )}

      {step === "settle" && paymentPayload && verifyResponse?.isValid && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">✅ Payment Verified</h3>
            <p className="text-sm text-blue-700">Payment is valid. Ready to settle.</p>
          </div>

          <button
            onClick={settlePayment}
            disabled={loading}
            className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Settling..." : "Settle Payment"}
          </button>

          {settleResponse && (
            <div
              className={`p-4 rounded-lg border ${
                settleResponse.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              }`}
            >
              <h3 className="font-semibold mb-2">
                {settleResponse.success ? "✅ Payment Settled" : "❌ Settlement Failed"}
              </h3>
              {settleResponse.success && (
                <p className="text-sm mb-2">
                  Transaction ID:{" "}
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    {settleResponse.transaction}
                  </code>
                </p>
              )}
              <pre className="text-xs overflow-auto">{JSON.stringify(settleResponse, null, 2)}</pre>
            </div>
          )}

          <button
            onClick={reset}
            className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
};
