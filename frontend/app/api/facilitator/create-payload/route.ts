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
import {
  serializeTransaction,
  PaymentPayload,
  PaymentRequirements,
} from "@/lib/shared/blockchain/hedera/facilitator";

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
        { status: 400 },
      );
    }

    // Verify wallet signature if provided (payer authorizes payment via wallet signature)
    if (walletSignature && walletAddress && signedMessage) {
      try {
        const recoveredAddress = ethers.verifyMessage(signedMessage, walletSignature);
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          return NextResponse.json(
            { error: "Invalid signature: recovered address does not match wallet address" },
            { status: 400 },
          );
        }
        console.log("✅ Wallet signature verified for address:", recoveredAddress);
        console.log("✅ Payer authorized payment via wallet signature");
      } catch (error) {
        return NextResponse.json(
          {
            error: `Signature verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
          { status: 400 },
        );
      }
    } else if (!payerPrivateKey) {
      // If no wallet signature and no private key, we can't proceed
      return NextResponse.json(
        {
          error:
            "Either payerPrivateKey or walletSignature (with walletAddress and signedMessage) must be provided",
        },
        { status: 400 },
      );
    }

    // Validate network
    const network = paymentRequirements.network;
    if (!["hedera-testnet", "hedera-mainnet"].includes(network)) {
      return NextResponse.json({ error: "Invalid network" }, { status: 400 });
    }

    // Create client
    const client = network === "hedera-testnet" ? Client.forTestnet() : Client.forMainnet();

    // If we have a pre-signed transaction, we don't need to parse the account ID
    // The transaction already contains all the necessary information
    let payerAccountIdObj: AccountId | null = null;

    if (!transactionBytes) {
      // Only parse account ID if we need to create a new transaction
      try {
        payerAccountIdObj = AccountId.fromString(payerAccountId);
        // Try to populate EVM address if it's an alias account
        try {
          payerAccountIdObj = await payerAccountIdObj.populateAccountEvmAddress(client);
        } catch (e) {
          // If population fails, use the account ID as-is
          console.log(
            `⚠️ Could not populate EVM address for ${payerAccountId}, using account ID directly`,
          );
        }
      } catch (error: any) {
        // If account ID parsing fails (e.g., alias key), try to handle it
        if (error.message && error.message.includes("aliasKey")) {
          // For accounts with alias keys, we need to use the account ID string directly
          // or query the network to resolve it
          return NextResponse.json(
            {
              error: `Account ID ${payerAccountId} has an alias key. Please use the numeric account ID (0.0.xxxxx) format.`,
            },
            { status: 400 },
          );
        }
        throw error;
      }
    } else {
      // For pre-signed transactions, we'll extract the account ID from the transaction
      // But we still need it for signing setup, so try to parse it
      try {
        payerAccountIdObj = AccountId.fromString(payerAccountId);
      } catch (error: any) {
        // If parsing fails, we can still proceed with the signed transaction
        // The transaction itself contains the account information
        console.log(
          `⚠️ Could not parse account ID ${payerAccountId}, but transaction is pre-signed, continuing...`,
        );
      }
    }

    // Handle signing: use payer's private key if provided, otherwise use facilitator account
    let signingAccountId: AccountId;
    let signingPrivateKey: PrivateKey;

    if (payerPrivateKey) {
      signingPrivateKey = PrivateKey.fromStringECDSA(payerPrivateKey);

      // If we have a pre-signed transaction, we don't need to set operator or sign
      // Just use the transaction as-is (like testFacilitator.ts flow)
      if (transactionBytes) {
        // Transaction is already signed, skip operator setup entirely
        console.log(`✅ Using pre-signed transaction with payer's private key`);
        // We don't need signingAccountId or operator for pre-signed transactions
        // Just use a placeholder - it won't be used
        signingAccountId = AccountId.fromString("0.0.0");
      } else {
        // Direct signing flow: create and sign transaction (like testFacilitator.ts)
        if (!payerAccountIdObj) {
          return NextResponse.json({ error: "Could not parse payer account ID" }, { status: 400 });
        }
        signingAccountId = payerAccountIdObj;
        // For creating new transactions, we need to set operator
        // But if it fails due to alias key, we can still create the transaction
        // without setting operator - we'll sign it directly
        try {
          client.setOperator(signingAccountId, signingPrivateKey);
          console.log(`✅ Set operator for transaction creation`);
        } catch (error: any) {
          // If setting operator fails due to alias, that's okay
          // We can still create and sign the transaction without operator
          if (error.message && error.message.includes("aliasKey")) {
            console.log(
              `⚠️ Could not set operator (alias key), but will create transaction without operator`,
            );
          } else {
            throw error;
          }
        }
      }
    } else if (walletSignature) {
      // Wallet signature flow: payer authorized via wallet signature, use facilitator account to sign
      const FACILITATOR_PRIVATE_KEY = process.env.HEDERA_FACILITATOR_PRIVATE_KEY;

      if (!FACILITATOR_PRIVATE_KEY) {
        return NextResponse.json(
          {
            error:
              "Facilitator private key not configured. " +
              "Set HEDERA_FACILITATOR_PRIVATE_KEY in your .env.local file.",
          },
          { status: 500 },
        );
      }

      // Use facilitator account to sign (payer authorized via wallet signature)
      const facilitatorAccountId = AccountId.fromString(paymentRequirements.extra!.feePayer!);
      signingAccountId = facilitatorAccountId;
      signingPrivateKey = PrivateKey.fromStringECDSA(FACILITATOR_PRIVATE_KEY);
      client.setOperator(signingAccountId, signingPrivateKey);

      console.log(
        `✅ Using facilitator account ${signingAccountId.toString()} to sign transaction`,
      );
      console.log(`✅ Payer ${payerAccountId} authorized via wallet signature`);
    } else {
      return NextResponse.json(
        { error: "Either payerPrivateKey or walletSignature must be provided" },
        { status: 400 },
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
        return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
      }
      transaction = deserializedTx;
    } else if (
      paymentRequirements.asset === "0.0.0" ||
      paymentRequirements.asset.toLowerCase() === "hbar"
    ) {
      // HBAR transfer - need payerAccountIdObj
      if (!payerAccountIdObj) {
        return NextResponse.json(
          { error: "Could not parse payer account ID for transaction creation" },
          { status: 400 },
        );
      }
      const transactionId = TransactionId.generate(facilitatorAccountId);
      transaction = new TransferTransaction()
        .setTransactionId(transactionId)
        .addHbarTransfer(
          payerAccountIdObj,
          Hbar.fromTinybars(-parseInt(paymentRequirements.maxAmountRequired)),
        )
        .addHbarTransfer(
          toAccountId,
          Hbar.fromTinybars(parseInt(paymentRequirements.maxAmountRequired)),
        )
        .freezeWith(client);
    } else {
      // Token transfer - need payerAccountIdObj
      if (!payerAccountIdObj) {
        return NextResponse.json(
          { error: "Could not parse payer account ID for transaction creation" },
          { status: 400 },
        );
      }
      const tokenId = TokenId.fromString(paymentRequirements.asset);
      const transactionId = TransactionId.generate(facilitatorAccountId);
      transaction = new TransferTransaction()
        .setTransactionId(transactionId)
        .addTokenTransfer(
          tokenId,
          payerAccountIdObj,
          -parseInt(paymentRequirements.maxAmountRequired),
        )
        .addTokenTransfer(tokenId, toAccountId, parseInt(paymentRequirements.maxAmountRequired))
        .freezeWith(client);
    }

    // Sign the transaction if it's not already signed
    // If transactionBytes was provided, the transaction is already signed
    let signedTransaction: TransferTransaction;
    if (transactionBytes) {
      // Transaction is already signed, use it as-is (like testFacilitator.ts)
      signedTransaction = transaction;
      console.log("✅ Using pre-signed transaction from client");
    } else {
      // Sign the transaction directly with private key (no need for operator)
      // This works even if setOperator failed due to alias key
      signedTransaction = await transaction.sign(signingPrivateKey);
      console.log("✅ Transaction signed directly with private key");
    }
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
      { status: 500 },
    );
  }
}
