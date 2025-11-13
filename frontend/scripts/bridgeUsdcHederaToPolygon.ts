#!/usr/bin/env tsx

/**
 * Bridge Hedera HTS USDC from Hedera to Polygon using EtaBridge (HTS-OPTIMIZED)
 *
 * Key Features:
 * - Proper HTS token handling (0.0.456858 → EVM wrapper)
 * - Correct LayerZero chain ID: 109 (Polygon, not 30106)
 * - HTS-specific verification and diagnostics
 * - Complete error handling for HTS operations
 * - Quote testing before actual bridge
 *
 * HTS USDC Details:
 *   - HTS Token ID: 0.0.456858 (Hedera mainnet)
 *   - EVM Address: 0x000000000000000000000000000000000006f89a
 *   - Decimals: 6
 *   - Issuer: Circle
 *
 * Usage:
 *   cd frontend && tsx scripts/bridgeHtsUsdcToPolygon.ts
 *
 * Environment Variables:
 *   HEDERA_ACCOUNT_ID - EVM address (0x...)
 *   HEDERA_PRIVATE_KEY - Private key
 *   AMOUNT - Amount in USDC (e.g., "0.02")
 *   RECEIVER - Receiver address (default: sender)
 */

import { Options } from "@layerzerolabs/lz-v2-utilities";
import * as dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

// ============================================================================
// HTS-SPECIFIC CONFIGURATION
// ============================================================================

// Environment
const HEDERA_ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID;
const HEDERA_PRIVATE_KEY = process.env.HEDERA_PRIVATE_KEY;
const AMOUNT = process.env.AMOUNT || "0.02";
const RECEIVER = process.env.RECEIVER || "";

// Hedera
const JSON_RPC_URL = "https://mainnet.hashio.io/api";
const HEDERA_CHAIN_ID = 296; // LayerZero Hedera ID

// HTS USDC Configuration
const HTS_USDC_TOKEN_ID = "0.0.456858"; // Native Hedera HTS token
const HTS_USDC_EVM_ADDRESS = "0x000000000000000000000000000000000006f89a"; // EVM wrapper
const USDC_DECIMALS = 6;

// EtaBridge
const ETABRIDGE_CONTRACT_ADDRESS = "0xDc038e291D83e218c7bDf549059412eD7ed9133E";

// LayerZero Chain IDs (CORRECT)
const POLYGON_CHAIN_ID = 109; // Polygon Mainnet (NOT 30106!)

// Contract ABIs
const ETABRIDGE_ABI = [
  "function bridgeTokens(string symbol, uint256 amount, address receiver, uint32 targetChainId, bytes _options) payable returns ((bytes32 guid, uint64 nonce, (uint256 nativeFee, uint256 lzTokenFee) fee) receipt)",
  "function quote(string symbol, uint256 amount, address receiver, uint32 targetChainId, bytes _options) view returns (uint256 nativeFee)",
  "function supportedTokens(string) view returns (address)",
  "function feeBasisPoints() view returns (uint16)",
  "function owner() view returns (address)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function convertToSmallestUnit(amount: string, decimals: number = 6): bigint {
  const amountFloat = parseFloat(amount);
  const multiplier = BigInt(10 ** decimals);
  return BigInt(Math.floor(amountFloat * Number(multiplier)));
}

function getWallet(privateKey: string, provider: ethers.Provider): ethers.Wallet {
  return new ethers.Wallet(privateKey, provider);
}

function formatAmount(amount: bigint, decimals: number = 6): string {
  return (Number(amount) / 10 ** decimals).toFixed(decimals);
}

function decodeError(errorData?: string): { selector: string; reason: string } {
  if (!errorData || errorData.length < 10) {
    return { selector: "unknown", reason: "Unknown error" };
  }

  const selector = errorData.substring(0, 10);

  // Common error selectors
  const errorMap: { [key: string]: string } = {
    "0x6780cfaf": "TokenNotSupported - Token not in supportedTokens mapping",
    "0x4f3ec0d3": "Invalid chain ID or LayerZero configuration",
    "0x08c379a0": "Error (standard require/revert message)",
  };

  return {
    selector,
    reason: errorMap[selector] || `Unknown custom error: ${selector}`,
  };
}

function getLayerZeroOptions(gasAmount: number = 50000): string {
  const options = Options.newOptions().addExecutorLzReceiveOption(gasAmount, 0).toBytes();
  return options;
}

// ============================================================================
// HTS USDC DIAGNOSTICS
// ============================================================================

async function runHtsDiagnostics(
  provider: ethers.Provider,
  wallet: ethers.Wallet,
  bridgeContract: ethers.Contract,
  usdcContract: ethers.Contract,
): Promise<boolean> {
  console.log("\n🔍 HTS USDC DIAGNOSTICS");
  console.log("=".repeat(70));

  let allChecksPassed = true;

  // Check 1: Verify HTS wrapper exists
  console.log("\n1️⃣  HTS Wrapper Contract Verification");
  try {
    const code = await provider.getCode(HTS_USDC_EVM_ADDRESS);
    if (code === "0x") {
      console.error(`   ❌ HTS wrapper NOT found at ${HTS_USDC_EVM_ADDRESS}`);
      allChecksPassed = false;
    } else {
      console.log(`   ✅ HTS wrapper exists (${code.length} bytes of bytecode)`);
    }
  } catch (e: any) {
    console.error(`   ❌ Error checking wrapper: ${e.message}`);
    allChecksPassed = false;
  }

  // Check 2: Verify token metadata
  console.log("\n2️⃣  Token Metadata Verification");
  try {
    const symbol = await usdcContract.symbol();
    const name = await usdcContract.name();
    const decimals = await usdcContract.decimals();

    console.log(`   ✅ Symbol: ${symbol}`);
    console.log(`   ✅ Name: ${name}`);
    console.log(`   ✅ Decimals: ${decimals}`);

    if (symbol !== "USDC" || decimals !== 6) {
      console.warn(`   ⚠️  Token metadata mismatch! Expected USDC with 6 decimals`);
      allChecksPassed = false;
    }
  } catch (e: any) {
    console.error(`   ❌ Error reading token metadata: ${e.message}`);
    allChecksPassed = false;
  }

  // Check 3: Verify USDC is supported by EtaBridge
  console.log("\n3️⃣  EtaBridge USDC Support Verification");
  try {
    const supportedAddr = await bridgeContract.supportedTokens("USDC");

    if (supportedAddr === "0x0000000000000000000000000000000000000000") {
      console.error(`   ❌ USDC NOT registered in EtaBridge.supportedTokens`);
      console.error(`      The bridge contract doesn't know about HTS USDC!`);
      console.error(`      Action: Call addSupportedToken('USDC', ${HTS_USDC_EVM_ADDRESS})`);
      allChecksPassed = false;
    } else if (supportedAddr.toLowerCase() !== HTS_USDC_EVM_ADDRESS.toLowerCase()) {
      console.warn(`   ⚠️  USDC registered but at different address:`);
      console.warn(`      Expected: ${HTS_USDC_EVM_ADDRESS}`);
      console.warn(`      Actual:   ${supportedAddr}`);
      allChecksPassed = false;
    } else {
      console.log(`   ✅ USDC correctly registered in EtaBridge`);
    }
  } catch (e: any) {
    console.error(`   ❌ Error checking EtaBridge support: ${e.message}`);
    allChecksPassed = false;
  }

  // Check 4: Verify user's HTS USDC balance
  console.log("\n4️⃣  User Balance Verification");
  try {
    const balance = await usdcContract.balanceOf(wallet.address);
    const balanceFormatted = formatAmount(balance, USDC_DECIMALS);

    if (balance === BigInt(0)) {
      console.warn(`   ⚠️  Zero balance! User has no HTS USDC`);
      allChecksPassed = false;
    } else {
      console.log(`   ✅ Balance: ${balanceFormatted} USDC (${balance.toString()} smallest units)`);
    }
  } catch (e: any) {
    console.error(`   ❌ Error reading balance: ${e.message}`);
    allChecksPassed = false;
  }

  // Check 5: Verify approval/allowance
  console.log("\n5️⃣  Token Approval Verification");
  try {
    const allowance = await usdcContract.allowance(wallet.address, ETABRIDGE_CONTRACT_ADDRESS);
    const amountNeeded = convertToSmallestUnit(AMOUNT, USDC_DECIMALS);

    if (allowance < amountNeeded) {
      console.warn(`   ⚠️  Insufficient allowance`);
      console.warn(`      Current: ${formatAmount(allowance, USDC_DECIMALS)} USDC`);
      console.warn(`      Needed: ${formatAmount(amountNeeded, USDC_DECIMALS)} USDC`);
      console.warn(`      Action: Call approve() first`);
    } else {
      console.log(`   ✅ Sufficient allowance: ${formatAmount(allowance, USDC_DECIMALS)} USDC`);
    }
  } catch (e: any) {
    console.error(`   ❌ Error checking allowance: ${e.message}`);
    allChecksPassed = false;
  }

  // Check 6: Verify EtaBridge contract state
  console.log("\n6️⃣  EtaBridge Contract State Verification");
  try {
    const owner = await bridgeContract.owner();
    const fee = await bridgeContract.feeBasisPoints();

    console.log(`   ✅ Owner: ${owner}`);
    console.log(`   ✅ Fee basis points: ${fee}`);

    if (owner === "0x0000000000000000000000000000000000000000") {
      console.warn(`   ⚠️  EtaBridge has no owner! Contract might not be initialized`);
      allChecksPassed = false;
    }
  } catch (e: any) {
    console.error(`   ❌ Error reading contract state: ${e.message}`);
    allChecksPassed = false;
  }

  console.log("\n" + "=".repeat(70));

  if (!allChecksPassed) {
    console.error("\n⚠️  Some diagnostics failed. Address issues before bridging.\n");
  } else {
    console.log("\n✅ All diagnostics passed! Ready to bridge.\n");
  }

  return allChecksPassed;
}

// ============================================================================
// MAIN BRIDGE FUNCTION
// ============================================================================

async function bridgeHtsUsdc() {
  try {
    console.log("🌉 Bridging Hedera HTS USDC to Polygon via EtaBridge");
    console.log("=".repeat(70));

    // Validate env vars
    if (!HEDERA_ACCOUNT_ID || !HEDERA_PRIVATE_KEY) {
      throw new Error("Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY");
    }

    const senderAddress = HEDERA_ACCOUNT_ID;
    const receiverAddress = RECEIVER || senderAddress;

    console.log(`\n📋 Configuration:`);
    console.log(`   Sender: ${senderAddress}`);
    console.log(`   Receiver: ${receiverAddress}`);
    console.log(`   Amount: ${AMOUNT} HTS USDC`);
    console.log(`   Source Chain: Hedera (${HEDERA_CHAIN_ID})`);
    console.log(`   Destination: Polygon (${POLYGON_CHAIN_ID})`);
    console.log(`   HTS Token ID: ${HTS_USDC_TOKEN_ID}`);
    console.log(`   EVM Address: ${HTS_USDC_EVM_ADDRESS}`);

    // Connect
    console.log(`\n🔌 Connecting...`);
    const provider = new ethers.JsonRpcProvider(JSON_RPC_URL);
    const wallet = getWallet(HEDERA_PRIVATE_KEY, provider);
    const network = await provider.getNetwork();

    console.log(`   ✅ Network: ${network.name} (Chain ID: ${Number(network.chainId)})`);
    console.log(`   ✅ Wallet: ${wallet.address}`);

    // Initialize contracts
    const usdcContract = new ethers.Contract(HTS_USDC_EVM_ADDRESS, ERC20_ABI, provider);
    const bridgeContract = new ethers.Contract(ETABRIDGE_CONTRACT_ADDRESS, ETABRIDGE_ABI, provider);

    // Amount calculation
    const amountSmallestUnit = convertToSmallestUnit(AMOUNT, USDC_DECIMALS);
    console.log(`\n📊 Amount: ${AMOUNT} USDC = ${amountSmallestUnit.toString()} smallest units`);

    // ====================================================================
    // RUN HTS DIAGNOSTICS
    // ====================================================================

    const diagnosticsPassed = await runHtsDiagnostics(
      provider,
      wallet,
      bridgeContract,
      usdcContract,
    );

    if (!diagnosticsPassed) {
      throw new Error("Diagnostics failed. Please fix issues above before bridging.");
    }

    // ====================================================================
    // STEP 1: Ensure approval
    // ====================================================================

    console.log("\n🔐 Handling Token Approval");
    const currentAllowance = await usdcContract.allowance(
      wallet.address,
      ETABRIDGE_CONTRACT_ADDRESS,
    );

    if (currentAllowance < amountSmallestUnit) {
      console.log(`   Current allowance: ${formatAmount(currentAllowance, USDC_DECIMALS)} USDC`);
      console.log(`   Requesting approval...`);

      const usdcWithSigner = usdcContract.connect(wallet) as ethers.Contract;
      const approveTx = await usdcWithSigner.approve(
        ETABRIDGE_CONTRACT_ADDRESS,
        amountSmallestUnit,
      );

      console.log(`   📝 Tx: ${approveTx.hash}`);
      const approveReceipt = await approveTx.wait();
      console.log(`   ✅ Approved in block ${approveReceipt?.blockNumber}`);
    } else {
      console.log(
        `   ✅ Sufficient allowance: ${formatAmount(currentAllowance, USDC_DECIMALS)} USDC`,
      );
    }

    // ====================================================================
    // STEP 2: Generate LayerZero options
    // ====================================================================

    console.log("\n⚙️  Generating LayerZero V2 Options");
    const options = getLayerZeroOptions(50000); // 50k gas for lzReceive
    console.log(`   Options: ${options}`);
    console.log(`   Length: ${(options.length - 2) / 2} bytes`);

    // ====================================================================
    // STEP 3: Test quote() first
    // ====================================================================

    console.log("\n💵 Testing Quote (Bridge Fees)");
    console.log(
      `   Calling: quote("USDC", ${amountSmallestUnit}, ${receiverAddress}, ${POLYGON_CHAIN_ID}, options)`,
    );

    let quoteNativeFee: bigint;
    try {
      quoteNativeFee = await bridgeContract.quote(
        "USDC",
        amountSmallestUnit,
        receiverAddress,
        POLYGON_CHAIN_ID,
        options,
      );

      console.log(`   ✅ Quote successful!`);
      console.log(`   Native fee: ${quoteNativeFee.toString()} wei`);
      console.log(`   Native fee: ${ethers.formatEther(quoteNativeFee)} HBAR`);
    } catch (quoteError: any) {
      console.error(`   ❌ Quote failed!`);
      console.error(`   Error: ${quoteError.message}`);

      if (quoteError.data) {
        const { selector, reason } = decodeError(quoteError.data);
        console.error(`   Selector: ${selector}`);
        console.error(`   Reason: ${reason}`);
      }

      throw new Error(`Quote failed - bridge will not work. Fix: ${quoteError.message}`);
    }

    // ====================================================================
    // STEP 4: Simulate transaction
    // ====================================================================

    console.log("\n🔍 Simulating Transaction");
    try {
      const bridgeWithSigner = bridgeContract.connect(wallet) as ethers.Contract;
      const result = await bridgeWithSigner.bridgeTokens.staticCall(
        "USDC",
        amountSmallestUnit,
        receiverAddress,
        POLYGON_CHAIN_ID,
        options,
      );

      console.log(`   ✅ Simulation successful!`);
      console.log(`   GUID: ${result.guid}`);
      console.log(`   Nonce: ${result.nonce}`);
      console.log(`   Fee: ${result.fee.nativeFee.toString()} wei`);
    } catch (simError: any) {
      console.error(`   ❌ Simulation failed!`);
      console.error(`   Error: ${simError.message}`);

      if (simError.data) {
        const { selector, reason } = decodeError(simError.data);
        console.error(`   Selector: ${selector}`);
        console.error(`   Reason: ${reason}`);
      }

      throw new Error(`Simulation failed: ${simError.message}`);
    }

    // ====================================================================
    // STEP 5: Estimate gas
    // ====================================================================

    console.log("\n⛽ Estimating Gas");
    let gasLimit = 7_000_000;

    try {
      const bridgeWithSigner = bridgeContract.connect(wallet) as ethers.Contract;
      const estimatedGas = await bridgeWithSigner.bridgeTokens.estimateGas(
        "USDC",
        amountSmallestUnit,
        receiverAddress,
        POLYGON_CHAIN_ID,
        options,
      );

      const gasWithBuffer = estimatedGas + (estimatedGas * BigInt(20)) / BigInt(100);
      gasLimit = Number(gasWithBuffer > BigInt(7_000_000) ? BigInt(7_000_000) : gasWithBuffer);

      console.log(`   Estimated: ${estimatedGas.toString()}`);
      console.log(`   With 20% buffer: ${gasLimit}`);
    } catch (e: any) {
      console.log(`   ⚠️  Estimation failed: ${e.message}`);
      console.log(`   Using default: ${gasLimit}`);
    }

    // ====================================================================
    // STEP 6: EXECUTE BRIDGE
    // ====================================================================

    console.log("\n🚀 Executing Bridge Transaction");
    const bridgeWithSigner = bridgeContract.connect(wallet) as ethers.Contract;

    const txResponse = await bridgeWithSigner.bridgeTokens(
      "USDC",
      amountSmallestUnit,
      receiverAddress,
      POLYGON_CHAIN_ID,
      options,
      { gasLimit },
    );

    console.log(`   📝 Hash: ${txResponse.hash}`);
    console.log(`   ⏳ Waiting for confirmation...`);

    const receipt = await txResponse.wait();

    if (!receipt) {
      throw new Error("No receipt returned");
    }

    // ====================================================================
    // SUCCESS
    // ====================================================================

    console.log("\n" + "=".repeat(70));
    console.log("✅ BRIDGE SUCCESSFUL!");
    console.log(`   Hash: ${receipt.hash}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`\n   View: https://hashscan.io/mainnet/transaction/${receipt.hash}`);
    console.log("=".repeat(70));
  } catch (error: any) {
    console.error("\n" + "=".repeat(70));
    console.error("❌ BRIDGE FAILED");
    console.error(`   Error: ${error.message}`);

    if (error.data) {
      const { selector, reason } = decodeError(error.data);
      console.error(`   Selector: ${selector}`);
      console.error(`   Reason: ${reason}`);
    }

    console.error("\n💡 Troubleshooting:");
    console.error("   1. Verify HTS USDC EVM wrapper at 0x000000...6f89a exists");
    console.error("   2. Confirm EtaBridge has USDC registered in supportedTokens");
    console.error("   3. Check Polygon chain ID is 109 (not 30106)");
    console.error("   4. Verify you have sufficient HTS USDC balance");
    console.error("   5. Run diagnostics: npm run diagnostics");
    console.error("=".repeat(70) + "\n");

    process.exit(1);
  }
}

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
  bridgeHtsUsdc()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { bridgeHtsUsdc };
