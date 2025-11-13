#!/usr/bin/env tsx

/**
 * Hardcoded swap script - swaps HBAR to token using hardcoded path
 * No pool fetching required - uses direct path from swapExactETHForTokens.ts
 *
 * Usage:
 *   cd frontend && TO_TOKEN_ID=0.0.456858 HBAR_AMOUNT=0.1 npm run mcp:swap:hardcode
 *
 * Example:
 *   TO_TOKEN_ID=0.0.456858 HBAR_AMOUNT=1.0 npm run mcp:swap:hardcode
 *
 * Environment Variables:
 *   HBAR_AMOUNT - Amount of HBAR to swap (e.g., "0.1")
 *   TO_TOKEN_ID - Hedera token ID to receive (e.g., "0.0.456858" for USDC)
 *   SLIPPAGE_TOLERANCE - Optional, default 0.5 (percentage)
 *   DEADLINE_SECONDS - Optional, default 300 (seconds)
 *   HEDERA_ACCOUNT_ID - Hedera account ID
 *   HEDERA_PRIVATE_KEY - Hedera private key
 *   HEDERA_NETWORK - Network: testnet, mainnet (default: mainnet)
 */

import * as dotenv from "dotenv";
import { ethers } from "ethers";
import {
  Client,
  AccountId,
  PrivateKey,
  ContractExecuteTransaction,
  AccountAllowanceApproveTransaction,
  Hbar,
  TokenId,
  TransactionRecord,
  Long,
} from "@hashgraph/sdk";
import { ROUTER_ABI } from "../lib/shared/contracts/router-abi";

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const HEDERA_ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID;
const HEDERA_PRIVATE_KEY = process.env.HEDERA_PRIVATE_KEY;
const HEDERA_NETWORK = process.env.HEDERA_NETWORK || "mainnet";

// SaucerSwap Configuration - MAINNET
const V2_SWAP_ROUTER_ADDRESS = "0.0.671506"; // Mainnet router
const HBAR_DECIMALS = 8;

// Simple ABI for quote (if needed)
const QUOTER_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
];

const routerAbiInterface = new ethers.Interface(ROUTER_ABI);

// Hardcoded path from swapExactETHForTokens.ts (EVM addresses)
// Path: WHBAR -> Token1 -> Token2 -> USDC
const HARDCODED_PATH_EVM = [
  "0x0000000000000000000000000000000000163B5a", // WHBAR
  "0x000000000000000000000000000000000078Eeda", // Token1
  "0x0000000000000000000000000000000000790451", // Token2
  "0x000000000000000000000000000000000006f89a", // USDC
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function hexStringToUint8Array(hexString: string): Uint8Array {
  if (hexString.length % 2 !== 0) {
    throw new Error("Invalid hexString: odd length");
  }
  const arrayBuffer = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    const byteValue = parseInt(hexString.slice(i, i + 2), 16);
    if (isNaN(byteValue)) {
      throw new Error("Invalid hexString: contains non-hex characters");
    }
    arrayBuffer[i / 2] = byteValue;
  }
  return arrayBuffer;
}

// ============================================================================
// HEDERA CLIENT SETUP
// ============================================================================

let client: Client;

async function getHederaClient(): Promise<Client> {
  if (client) {
    return client;
  }

  if (!HEDERA_ACCOUNT_ID || !HEDERA_PRIVATE_KEY) {
    console.error("FATAL: Hedera account ID or private key is missing. Check .env file");
    process.exit(1);
  }

  const accountId = AccountId.fromString(HEDERA_ACCOUNT_ID);
  const privateKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY);

  switch (HEDERA_NETWORK.toLowerCase()) {
    case "mainnet":
      client = Client.forMainnet();
      break;
    case "testnet":
      client = Client.forTestnet();
      break;
    case "previewnet":
      client = Client.forPreviewnet();
      break;
    default:
      console.error(`FATAL: Invalid Hedera network specified: ${HEDERA_NETWORK}`);
      process.exit(1);
  }

  try {
    const accountIdWithEvm = await accountId
      .populateAccountEvmAddress(client)
      .catch(() => accountId);
    client.setOperator(accountIdWithEvm, privateKey);
  } catch (error) {
    client.setOperator(accountId, privateKey);
    console.log(`Warning: Could not populate EVM address, using account ID directly`);
  }

  console.log(
    `✅ Hedera client initialized for network: ${HEDERA_NETWORK}, Account ID: ${HEDERA_ACCOUNT_ID}`,
  );
  return client;
}

async function getClientAndOperatorDetails(): Promise<{
  client: Client;
  operatorAccountId: AccountId;
  operatorEvmAddress: string;
}> {
  const client = await getHederaClient();
  if (!client.operatorAccountId) {
    throw new Error("Operator account ID is not configured in the client.");
  }

  const rawEvmAddress = client.operatorAccountId.evmAddress;
  if (!rawEvmAddress) {
    throw new Error("Operator EVM address not found. This is required for swaps.");
  }
  const operatorEvmAddress =
    typeof rawEvmAddress === "string" ? rawEvmAddress : rawEvmAddress.toString();

  return { client, operatorAccountId: client.operatorAccountId, operatorEvmAddress };
}

// ============================================================================
// SWAP EXECUTION
// ============================================================================

async function executeSwapHardcoded(
  hbarAmountStr: string,
  toTokenIdStr: string,
  slippageTolerancePercent: number = 0.5,
  deadlineSeconds: number = 300,
): Promise<{ transactionId: string; amountOut: string }> {
  console.log("🔄 Starting hardcoded swap execution (using swapExactETHForTokens - no quote)...");

  const { client, operatorAccountId, operatorEvmAddress } = await getClientAndOperatorDetails();

  // Convert HBAR amount to tinybars
  const amountInTinybars = BigInt(Math.floor(parseFloat(hbarAmountStr) * 100_000_000));
  console.log(`   Amount In: ${hbarAmountStr} HBAR = ${amountInTinybars} tinybars`);

  // Build path: Use hardcoded path but replace last token with target token if different
  const path: string[] = [...HARDCODED_PATH_EVM];

  // If target token is provided and different from last in path, replace it
  // Convert Hedera token ID to EVM address if needed
  let targetTokenEvmAddress: string;
  if (toTokenIdStr.startsWith("0x")) {
    targetTokenEvmAddress = toTokenIdStr;
  } else {
    const targetToken = TokenId.fromString(toTokenIdStr);
    targetTokenEvmAddress = `0x${targetToken.toSolidityAddress()}`;
  }

  // Replace last token in path with target token
  path[path.length - 1] = targetTokenEvmAddress;

  console.log(`   Path: ${path.join(" -> ")}`);

  // Calculate deadline
  const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;

  // For swapExactETHForTokens, we can use 0 as amountOutMin (or calculate with slippage)
  // Using 0 for now - in production you'd want to calculate this properly
  const amountOutMin = BigInt(0);
  console.log(`   Amount Out Min: ${amountOutMin} (using 0 - no minimum check)`);
  console.log(`   Deadline: ${deadline} (${deadlineSeconds}s from now)`);
  console.log(`   Recipient: ${operatorEvmAddress}`);

  // Encode swapExactETHForTokens function call directly
  // Function signature: swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline)
  const swapFunctionData = routerAbiInterface.encodeFunctionData("swapExactETHForTokens", [
    amountOutMin,
    path,
    operatorEvmAddress,
    deadline,
  ]);

  // Convert function data to Uint8Array (remove 0x prefix)
  const functionParameters = hexStringToUint8Array(swapFunctionData.slice(2));

  // Execute transaction directly using swapExactETHForTokens - NO QUOTE, DIRECT CALL
  console.log("🔄 Executing swapExactETHForTokens transaction (direct contract call)...");
  const swapTransaction = new ContractExecuteTransaction()
    .setContractId(V2_SWAP_ROUTER_ADDRESS)
    .setGas(7_000_000) // Higher gas limit for direct swap
    .setFunctionParameters(functionParameters)
    .setPayableAmount(Hbar.fromTinybars(amountInTinybars.toString()));

  const signedTx = await swapTransaction.freezeWith(client).signWithOperator(client);
  const txResponse = await signedTx.execute(client);
  console.log(`   Transaction ID: ${txResponse.transactionId.toString()}`);

  const record = await txResponse.getRecord(client);
  console.log(`   Status: ${record.receipt.status.toString()}`);

  if (record.receipt.status.toString().toUpperCase() !== "SUCCESS") {
    throw new Error(
      `Swap transaction failed with status: ${record.receipt.status.toString()} - ${record.contractFunctionResult?.errorMessage}`,
    );
  }

  // Parse result (swapExactETHForTokens returns uint256[] amounts)
  let amountOut = "0";
  try {
    if (record.contractFunctionResult?.bytes && record.contractFunctionResult.bytes.length > 0) {
      // swapExactETHForTokens returns: uint256[] amounts
      const decodedResult = routerAbiInterface.decodeFunctionResult(
        "swapExactETHForTokens",
        record.contractFunctionResult.bytes,
      );
      // The result is an array of amounts, the last one is the output amount
      const amounts = decodedResult.amounts as bigint[];
      if (amounts && amounts.length > 0) {
        amountOut = amounts[amounts.length - 1].toString();
        console.log(`   Amount Out: ${amountOut}`);
      }
    } else {
      console.warn(`   Note: Could not parse amount out from transaction result`);
      console.warn(`   Transaction succeeded - check transaction details for actual amount`);
    }
  } catch (error: any) {
    console.warn(`   Warning: Could not decode transaction result: ${error.message}`);
    console.warn(`   Transaction succeeded - check transaction details for actual amount`);
  }

  return {
    transactionId: txResponse.transactionId.toString(),
    amountOut: amountOut,
  };
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  const hbarAmount = process.env.HBAR_AMOUNT || "0.1";
  const toTokenId = process.env.TO_TOKEN_ID;
  const slippageTolerance = parseFloat(process.env.SLIPPAGE_TOLERANCE || "0.5");
  const deadlineSeconds = parseInt(process.env.DEADLINE_SECONDS || "300", 10);

  if (!toTokenId) {
    console.error("❌ Error: TO_TOKEN_ID environment variable is required");
    console.error("Usage: TO_TOKEN_ID=0.0.456858 HBAR_AMOUNT=0.1 npm run mcp:swap:hardcode");
    process.exit(1);
  }

  const tokenIdRegex = /^\d+\.\d+\.\d+$/;
  if (!tokenIdRegex.test(toTokenId) && !toTokenId.startsWith("0x")) {
    console.error(`❌ Error: Invalid token ID format: ${toTokenId}`);
    console.error("Expected format: shard.realm.num (e.g., 0.0.456858) or EVM address (0x...)");
    process.exit(1);
  }

  const hbarAmountNum = parseFloat(hbarAmount);
  if (isNaN(hbarAmountNum) || hbarAmountNum <= 0) {
    console.error(`❌ Error: Invalid HBAR amount: ${hbarAmount}`);
    process.exit(1);
  }

  if (!HEDERA_ACCOUNT_ID || !HEDERA_PRIVATE_KEY) {
    console.error(
      "❌ Error: HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY environment variables are required",
    );
    process.exit(1);
  }

  console.log("🔄 Starting HBAR to Token swap (Hardcoded Path)...");
  console.log(`   Network: ${HEDERA_NETWORK}`);
  console.log(`   HBAR Amount: ${hbarAmount}`);
  console.log(`   To Token ID: ${toTokenId}`);
  console.log(`   Slippage: ${slippageTolerance}%`);
  console.log(`   Deadline: ${deadlineSeconds}s`);
  console.log(`   Using hardcoded path (no pool fetching)`);

  try {
    const result = await executeSwapHardcoded(
      hbarAmount,
      toTokenId,
      slippageTolerance,
      deadlineSeconds,
    );

    console.log("\n✅ Swap completed successfully!");
    console.log(`   Transaction ID: ${result.transactionId}`);
    console.log(`   Amount Out: ${result.amountOut} (smallest unit)`);
    console.log(
      `\n📝 View transaction: https://hashscan.io/${HEDERA_NETWORK}/transaction/${result.transactionId}`,
    );
  } catch (error: any) {
    console.error("\n❌ Error during swap:");
    console.error(error.message || error);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
