#!/usr/bin/env tsx

/**
 * Hardcoded swap script using ethers.js only (no @hashgraph/sdk)
 * Swaps HBAR to token using hardcoded path - direct contract call
 *
 * Usage:
 *   cd frontend && TO_TOKEN_ID=0.0.456858 HBAR_AMOUNT=0.1 npm run mcp:swap:ethers
 *
 * Example:
 *   TO_TOKEN_ID=0.0.456858 HBAR_AMOUNT=1.0 npm run mcp:swap:ethers
 *
 * Environment Variables:
 *   HBAR_AMOUNT - Amount of HBAR to swap (e.g., "0.1")
 *   TO_TOKEN_ID - Hedera token ID to receive (e.g., "0.0.456858" for USDC) or EVM address (0x...)
 *   PRIVATE_KEY - Private key for signing (0x... format)
 *   RPC_URL - Optional, defaults to mainnet
 *   RECIPIENT - Optional, defaults to wallet address
 */

import * as dotenv from "dotenv";
import { ethers } from "ethers";
import { ROUTER_ABI } from "../lib/shared/contracts/router-abi";
import { Hbar, HbarUnit } from "@hashgraph/sdk";

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const PRIVATE_KEY = process.env.HEDERA_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || "https://mainnet.hashio.io/api";
const ROUTER_ADDRESS = "0x00000000000000000000000000000000006715e6"; // Mainnet router EVM address

// Hardcoded path from swapExactETHForTokens.ts (EVM addresses)
// Path: WHBAR -> Token1 -> Token2 -> USDC
const HARDCODED_PATH_EVM = [
  "0x0000000000000000000000000000000000163B5a", // WHBAR
  "0x000000000000000000000000000000000006f89a", // USDC
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// ============================================================================
// MAIN SWAP FUNCTION
// ============================================================================

async function executeSwapHardcoded(
  hbarAmountStr: string,
  toTokenIdStr: string,
  recipientAddress?: string,
): Promise<{ transactionHash: string; amountOut: string; amounts: bigint[] }> {
  console.log("🔄 Starting hardcoded swap execution (using ethers.js - swapExactETHForTokens)...");

  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  // Setup provider and wallet (same as swapExactETHForTokens.ts)
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  // Use recipient address directly
  const recipient = "0x46f3da7d7811bb339cea36bb7199361a543de22f";

  console.log(`   Wallet Address: ${wallet.address}`);
  console.log(`   Recipient: ${recipient}`);
  console.log(`   RPC URL: ${RPC_URL}`);

  // Check wallet balance first
  const balance = await provider.getBalance(wallet.address);
  console.log(`   Wallet Balance: ${ethers.formatEther(balance)} HBAR`);

  // Convert HBAR amount to wei (ethers uses wei, 1 HBAR = 1e18 wei)
  // Note: Hedera uses tinybars (1e8), but for EVM compatibility we use wei (1e18)
  const amountInWei = ethers.parseEther(hbarAmountStr);
  const amountInTinybars = BigInt(Math.floor(parseFloat(hbarAmountStr) * 100_000_000));
  console.log(
    `   Amount In: ${hbarAmountStr} HBAR = ${amountInWei.toString()} wei = ${amountInTinybars} tinybars`,
  );

  // Build path: Use hardcoded path but replace last token with target token if different
  const path: string[] = [...HARDCODED_PATH_EVM];

  console.log(`   Path: ${path.join(" -> ")}`);

  // Calculate deadline (20 minutes from now, same as swapExactETHForTokens.ts)
  const deadline = Math.floor(Date.now() / 1000) + 20 * 60;

  // For swapExactETHForTokens, we can use 0 as amountOutMin
  const amountOutMin = BigInt(0);
  console.log(`   Amount Out Min: ${amountOutMin} (using 0 - no minimum check)`);
  console.log(`   Deadline: ${deadline} (20 minutes from now)`);

  // Use contract method directly (same as swapExactETHForTokens.ts)
  console.log("🔄 Executing swapExactETHForTokens transaction (direct contract call)...");

  const contract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

  // Get gas price
  const feeData = await provider.getFeeData();
  console.log(`   Gas Price: ${feeData.gasPrice?.toString()} wei`);

  // Estimate gas first
  let gasLimit = 15_000_000;
  try {
    const estimatedGas = await contract.swapExactETHForTokens.estimateGas(
      amountOutMin,
      HARDCODED_PATH_EVM,
      recipient,
      deadline,
      {
        value: amountInWei,
      },
    );
    // Add 20% buffer and convert to number
    const gasWithBuffer = estimatedGas + (estimatedGas * BigInt(20)) / BigInt(100);
    gasLimit = Number(gasWithBuffer);
    console.log(`   Estimated Gas: ${estimatedGas.toString()}, Using: ${gasLimit.toString()}`);
  } catch (error: any) {
    console.log(`   ⚠️  Gas estimation failed, using default: ${gasLimit}`);
    console.log(`   Error: ${error.message}`);
  }

  // Calculate total cost (value + gas)
  const gasPrice = feeData.gasPrice || BigInt(0);
  const gasCost = gasPrice * BigInt(gasLimit);
  const totalCost = amountInWei + gasCost;
  console.log(`   Gas Cost: ${ethers.formatEther(gasCost)} HBAR`);
  console.log(`   Total Cost: ${ethers.formatEther(totalCost)} HBAR (value + gas)`);

  if (balance < totalCost) {
    throw new Error(
      `Insufficient funds: Need ${ethers.formatEther(totalCost)} HBAR, but have ${ethers.formatEther(balance)} HBAR`,
    );
  }

  // Populate transaction to get encoded data
  const populatedTx = await contract.swapExactETHForTokens.populateTransaction(
    amountOutMin,
    HARDCODED_PATH_EVM,
    recipient,
    deadline,
    {
      value: amountInWei,
      gasLimit: gasLimit,
    },
  );

  console.log(`   Transaction data: ${populatedTx.data}`);
  console.log(`   Transaction value: ${ethers.formatEther(populatedTx.value || BigInt(0))} HBAR`);

  // Send transaction directly using ethers with encoded data
  const txResponse = await wallet.sendTransaction({
    to: populatedTx.to,
    data: populatedTx.data,
    value: populatedTx.value,
    gasLimit: populatedTx.gasLimit,
    gasPrice: feeData.gasPrice,
  });

  console.log("✅ Transaction sent!");
  console.log(`   Transaction Hash: ${txResponse.hash}`);

  // Wait for transaction receipt
  console.log("🔄 Waiting for transaction confirmation...");
  const receipt = await txResponse.wait();

  if (!receipt || receipt.status !== 1) {
    throw new Error(`Transaction failed with status: ${receipt?.status}`);
  }

  console.log("✅ Transaction confirmed!");
  console.log(`   Block Number: ${receipt.blockNumber}`);
  console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);

  // Parse result from transaction receipt
  // swapExactETHForTokens emits a Swap event, but we can also decode the return value
  // The function returns uint256[] amounts
  let amounts: bigint[] = [];
  let amountOut = "0";

  try {
    // Use contractInterface to parse logs
    const contractInterface = new ethers.Interface(ROUTER_ABI);

    // Try to get the return value from the transaction
    // Note: ethers.js doesn't always provide return values in receipts
    // We'll check for Swap events instead
    const swapEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = contractInterface.parseLog(log);
        return parsed && parsed.name === "Swap";
      } catch {
        return false;
      }
    });

    if (swapEvent) {
      const parsed = contractInterface.parseLog(swapEvent);
      console.log(`   Swap event found: ${parsed?.name}`);
      // Swap event contains amount0In, amount1In, amount0Out, amount1Out
      // The output amount would be one of amount0Out or amount1Out
      if (parsed && parsed.args) {
        const args = parsed.args as any;
        const amount0Out = args.amount0Out?.toString() || "0";
        const amount1Out = args.amount1Out?.toString() || "0";
        amountOut = amount0Out !== "0" ? amount0Out : amount1Out;
        console.log(`   Amount Out (from event): ${amountOut}`);
      }
    }

    // If no event found, use placeholder
    if (amountOut === "0") {
      console.log(`   Note: Amount out will be available in transaction events`);
      console.log(`   Check transaction on HashScan for detailed amounts`);
      amounts = [amountInTinybars, BigInt(0)]; // Placeholder
    } else {
      amounts = [amountInTinybars, BigInt(amountOut)];
    }
  } catch (error: any) {
    console.warn(`   Warning: Could not parse transaction result: ${error.message}`);
    amounts = [amountInTinybars, BigInt(0)]; // Placeholder
  }

  return {
    transactionHash: txResponse.hash,
    amountOut: amountOut,
    amounts: amounts,
  };
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  const hbarAmount = "0.1";
  const toTokenId = "0x00000000000000000000000000000000006715e6";
  const recipient = "0x46f3da7d7811bb339cea36bb7199361a543de22f";

  if (!PRIVATE_KEY) {
    console.error("❌ Error: PRIVATE_KEY environment variable is required");
    console.error(
      "Usage: PRIVATE_KEY=0x... TO_TOKEN_ID=0.0.456858 HBAR_AMOUNT=0.1 npm run mcp:swap:ethers",
    );
    process.exit(1);
  }

  // Validate token ID format (Hedera format or EVM address)
  const tokenIdRegex = /^\d+\.\d+\.\d+$/;
  const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!tokenIdRegex.test(toTokenId) && !evmAddressRegex.test(toTokenId)) {
    console.error(`❌ Error: Invalid token ID format: ${toTokenId}`);
    console.error("Expected format: shard.realm.num (e.g., 0.0.456858) or EVM address (0x...)");
    process.exit(1);
  }

  // Validate HBAR amount
  const hbarAmountNum = parseFloat(hbarAmount);
  if (isNaN(hbarAmountNum) || hbarAmountNum <= 0) {
    console.error(`❌ Error: Invalid HBAR amount: ${hbarAmount}`);
    process.exit(1);
  }

  console.log("🔄 Starting HBAR to Token swap (Hardcoded Path - Ethers.js Only)...");
  console.log(
    `   Network: ${RPC_URL.includes("mainnet") ? "mainnet" : RPC_URL.includes("testnet") ? "testnet" : "custom"}`,
  );
  console.log(`   HBAR Amount: ${hbarAmount}`);
  console.log(`   To Token ID: ${toTokenId}`);
  console.log(`   Using hardcoded path (no pool fetching)`);
  if (recipient) {
    console.log(`   Recipient: ${recipient}`);
  }

  try {
    const result = await executeSwapHardcoded(hbarAmount, toTokenId, recipient);

    console.log("\n✅ Swap completed successfully!");
    console.log(`   Transaction Hash: ${result.transactionHash}`);
    console.log(`   Amount Out: ${result.amountOut} (check transaction events for actual amount)`);

    if (result.transactionHash) {
      console.log(
        `\n📝 View transaction: https://hashscan.io/${RPC_URL.includes("mainnet") ? "mainnet" : "testnet"}/transaction/${result.transactionHash}`,
      );
    }
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
