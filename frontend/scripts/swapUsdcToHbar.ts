#!/usr/bin/env tsx

/**
 * Swap USDC to HBAR using ethers.js
 * Uses swapExactTokensForETH function (Token -> Native)
 *
 * Usage:
 *   cd frontend && USDC_AMOUNT=0.2 npm run tsx scripts/swapUsdcToHbar.ts
 *
 * Example:
 *   USDC_AMOUNT=0.2 npm run tsx scripts/swapUsdcToHbar.ts
 *
 * Environment Variables:
 *   USDC_AMOUNT - Amount of USDC to swap (e.g., "0.2")
 *   PRIVATE_KEY - Private key for signing (0x... format)
 *   RPC_URL - Optional, defaults to mainnet
 *   RECIPIENT - Optional, defaults to wallet address
 */

import * as dotenv from "dotenv";
import { ethers } from "ethers";
import { ROUTER_ABI } from "../lib/shared/contracts/router-abi";
import { ERC20_ABI } from "../lib/shared/contracts/saucerswap";

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const PRIVATE_KEY = process.env.HEDERA_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || "https://mainnet.hashio.io/api";
const ROUTER_ADDRESS = "0x00000000000000000000000000000000006715e6"; // Mainnet router EVM address

// Token addresses (EVM format)
const USDC_ADDRESS = "0x000000000000000000000000000000000006f89a"; // USDC EVM address (0.0.456858)
const WHBAR_ADDRESS = "0x0000000000000000000000000000000000163B5a"; // WHBAR EVM address (0.0.1456986)

// USDC has 6 decimals
const USDC_DECIMALS = 6;

// Swap path: USDC -> WHBAR
const SWAP_PATH = [USDC_ADDRESS, WHBAR_ADDRESS];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse USDC amount to smallest unit (6 decimals)
 */
function parseUsdcAmount(amount: string): bigint {
  const amountFloat = parseFloat(amount);
  if (isNaN(amountFloat) || amountFloat <= 0) {
    throw new Error(`Invalid USDC amount: ${amount}`);
  }
  return BigInt(Math.floor(amountFloat * 10 ** USDC_DECIMALS));
}

/**
 * Format USDC amount from smallest unit
 */
function formatUsdcAmount(amount: bigint): string {
  return (Number(amount) / 10 ** USDC_DECIMALS).toFixed(USDC_DECIMALS);
}

/**
 * Check and approve token spending
 */
async function ensureTokenApproval(
  tokenContract: ethers.Contract,
  spender: string,
  amount: bigint,
  signer: ethers.Signer,
): Promise<void> {
  const owner = await signer.getAddress();

  // Check current allowance
  const currentAllowance = await tokenContract.allowance(owner, spender);
  console.log(`   Current allowance: ${formatUsdcAmount(currentAllowance)} USDC`);

  if (currentAllowance >= amount) {
    console.log(`   ✅ Token already approved`);
    return;
  }

  console.log(`   ⚠️  Token approval needed`);
  console.log(`      Required: ${formatUsdcAmount(amount)} USDC`);

  // Approve with 10% buffer
  const approvalAmount = (amount * BigInt(110)) / BigInt(100);
  console.log(`   Approving ${formatUsdcAmount(approvalAmount)} USDC...`);

  const approveTx = await tokenContract.approve(spender, approvalAmount);
  console.log(`   🔄 Approval transaction sent: ${approveTx.hash}`);

  // Wait for confirmation
  const receipt = await approveTx.wait();

  if (!receipt || receipt.status !== 1) {
    throw new Error(`Token approval failed with status: ${receipt?.status}`);
  }

  console.log(`   ✅ Token approval confirmed`);
}

// ============================================================================
// MAIN SWAP FUNCTION
// ============================================================================

async function executeSwapUsdcToHbar(
  usdcAmountStr: string,
  recipientAddress?: string,
): Promise<{ transactionHash: string; amountOut: string }> {
  console.log("🔄 Starting USDC to HBAR swap (swapExactTokensForETH)...");

  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const recipient = recipientAddress || wallet.address;

  console.log(`   Wallet Address: ${wallet.address}`);
  console.log(`   Recipient: ${recipient}`);
  console.log(`   RPC URL: ${RPC_URL}`);

  // Check USDC balance
  const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const usdcBalance = await usdcContract.balanceOf(wallet.address);
  console.log(`   USDC Balance: ${formatUsdcAmount(usdcBalance)} USDC`);

  // Parse USDC amount
  const amountIn = parseUsdcAmount(usdcAmountStr);
  console.log(`   Amount In: ${usdcAmountStr} USDC = ${amountIn.toString()} (smallest unit)`);

  // Check balance
  if (usdcBalance < amountIn) {
    throw new Error(
      `Insufficient USDC balance: Need ${formatUsdcAmount(amountIn)} USDC, but have ${formatUsdcAmount(usdcBalance)} USDC`,
    );
  }

  // Check and approve token spending
  const usdcContractWithSigner = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
  await ensureTokenApproval(usdcContractWithSigner, ROUTER_ADDRESS, amountIn, wallet);

  // Calculate deadline (20 minutes from now)
  const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
  console.log(`   Deadline: ${deadline} (20 minutes from now)`);

  // Amount out min (0 for testing - no slippage protection)
  const amountOutMin = BigInt(0);
  console.log(`   Amount Out Min: ${amountOutMin} (using 0 - no minimum check)`);

  console.log(`   Swap Path: ${SWAP_PATH.join(" -> ")}`);

  // Create router contract instance
  const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

  // Get gas price
  const feeData = await provider.getFeeData();
  console.log(`   Gas Price: ${feeData.gasPrice?.toString()} wei`);

  // Estimate gas
  let gasLimit = 7_000_000; // Default for Hedera
  try {
    const estimatedGas = await routerContract.swapExactTokensForETH.estimateGas(
      amountIn,
      amountOutMin,
      SWAP_PATH,
      recipient,
      deadline,
    );
    // Add 20% buffer
    const gasWithBuffer = estimatedGas + (estimatedGas * BigInt(20)) / BigInt(100);
    gasLimit = Number(gasWithBuffer);

    // Cap at 7M for Hedera
    if (gasLimit > 7_000_000) {
      gasLimit = 7_000_000;
    }

    console.log(`   Estimated Gas: ${estimatedGas.toString()}, Using: ${gasLimit.toString()}`);
  } catch (error: any) {
    console.log(`   ⚠️  Gas estimation failed, using default: ${gasLimit}`);
    console.log(`   Error: ${error.message}`);
  }

  // Populate transaction
  const populatedTx = await routerContract.swapExactTokensForETH.populateTransaction(
    amountIn,
    amountOutMin,
    SWAP_PATH,
    recipient,
    deadline,
    {
      gasLimit: gasLimit,
      // No gasPrice for Hedera - let RPC handle it
    },
  );

  console.log(`   Transaction data: ${populatedTx.data?.substring(0, 50)}...`);
  console.log(
    `   Transaction value: ${populatedTx.value?.toString() || "0"} (should be 0 for token swaps)`,
  );

  // Send transaction
  const txResponse = await wallet.sendTransaction({
    to: populatedTx.to,
    data: populatedTx.data,
    value: populatedTx.value || 0, // Should be 0 for token swaps
    gasLimit: populatedTx.gasLimit,
    // Don't set gasPrice for Hedera
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

  // Parse Swap event to get amount out
  let amountOut = "0";
  try {
    const contractInterface = new ethers.Interface(ROUTER_ABI);

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
      if (parsed && parsed.args) {
        const args = parsed.args as any;
        const amount0Out = args.amount0Out?.toString() || "0";
        const amount1Out = args.amount1Out?.toString() || "0";
        amountOut = amount0Out !== "0" ? amount0Out : amount1Out;
        // Convert from wei to HBAR (18 decimals)
        const amountOutHbar = ethers.formatEther(amountOut);
        console.log(`   Amount Out: ${amountOutHbar} HBAR (${amountOut} wei)`);
        amountOut = amountOutHbar;
      }
    } else {
      console.log(`   Note: Amount out will be available in transaction events`);
      console.log(`   Check transaction on HashScan for detailed amounts`);
    }
  } catch (error: any) {
    console.warn(`   Warning: Could not parse transaction result: ${error.message}`);
  }

  return {
    transactionHash: txResponse.hash,
    amountOut: amountOut,
  };
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  const usdcAmount = process.env.USDC_AMOUNT || "0.2";
  const recipient = process.env.RECIPIENT;

  if (!PRIVATE_KEY) {
    console.error("❌ Error: PRIVATE_KEY environment variable is required");
    console.error("Usage: PRIVATE_KEY=0x... USDC_AMOUNT=0.2 npm run tsx scripts/swapUsdcToHbar.ts");
    process.exit(1);
  }

  // Validate USDC amount
  const usdcAmountNum = parseFloat(usdcAmount);
  if (isNaN(usdcAmountNum) || usdcAmountNum <= 0) {
    console.error(`❌ Error: Invalid USDC amount: ${usdcAmount}`);
    process.exit(1);
  }

  console.log("🔄 Starting USDC to HBAR swap...");
  console.log(
    `   Network: ${RPC_URL.includes("mainnet") ? "mainnet" : RPC_URL.includes("testnet") ? "testnet" : "custom"}`,
  );
  console.log(`   USDC Amount: ${usdcAmount}`);
  console.log(`   Swap Path: USDC -> WHBAR (HBAR)`);
  if (recipient) {
    console.log(`   Recipient: ${recipient}`);
  }

  try {
    const result = await executeSwapUsdcToHbar(usdcAmount, recipient);

    console.log("\n✅ Swap completed successfully!");
    console.log(`   Transaction Hash: ${result.transactionHash}`);
    console.log(`   Amount Out: ${result.amountOut} HBAR`);

    if (result.transactionHash) {
      const network = RPC_URL.includes("mainnet") ? "mainnet" : "testnet";
      console.log(
        `\n📝 View transaction: https://hashscan.io/${network}/transaction/${result.transactionHash}`,
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
