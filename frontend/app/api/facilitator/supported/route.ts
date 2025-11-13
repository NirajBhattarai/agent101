import { NextRequest, NextResponse } from "next/server";
import { createHederaSigner } from "@/lib/shared/blockchain/hedera/facilitator";

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

