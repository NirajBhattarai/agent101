"use client";

import React, { useState, useEffect } from "react";
import { useAppKitAccount, useAppKit } from "@reown/appkit/react";
import { useWalletClient } from "wagmi";
import { ethers } from "ethers";
import {
  AccountId,
  Client,
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

  // Auto-fill payer account ID from connected wallet (only if not already set)
  useEffect(() => {
    if (address && !payerAccountId) {
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
  }, [address, payerAccountId]);

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
    if (!isConnected) {
      open?.();
      setError("Please connect your wallet first");
      return;
    }

    if (!payerAccountId || !payTo || !amount || !feePayer) {
      setError("Please fill in all required fields");
      return;
    }

    if (!walletClient) {
      setError("Wallet not connected. Please connect your wallet.");
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

      // Step 2: Create authorization message and sign with wallet
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
      const walletSignature = await signer.signMessage(authorizationMessage);
      console.log("✅ Authorization message signed:", walletSignature.substring(0, 20) + "...");

      // Step 3: Serialize unsigned transaction
      const transactionBytes = Buffer.from(transaction.toBytes()).toString("base64");

      // Step 4: Create payment payload (unsigned - facilitator will sign it)
      const paymentPayload: PaymentPayload = {
        x402Version: 1,
        scheme: "exact",
        network: network,
        payload: {
          transaction: transactionBytes, // Unsigned transaction
        },
      };

      console.log("✅ Payment payload created");
      setPaymentPayload(paymentPayload);
      
      // Store wallet signature for verify endpoint
      (paymentPayload as any).walletSignature = walletSignature;
      (paymentPayload as any).walletAddress = address;
      (paymentPayload as any).signedMessage = authorizationMessage;
      
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
            <p className="text-xs text-gray-500 mt-1">
              For HBAR: 1 HBAR = 100,000,000 tinybars
            </p>
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
            <p className="text-xs text-gray-500 mt-1">
              Account that will receive the payment
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fee Payer (Facilitator Account ID)</label>
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

          {!isConnected && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Connect your wallet (MetaMask) to auto-fill your account address. 
                The wallet button is in the top right corner.
              </p>
            </div>
          )}

          {isConnected && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ <strong>Wallet Signing:</strong> Your crypto wallet will sign an authorization message for this payment. 
                No private key needed - everything is signed securely through your connected wallet!
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
            <p className="text-sm text-green-700">
              Transaction signed and ready for verification.
            </p>
          </div>

          <button
            onClick={verifyPayment}
            disabled={loading}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify Payment"}
          </button>

          {verifyResponse && (
            <div className={`p-4 rounded-lg border ${
              verifyResponse.isValid 
                ? "bg-green-50 border-green-200" 
                : "bg-red-50 border-red-200"
            }`}>
              <h3 className="font-semibold mb-2">
                {verifyResponse.isValid ? "✅ Verification Successful" : "❌ Verification Failed"}
              </h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(verifyResponse, null, 2)}
              </pre>
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
            <p className="text-sm text-blue-700">
              Payment is valid. Ready to settle.
            </p>
          </div>

          <button
            onClick={settlePayment}
            disabled={loading}
            className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Settling..." : "Settle Payment"}
          </button>

          {settleResponse && (
            <div className={`p-4 rounded-lg border ${
              settleResponse.success 
                ? "bg-green-50 border-green-200" 
                : "bg-red-50 border-red-200"
            }`}>
              <h3 className="font-semibold mb-2">
                {settleResponse.success ? "✅ Payment Settled" : "❌ Settlement Failed"}
              </h3>
              {settleResponse.success && (
                <p className="text-sm mb-2">
                  Transaction ID: <code className="bg-gray-100 px-2 py-1 rounded">{settleResponse.transaction}</code>
                </p>
              )}
              <pre className="text-xs overflow-auto">
                {JSON.stringify(settleResponse, null, 2)}
              </pre>
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

