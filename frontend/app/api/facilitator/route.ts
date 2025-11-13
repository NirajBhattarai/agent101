import { NextRequest, NextResponse } from "next/server";
import {
  createHederaSigner,
  verify,
  settle,
  PaymentPayload,
  PaymentRequirements,
} from "@/lib/shared/blockchain/hedera/facilitator";

/**
 * GET /api/facilitator/supported - Returns facilitator supported payment kinds
 */
export async function GET(request: NextRequest) {
  const HEDERA_ACCOUNT_ID = process.env.HEDERA_FACILITATOR_ACCOUNT_ID;
  const HEDERA_PRIVATE_KEY = process.env.HEDERA_FACILITATOR_PRIVATE_KEY;

  if (!HEDERA_ACCOUNT_ID || !HEDERA_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "Facilitator not configured. Missing HEDERA_FACILITATOR_ACCOUNT_ID or HEDERA_FACILITATOR_PRIVATE_KEY" },
      { status: 500 }
    );
  }

  try {
    const signer = createHederaSigner("hedera-testnet", HEDERA_PRIVATE_KEY, HEDERA_ACCOUNT_ID);
    const feePayer = signer.accountId.toString();

    return NextResponse.json({
      kinds: [
        {
          x402Version: 1,
          scheme: "exact",
          network: "hedera-testnet",
          extra: {
            feePayer,
          },
        },
        {
          x402Version: 1,
          scheme: "exact",
          network: "hedera-mainnet",
          extra: {
            feePayer,
          },
        },
      ],
    });
  } catch (error) {
    console.error("Error in GET /api/facilitator/supported:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/facilitator - Routes to verify or settle based on query parameter
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "verify") {
    return handleVerify(request);
  } else if (action === "settle") {
    return handleSettle(request);
  }

  // Default to verify if no action specified
  return handleVerify(request);
}

/**
 * POST /api/facilitator?action=verify - Verify a payment payload
 */
async function handleVerify(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentPayload, paymentRequirements } = body as {
      paymentPayload: PaymentPayload;
      paymentRequirements: PaymentRequirements;
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

/**
 * POST /api/facilitator?action=settle - Settle a verified payment
 */
async function handleSettle(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentPayload, paymentRequirements } = body as {
      paymentPayload: PaymentPayload;
      paymentRequirements: PaymentRequirements;
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

    // Create signer for the network
    const signer = createHederaSigner(network, HEDERA_PRIVATE_KEY, HEDERA_ACCOUNT_ID);

    // Settle the payment
    const settleResponse = await settle(signer, paymentPayload, paymentRequirements);

    return NextResponse.json(settleResponse);
  } catch (error) {
    console.error("Error in POST /api/facilitator/settle:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

