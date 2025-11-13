#!/usr/bin/env tsx

/**
 * Test script for Hedera x402 Facilitator
 * 
 * This script tests the facilitator endpoints by:
 * 1. Creating a payment transaction (HBAR or token)
 * 2. Verifying the payment via /api/facilitator/verify
 * 3. Settling the payment via /api/facilitator/settle
 * 
 * Usage:
 *   cd frontend && tsx scripts/testFacilitator.ts
 * 
 * Environment Variables:
 *   HEDERA_ACCOUNT_ID - Your Hedera account ID (payer)
 *   HEDERA_PRIVATE_KEY - Your Hedera private key (payer)
 *   HEDERA_FACILITATOR_ACCOUNT_ID - Facilitator account ID (from .env.local)
 *   HEDERA_FACILITATOR_PRIVATE_KEY - Facilitator private key (from .env.local)
 *   FACILITATOR_URL - Facilitator API URL (default: http://localhost:3000)
 *   PAYMENT_TYPE - "hbar" or "token" (default: "hbar")
 *   AMOUNT - Payment amount (default: "50000000" = 0.5 HBAR in tinybars)
 *   TOKEN_ID - Token ID if PAYMENT_TYPE is "token" (default: "0.0.429274" for USDC testnet)
 */

import * as dotenv from "dotenv";
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
  createHederaSigner,
  serializeTransaction,
  PaymentPayload,
  PaymentRequirements,
} from "../lib/shared/blockchain/hedera/facilitator";

// Load environment variables
dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const HEDERA_ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID;
const HEDERA_PRIVATE_KEY = process.env.HEDERA_PRIVATE_KEY;
const HEDERA_FACILITATOR_ACCOUNT_ID = process.env.HEDERA_FACILITATOR_ACCOUNT_ID;
const HEDERA_FACILITATOR_PRIVATE_KEY = process.env.HEDERA_FACILITATOR_PRIVATE_KEY;
const FACILITATOR_URL = process.env.FACILITATOR_URL || "http://localhost:3000";
const PAYMENT_TYPE = (process.env.PAYMENT_TYPE || "hbar").toLowerCase();
const AMOUNT = process.env.AMOUNT || "50000000"; // 0.5 HBAR in tinybars
const TOKEN_ID = process.env.TOKEN_ID || "0.0.429274"; // USDC on testnet
const NETWORK = process.env.HEDERA_NETWORK || "hedera-testnet";
const PAY_TO = process.env.PAY_TO || HEDERA_FACILITATOR_ACCOUNT_ID || "";

// ============================================================================
// VALIDATION
// ============================================================================

if (!HEDERA_ACCOUNT_ID || !HEDERA_PRIVATE_KEY) {
  console.error("❌ Missing required environment variables:");
  console.error("   HEDERA_ACCOUNT_ID - Your Hedera account ID");
  console.error("   HEDERA_PRIVATE_KEY - Your Hedera private key");
  process.exit(1);
}

if (!HEDERA_FACILITATOR_ACCOUNT_ID || !HEDERA_FACILITATOR_PRIVATE_KEY) {
  console.error("❌ Missing facilitator environment variables:");
  console.error("   HEDERA_FACILITATOR_ACCOUNT_ID - Facilitator account ID");
  console.error("   HEDERA_FACILITATOR_PRIVATE_KEY - Facilitator private key");
  console.error("\n   These should be set in your .env.local file");
  process.exit(1);
}

if (!PAY_TO) {
  console.error("❌ Missing PAY_TO environment variable or HEDERA_FACILITATOR_ACCOUNT_ID");
  process.exit(1);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a Hedera client for the specified network
 */
function createClient(network: string): Client {
  if (network === "hedera-testnet") {
    return Client.forTestnet();
  } else if (network === "hedera-mainnet") {
    return Client.forMainnet();
  } else {
    throw new Error(`Unsupported network: ${network}`);
  }
}

/**
 * Creates a HBAR transfer transaction
 */
function createHbarTransferTransaction(
  fromAccount: AccountId,
  toAccount: AccountId,
  facilitatorAccount: AccountId,
  amount: string,
  client: Client,
): TransferTransaction {
  const transactionId = TransactionId.generate(facilitatorAccount);
  
  const transaction = new TransferTransaction()
    .setTransactionId(transactionId)
    .addHbarTransfer(fromAccount, Hbar.fromTinybars(-parseInt(amount)))
    .addHbarTransfer(toAccount, Hbar.fromTinybars(amount));

  return transaction.freezeWith(client);
}

/**
 * Creates a token transfer transaction
 */
function createTokenTransferTransaction(
  fromAccount: AccountId,
  toAccount: AccountId,
  facilitatorAccount: AccountId,
  tokenId: TokenId,
  amount: string,
  client: Client,
): TransferTransaction {
  const transactionId = TransactionId.generate(facilitatorAccount);
  
  const transaction = new TransferTransaction()
    .setTransactionId(transactionId)
    .addTokenTransfer(tokenId, fromAccount, -parseInt(amount))
    .addTokenTransfer(tokenId, toAccount, parseInt(amount));

  return transaction.freezeWith(client);
}

/**
 * Creates and signs a payment payload
 */
async function createPaymentPayload(
  payerSigner: { accountId: AccountId; privateKey: PrivateKey; client: Client },
  paymentRequirements: PaymentRequirements,
): Promise<PaymentPayload> {
  const facilitatorAccountId = AccountId.fromString(paymentRequirements.extra!.feePayer!);
  const toAccountId = AccountId.fromString(paymentRequirements.payTo);

  let transaction: TransferTransaction;

  if (paymentRequirements.asset === "0.0.0" || paymentRequirements.asset.toLowerCase() === "hbar") {
    // HBAR transfer
    transaction = createHbarTransferTransaction(
      payerSigner.accountId,
      toAccountId,
      facilitatorAccountId,
      paymentRequirements.maxAmountRequired,
      payerSigner.client,
    );
  } else {
    // Token transfer
    const tokenId = TokenId.fromString(paymentRequirements.asset);
    transaction = createTokenTransferTransaction(
      payerSigner.accountId,
      toAccountId,
      facilitatorAccountId,
      tokenId,
      paymentRequirements.maxAmountRequired,
      payerSigner.client,
    );
  }

  // Sign the transaction
  const signedTransaction = await transaction.sign(payerSigner.privateKey);
  const base64Transaction = serializeTransaction(signedTransaction);

  return {
    x402Version: 1,
    scheme: "exact",
    network: paymentRequirements.network,
    payload: {
      transaction: base64Transaction,
    },
  };
}

/**
 * Tests the facilitator /supported endpoint
 */
async function testSupported(): Promise<void> {
  console.log("\n📋 Testing GET /api/facilitator/supported...");
  
  try {
    const response = await fetch(`${FACILITATOR_URL}/api/facilitator/supported`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    console.log("✅ Supported payment kinds:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Error testing /supported:", error);
    throw error;
  }
}

/**
 * Tests the facilitator /verify endpoint
 */
async function testVerify(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<boolean> {
  console.log("\n🔍 Testing POST /api/facilitator/verify...");
  
  try {
    const response = await fetch(`${FACILITATOR_URL}/api/facilitator/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentPayload,
        paymentRequirements,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    console.log("✅ Verify response:");
    console.log(JSON.stringify(data, null, 2));

    return data.isValid === true;
  } catch (error) {
    console.error("❌ Error testing /verify:", error);
    throw error;
  }
}

/**
 * Tests the facilitator /settle endpoint
 */
async function testSettle(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<void> {
  console.log("\n💰 Testing POST /api/facilitator/settle...");
  
  try {
    const response = await fetch(`${FACILITATOR_URL}/api/facilitator/settle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentPayload,
        paymentRequirements,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    console.log("✅ Settle response:");
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log(`\n🎉 Payment settled successfully!`);
      console.log(`   Transaction ID: ${data.transaction}`);
      console.log(`   Network: ${data.network}`);
      console.log(`   Payer: ${data.payer}`);
    } else {
      console.error(`\n❌ Payment settlement failed: ${data.errorReason}`);
    }
  } catch (error) {
    console.error("❌ Error testing /settle:", error);
    throw error;
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main(): Promise<void> {
  console.log("🚀 Starting Hedera x402 Facilitator Test");
  console.log("=".repeat(60));
  console.log(`Network: ${NETWORK}`);
  console.log(`Payment Type: ${PAYMENT_TYPE}`);
  console.log(`Amount: ${AMOUNT}`);
  if (PAYMENT_TYPE === "token") {
    console.log(`Token ID: ${TOKEN_ID}`);
  }
  console.log(`Pay To: ${PAY_TO}`);
  console.log(`Facilitator URL: ${FACILITATOR_URL}`);
  console.log("=".repeat(60));

  try {
    // Create client and signer
    const client = createClient(NETWORK);
    const payerPrivateKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY!);
    const payerAccountId = AccountId.fromString(HEDERA_ACCOUNT_ID!);
    client.setOperator(payerAccountId, payerPrivateKey);

    const payerSigner = {
      accountId: payerAccountId,
      privateKey: payerPrivateKey,
      client,
    };

    // Create payment requirements
    const asset = PAYMENT_TYPE === "hbar" ? "0.0.0" : TOKEN_ID;
    const paymentRequirements: PaymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: AMOUNT,
      asset,
      payTo: PAY_TO,
      resource: `${FACILITATOR_URL}/test-endpoint`,
      description: `Test payment for ${PAYMENT_TYPE === "hbar" ? "HBAR" : "Token"}`,
      mimeType: "application/json",
      maxTimeoutSeconds: 60,
      extra: {
        feePayer: HEDERA_FACILITATOR_ACCOUNT_ID!,
      },
    };

    console.log("\n📝 Payment Requirements:");
    console.log(JSON.stringify(paymentRequirements, null, 2));

    // Test /supported endpoint
    await testSupported();

    // Create payment payload
    console.log("\n🔨 Creating payment transaction...");
    const paymentPayload = await createPaymentPayload(payerSigner, paymentRequirements);
    console.log("✅ Payment payload created");

    // Test /verify endpoint
    const isValid = await testVerify(paymentPayload, paymentRequirements);

    if (!isValid) {
      console.error("\n❌ Payment verification failed. Cannot proceed with settlement.");
      process.exit(1);
    }

    // Test /settle endpoint
    await testSettle(paymentPayload, paymentRequirements);

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  } finally {
    // Clean up
    process.exit(0);
  }
}

// Run the test
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

