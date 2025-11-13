import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import {
  AccountId,
  Client,
  PrivateKey,
  Transaction,
  TransferTransaction,
} from "@hashgraph/sdk";
import {
  createHederaSigner,
  verify,
  PaymentPayload,
  PaymentRequirements,
  deserializeTransaction,
  serializeTransaction,
} from "@/lib/shared/blockchain/hedera/facilitator";

/**
 * POST /api/facilitator/verify - Verify a payment payload
 * 
 * If wallet signature is provided, verifies it and signs the transaction with facilitator key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      paymentPayload, 
      paymentRequirements,
      walletSignature,
      walletAddress,
      signedMessage,
    } = body as {
      paymentPayload: PaymentPayload;
      paymentRequirements: PaymentRequirements;
      walletSignature?: string;
      walletAddress?: string;
      signedMessage?: string;
    };

    if (!paymentPayload || !paymentRequirements) {
      return NextResponse.json(
        { error: "Missing paymentPayload or paymentRequirements" },
        { status: 400 }
      );
    }

    const HEDERA_ACCOUNT_ID = process.env.HEDERA_FACILITATOR_ACCOUNT_ID;
    const HEDERA_PRIVATE_KEY = process.env.HEDERA_FACILITATOR_PRIVATE_KEY;

    if (!HEDERA_ACCOUNT_ID || !HEDERA_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Facilitator not configured" },
        { status: 500 }
      );
    }

    // Determine network from payment requirements
    const network = paymentRequirements.network;
    if (!["hedera-testnet", "hedera-mainnet"].includes(network)) {
      return NextResponse.json(
        { error: "Invalid network" },
        { status: 400 }
      );
    }

    // If wallet signature is provided, verify it (but don't sign transaction - let settle do it)
    // This emulates testFacilitatorEthers.ts flow where verify doesn't sign, only validates
    if (walletSignature && walletAddress && signedMessage) {
      try {
        // Verify wallet signature (authorization check)
        const recoveredAddress = ethers.verifyMessage(signedMessage, walletSignature);
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          return NextResponse.json(
            { error: "Invalid wallet signature: recovered address does not match wallet address" },
            { status: 400 }
          );
        }
        console.log("✅ Wallet signature verified for address:", recoveredAddress);
        // NOTE: We do NOT sign the transaction here - let settle route add facilitator signature
        // This matches testFacilitatorEthers.ts behavior where verify only validates, doesn't sign
      } catch (error) {
        return NextResponse.json(
          { error: `Wallet signature verification failed: ${error instanceof Error ? error.message : "Unknown error"}` },
          { status: 400 }
        );
      }
    }

    // Create signer for the network
    const signer = createHederaSigner(network, HEDERA_PRIVATE_KEY, HEDERA_ACCOUNT_ID);

    // Verify the payment
    const verifyResponse = await verify(signer, paymentPayload, paymentRequirements);

    return NextResponse.json(verifyResponse);
  } catch (error) {
    console.error("Error in POST /api/facilitator/verify:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

