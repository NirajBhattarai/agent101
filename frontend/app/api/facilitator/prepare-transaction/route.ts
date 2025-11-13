import { NextRequest, NextResponse } from "next/server";
import {
  AccountId,
  Client,
  TransferTransaction,
  TransactionId,
  Hbar,
  TokenId,
} from "@hashgraph/sdk";
import { PaymentRequirements } from "@/lib/shared/blockchain/hedera/facilitator";

/**
 * POST /api/facilitator/prepare-transaction - Prepare an unsigned transaction for wallet signing
 * 
 * This endpoint creates an unsigned Hedera transaction that can be signed by the client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      paymentRequirements,
      payerAccountId,
    }: {
      paymentRequirements: PaymentRequirements;
      payerAccountId: string;
    } = body;

    if (!paymentRequirements || !payerAccountId) {
      return NextResponse.json(
        { error: "Missing paymentRequirements or payerAccountId" },
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

    // Get accounts
    const payerAccountIdObj = AccountId.fromString(payerAccountId);
    const facilitatorAccountId = AccountId.fromString(paymentRequirements.extra!.feePayer!);
    const toAccountId = AccountId.fromString(paymentRequirements.payTo);

    // Create transaction ID with facilitator as payer
    const transactionId = TransactionId.generate(facilitatorAccountId);

    // Create transaction
    let transaction: TransferTransaction;

    if (paymentRequirements.asset === "0.0.0" || paymentRequirements.asset.toLowerCase() === "hbar") {
      // HBAR transfer
      transaction = new TransferTransaction()
        .setTransactionId(transactionId)
        .addHbarTransfer(payerAccountIdObj, Hbar.fromTinybars(-parseInt(paymentRequirements.maxAmountRequired)))
        .addHbarTransfer(toAccountId, Hbar.fromTinybars(parseInt(paymentRequirements.maxAmountRequired)))
        .freezeWith(client);
    } else {
      // Token transfer
      const tokenId = TokenId.fromString(paymentRequirements.asset);
      transaction = new TransferTransaction()
        .setTransactionId(transactionId)
        .addTokenTransfer(tokenId, payerAccountIdObj, -parseInt(paymentRequirements.maxAmountRequired))
        .addTokenTransfer(tokenId, toAccountId, parseInt(paymentRequirements.maxAmountRequired))
        .freezeWith(client);
    }

    // Return transaction bytes (unsigned) for client-side signing
    const transactionBytes = Buffer.from(transaction.toBytes()).toString("base64");

    return NextResponse.json({
      transactionBytes,
      transactionId: transactionId.toString(),
      payerAccountId: payerAccountIdObj.toString(),
    });
  } catch (error) {
    console.error("Error in POST /api/facilitator/prepare-transaction:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

