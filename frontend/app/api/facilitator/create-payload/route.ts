import { NextRequest, NextResponse } from "next/server";
import {
  AccountId,
  Client,
  PrivateKey,
  Transaction,
  TransferTransaction,
  TransactionId,
  Hbar,
  TokenId,
} from "@hashgraph/sdk";
import { ethers } from "ethers";
import { serializeTransaction, PaymentPayload, PaymentRequirements } from "@/lib/shared/blockchain/hedera/facilitator";

/**
 * POST /api/facilitator/create-payload - Create and sign a payment payload
 * 
 * Supports both private key signing (for testing) and wallet signature signing (for production)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      paymentRequirements,
      payerAccountId,
      payerPrivateKey,
      walletSignature,
      walletAddress,
      transactionBytes, // Pre-prepared unsigned transaction
      transactionId,
      signedMessage,
    }: {
      paymentRequirements: PaymentRequirements;
      payerAccountId: string;
      payerPrivateKey?: string;
      walletSignature?: string;
      walletAddress?: string;
      transactionBytes?: string;
      transactionId?: string;
      signedMessage?: string;
    } = body;

    if (!paymentRequirements || !payerAccountId) {
      return NextResponse.json(
        { error: "Missing paymentRequirements or payerAccountId" },
        { status: 400 }
      );
    }

    // Verify wallet signature if provided (payer authorizes payment via wallet signature)
    if (walletSignature && walletAddress && signedMessage) {
      try {
        const recoveredAddress = ethers.verifyMessage(signedMessage, walletSignature);
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          return NextResponse.json(
            { error: "Invalid signature: recovered address does not match wallet address" },
            { status: 400 }
          );
        }
        console.log("✅ Wallet signature verified for address:", recoveredAddress);
        console.log("✅ Payer authorized payment via wallet signature");
      } catch (error) {
        return NextResponse.json(
          { error: `Signature verification failed: ${error instanceof Error ? error.message : "Unknown error"}` },
          { status: 400 }
        );
      }
    } else if (!payerPrivateKey) {
      // If no wallet signature and no private key, we can't proceed
      return NextResponse.json(
        { error: "Either payerPrivateKey or walletSignature (with walletAddress and signedMessage) must be provided" },
        { status: 400 }
      );
    }

    // Validate network
    const network = paymentRequirements.network;
    if (!["hedera-testnet", "hedera-mainnet"].includes(network)) {
      return NextResponse.json(
        { error: "Invalid network" },
        { status: 400 }
      );
    }

    // Create client
    const client = network === "hedera-testnet" 
      ? Client.forTestnet() 
      : Client.forMainnet();

    // Create payer account ID object
    const payerAccountIdObj = AccountId.fromString(payerAccountId);
    
    // Handle signing: use payer's private key if provided, otherwise use facilitator account
    let signingAccountId: AccountId;
    let signingPrivateKey: PrivateKey;
    
    if (payerPrivateKey) {
      // Direct signing flow: use payer's private key (like testFacilitatorEthers.ts)
      signingAccountId = payerAccountIdObj;
      signingPrivateKey = PrivateKey.fromStringECDSA(payerPrivateKey);
      client.setOperator(signingAccountId, signingPrivateKey);
      console.log(`✅ Using payer's private key to sign transaction`);
    } else if (walletSignature) {
      // Wallet signature flow: payer authorized via wallet signature, use facilitator account to sign
      const FACILITATOR_PRIVATE_KEY = process.env.HEDERA_FACILITATOR_PRIVATE_KEY;
      
      if (!FACILITATOR_PRIVATE_KEY) {
        return NextResponse.json(
          { 
            error: "Facilitator private key not configured. " +
                   "Set HEDERA_FACILITATOR_PRIVATE_KEY in your .env.local file."
          },
          { status: 500 }
        );
      }

      // Use facilitator account to sign (payer authorized via wallet signature)
      const facilitatorAccountId = AccountId.fromString(paymentRequirements.extra!.feePayer!);
      signingAccountId = facilitatorAccountId;
      signingPrivateKey = PrivateKey.fromStringECDSA(FACILITATOR_PRIVATE_KEY);
      client.setOperator(signingAccountId, signingPrivateKey);
      
      console.log(`✅ Using facilitator account ${signingAccountId.toString()} to sign transaction`);
      console.log(`✅ Payer ${payerAccountId} authorized via wallet signature`);
    } else {
      return NextResponse.json(
        { error: "Either payerPrivateKey or walletSignature must be provided" },
        { status: 400 }
      );
    }

    // Get facilitator account ID
    const facilitatorAccountId = AccountId.fromString(paymentRequirements.extra!.feePayer!);
    const toAccountId = AccountId.fromString(paymentRequirements.payTo);

    // Create or use pre-prepared transaction
    let transaction: TransferTransaction;

    if (transactionBytes) {
      // Use pre-prepared transaction
      const bytes = Buffer.from(transactionBytes, "base64");
      const deserializedTx = Transaction.fromBytes(bytes);
      if (!(deserializedTx instanceof TransferTransaction)) {
        return NextResponse.json(
          { error: "Invalid transaction type" },
          { status: 400 }
        );
      }
      transaction = deserializedTx;
    } else if (paymentRequirements.asset === "0.0.0" || paymentRequirements.asset.toLowerCase() === "hbar") {
      // HBAR transfer
      const transactionId = TransactionId.generate(facilitatorAccountId);
      transaction = new TransferTransaction()
        .setTransactionId(transactionId)
        .addHbarTransfer(payerAccountIdObj, Hbar.fromTinybars(-parseInt(paymentRequirements.maxAmountRequired)))
        .addHbarTransfer(toAccountId, Hbar.fromTinybars(parseInt(paymentRequirements.maxAmountRequired)))
        .freezeWith(client);
    } else {
      // Token transfer
      const tokenId = TokenId.fromString(paymentRequirements.asset);
      const transactionId = TransactionId.generate(facilitatorAccountId);
      transaction = new TransferTransaction()
        .setTransactionId(transactionId)
        .addTokenTransfer(tokenId, payerAccountIdObj, -parseInt(paymentRequirements.maxAmountRequired))
        .addTokenTransfer(tokenId, toAccountId, parseInt(paymentRequirements.maxAmountRequired))
        .freezeWith(client);
    }

    // Sign the transaction with the appropriate account (delegated or payer)
    const signedTransaction = await transaction.sign(signingPrivateKey);
    const base64Transaction = serializeTransaction(signedTransaction);

    const paymentPayload: PaymentPayload = {
      x402Version: 1,
      scheme: "exact",
      network: paymentRequirements.network,
      payload: {
        transaction: base64Transaction,
      },
    };

    return NextResponse.json({ paymentPayload });
  } catch (error) {
    console.error("Error in POST /api/facilitator/create-payload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

