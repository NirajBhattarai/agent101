#!/usr/bin/env tsx

/**
 * Minimal MCP script to swap HBAR to token with verification
 *
 * This script contains the complete swap function and all dependencies
 * copied from the MCP server SDK for standalone execution.
 *
 * Usage:
 *   cd frontend && TO_TOKEN_ID=0.0.12345 HBAR_AMOUNT=10.5 tsx scripts/swapHbarToToken.ts
 *
 * Example:
 *   TO_TOKEN_ID=0.0.12345 HBAR_AMOUNT=1.0 tsx scripts/swapHbarToToken.ts
 *
 * Environment Variables:
 *   HBAR_AMOUNT - Amount of HBAR to swap (e.g., "10.5")
 *   TO_TOKEN_ID - Hedera token ID to receive (e.g., "0.0.12345")
 *   SLIPPAGE_TOLERANCE - Optional, default 0.5 (percentage)
 *   DEADLINE_SECONDS - Optional, default 300 (seconds)
 *   HEDERA_ACCOUNT_ID - Hedera account ID (e.g., "0.0.12345")
 *   HEDERA_PRIVATE_KEY - Hedera private key
 *   HEDERA_NETWORK - Network: testnet, mainnet, or previewnet (default: mainnet)
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

// Load environment variables
dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const HEDERA_ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID;
const HEDERA_PRIVATE_KEY = process.env.HEDERA_PRIVATE_KEY;
const HEDERA_NETWORK = process.env.HEDERA_NETWORK || "mainnet";

// SaucerSwap Configuration - MAINNET
const JSON_RPC_URL = "https://mainnet.hashio.io/api";
// Mainnet V2 Router and Quoter addresses
// Router EVM: 0x00000000000000000000000000000000006715e6 = Hedera ID: 0.0.671506
const V2_QUOTER_ADDRESS = "0.0.1390002"; // TODO: Verify mainnet quoter address
const V2_SWAP_ROUTER_ADDRESS = "0.0.671506"; // Mainnet router (from EVM: 0x00000000000000000000000000000000006715e6)
// WHBAR EVM: 0x0000000000000000000000000000000000163b5a = Hedera ID: 0.0.1456986
const WHBAR_TOKEN_ID_MAINNET = "0.0.1456986"; // Mainnet WHBAR token ID (converted from EVM address)
const HBAR_DECIMALS = 8;

const ROUTER_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
  "function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)",
  "function refundETH() external payable",
  "function multicall(bytes[] calldata data) external payable returns (bytes[] memory results)",
  "function unwrapWHBAR(uint256 amountMinimum, address recipient) external payable",
];

const abiInterfaces = new ethers.Interface(ROUTER_ABI);
const provider = new ethers.JsonRpcProvider(JSON_RPC_URL);

// Network-aware API URL
// Note: Mainnet API may require authentication - contact support@saucerswap.finance
// For now, using testnet API pattern - update with mainnet API key if needed
const SAUCERSWAP_POOLS_API_URL =
  HEDERA_NETWORK === "mainnet"
    ? "https://api.saucerswap.finance/v2/pools/" // Mainnet API (may require API key)
    : "https://test-api.saucerswap.finance/v2/pools/";

// ============================================================================
// INTERFACES
// ============================================================================

interface SwapResult {
  transactionId: string;
  tokenInId: string;
  amountInOriginal: string;
  amountInSmallestUnit: string;
  tokenOutId: string;
  amountOutSmallestUnit: string;
  pathUsed: {
    tokens: string[];
    fees: number[];
  };
  details?: {
    quotedAmountOutSmallestUnit?: string;
    amountOutMinimumSmallestUnit?: string;
    consensusTimestamp?: string;
  };
  error?: string;
}

interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
  priceUsd?: number;
}

interface SimplifiedPoolInfo {
  id: number;
  contractId: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  fee: number;
}

interface SwapPath {
  pathTokens: string[];
  pathFees: number[];
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
}

interface ExecuteSwapParamsInternal {
  client: Client;
  pathTokens: string[];
  pathFees: number[];
  amountInSmallestUnit: string;
  tokenOutId: string;
  slippageTolerancePercent: number;
  isHbarIn: boolean;
  needsUnwrap: boolean;
  deadlineTimestamp: number;
  operatorAccountId: AccountId;
  operatorEvmAddress: string;
  routerAddress: string;
  quoterAddress: string;
}

interface SwapExecutionResultInternal {
  amountOutSmallestUnit: string;
  quotedAmountOutSmallestUnit: string;
  transactionId: string;
  transactionRecord?: TransactionRecord;
}

interface ApproveTokenParams {
  client: Client;
  operatorAccountId: AccountId;
  tokenToApproveId: string;
  amountInSmallestUnit: string;
  spenderContractId: string;
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

function logError(message: string, data?: any): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: "ERROR",
    message,
    data,
  };
  console.error(JSON.stringify(logEntry, null, 2));
}

function logInfo(message: string, data?: any): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: "INFO",
    message,
    data,
  };
  console.error(JSON.stringify(logEntry, null, 2));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function feeToHexString(fee: number): string {
  const feeBigNumber = BigInt(fee);
  return ethers.toBeHex(feeBigNumber, 3).slice(2);
}

function createPathHexData(pathTokens: string[], pathFees: number[]): string {
  let pathHexData = "";
  for (let i = 0; i < pathTokens.length; i++) {
    const token = TokenId.fromString(pathTokens[i]);
    pathHexData += token.toSolidityAddress();
    if (i < pathFees.length) {
      const feeHexStr = feeToHexString(pathFees[i]);
      pathHexData += feeHexStr;
    }
  }
  return pathHexData;
}

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

function convertAmountToSmallestUnit(amountStr: string, decimals: number): string {
  if (decimals < 0) throw new Error("Decimals cannot be negative.");
  try {
    if (decimals === HBAR_DECIMALS && amountStr.toLowerCase().includes("hbar")) {
      return Hbar.fromString(amountStr).toTinybars().toString();
    }
    return ethers.parseUnits(amountStr, decimals).toString();
  } catch (error) {
    console.error(
      `Error converting amount ${amountStr} with ${decimals} decimals to smallest unit:`,
      error,
    );
    throw new Error(`Invalid amount format or decimals for ${amountStr}.`);
  }
}

function calculateAmountOutMinimum(
  quotedAmountOutStr: string,
  slippageTolerancePercent: number,
): string {
  if (slippageTolerancePercent < 0 || slippageTolerancePercent > 100) {
    throw new Error("Slippage tolerance percent must be between 0 and 100.");
  }
  const quotedAmountOut = BigInt(quotedAmountOutStr);
  const slippageFactor = BigInt(Math.floor(slippageTolerancePercent * 100));
  const hundredTimesHundred = BigInt(10000);
  const amountOutMinimum =
    quotedAmountOut - (quotedAmountOut * slippageFactor) / hundredTimesHundred;
  return amountOutMinimum.toString();
}

function getCurrentUnixTimestampInSeconds(): number {
  return Math.floor(Date.now() / 1000);
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
    // Try to populate EVM address, but if it fails, set operator with account ID directly
    const accountIdWithEvm = await accountId
      .populateAccountEvmAddress(client)
      .catch(() => accountId);
    client.setOperator(accountIdWithEvm, privateKey);
  } catch (error) {
    // Fallback: set operator without EVM address
    client.setOperator(accountId, privateKey);
    logInfo(`Warning: Could not populate EVM address, using account ID directly`);
  }

  logInfo(
    `Hedera client initialized for network: ${HEDERA_NETWORK}, Account ID: ${HEDERA_ACCOUNT_ID}`,
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
  if (!client.operatorPublicKey) {
    throw new Error("Operator public key is not configured in the client.");
  }

  const rawEvmAddress = client.operatorAccountId.evmAddress;
  if (!rawEvmAddress) {
    logError("[core] Operator EVM address is not available.", {
      accountId: client.operatorAccountId.toString(),
    });
    throw new Error(
      "Operator EVM address not found on client.operatorAccountId. This is required for swaps.",
    );
  }
  const operatorEvmAddress =
    typeof rawEvmAddress === "string" ? rawEvmAddress : rawEvmAddress.toString();

  return { client, operatorAccountId: client.operatorAccountId, operatorEvmAddress };
}

// ============================================================================
// POOL FUNCTIONS
// ============================================================================

let poolsCache: SimplifiedPoolInfo[] | null = null;
let lastFetchTimestamp: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

async function fetchRawPoolsData(): Promise<any[]> {
  try {
    const response = await fetch(SAUCERSWAP_POOLS_API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Failed to fetch pools data: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
      );
    }
    return (await response.json()) as any[];
  } catch (error) {
    console.error("Error fetching raw pools data:", error);
    throw error;
  }
}

function transformPoolData(rawPool: any): SimplifiedPoolInfo | null {
  if (!rawPool || !rawPool.tokenA || !rawPool.tokenB) {
    console.warn("Skipping pool with missing tokenA or tokenB data:", rawPool);
    return null;
  }
  try {
    const tokenA: TokenInfo = {
      id: rawPool.tokenA.id,
      symbol: rawPool.tokenA.symbol,
      name: rawPool.tokenA.name,
      decimals: rawPool.tokenA.decimals,
      icon: rawPool.tokenA.icon,
      priceUsd: rawPool.tokenA.priceUsd,
    };
    const tokenB: TokenInfo = {
      id: rawPool.tokenB.id,
      symbol: rawPool.tokenB.symbol,
      name: rawPool.tokenB.name,
      decimals: rawPool.tokenB.decimals,
      icon: rawPool.tokenB.icon,
      priceUsd: rawPool.tokenB.priceUsd,
    };

    return {
      id: rawPool.id,
      contractId: rawPool.contractId,
      tokenA,
      tokenB,
      fee: rawPool.fee,
    };
  } catch (error) {
    console.error("Error transforming pool data for pool:", rawPool.id, error);
    return null;
  }
}

async function getAllSimplifiedPools(forceRefresh: boolean = false): Promise<SimplifiedPoolInfo[]> {
  const now = Date.now();
  if (!forceRefresh && poolsCache && now - lastFetchTimestamp < CACHE_DURATION_MS) {
    return poolsCache;
  }

  const rawPools = await fetchRawPoolsData();
  const simplifiedPools = rawPools
    .map(transformPoolData)
    .filter((pool) => pool !== null) as SimplifiedPoolInfo[];

  poolsCache = simplifiedPools;
  lastFetchTimestamp = now;

  return simplifiedPools;
}

async function getTokenInfoById(
  tokenId: string,
  poolsToSearch?: SimplifiedPoolInfo[],
): Promise<TokenInfo | null> {
  const WHBAR_TOKEN_ID = HEDERA_NETWORK === "mainnet" ? WHBAR_TOKEN_ID_MAINNET : "0.0.15058"; // testnet fallback
  if (tokenId.toLowerCase() === "hbar" || tokenId === WHBAR_TOKEN_ID) {
    const whbarPool = (poolsToSearch || (await getAllSimplifiedPools())).find(
      (p) => p.tokenA.id === WHBAR_TOKEN_ID || p.tokenB.id === WHBAR_TOKEN_ID,
    );
    if (whbarPool) {
      const whbarInfo =
        whbarPool.tokenA.id === WHBAR_TOKEN_ID ? whbarPool.tokenA : whbarPool.tokenB;
      return { ...whbarInfo, symbol: "HBAR", id: WHBAR_TOKEN_ID };
    }
    return { id: WHBAR_TOKEN_ID, symbol: "HBAR", name: "Wrapped HBAR", decimals: 8 };
  }

  const pools = poolsToSearch || (await getAllSimplifiedPools());
  for (const pool of pools) {
    if (pool.tokenA.id === tokenId) return pool.tokenA;
    if (pool.tokenB.id === tokenId) return pool.tokenB;
  }
  console.warn(`Token info for ${tokenId} not found in any pool.`);
  return null;
}

async function findDirectPath(
  tokenInId: string,
  tokenOutId: string,
  poolsToSearch?: SimplifiedPoolInfo[],
): Promise<SwapPath | null> {
  const pools = poolsToSearch || (await getAllSimplifiedPools());
  const WHBAR_TOKEN_ID = HEDERA_NETWORK === "mainnet" ? WHBAR_TOKEN_ID_MAINNET : "0.0.15058"; // testnet fallback

  const effectiveTokenInId = tokenInId.toLowerCase() === "hbar" ? WHBAR_TOKEN_ID : tokenInId;
  const effectiveTokenOutId = tokenOutId.toLowerCase() === "hbar" ? WHBAR_TOKEN_ID : tokenOutId;

  if (effectiveTokenInId === effectiveTokenOutId) {
    console.warn("Input and output tokens are the same for pathfinding after HBAR conversion.");
    return null;
  }

  for (const pool of pools) {
    const isMatchAtoB =
      pool.tokenA.id === effectiveTokenInId && pool.tokenB.id === effectiveTokenOutId;
    const isMatchBtoA =
      pool.tokenB.id === effectiveTokenInId && pool.tokenA.id === effectiveTokenOutId;

    if (isMatchAtoB || isMatchBtoA) {
      return {
        pathTokens: isMatchAtoB
          ? [pool.tokenA.id, pool.tokenB.id]
          : [pool.tokenB.id, pool.tokenA.id],
        pathFees: [pool.fee],
        tokenIn: isMatchAtoB ? pool.tokenA : pool.tokenB,
        tokenOut: isMatchAtoB ? pool.tokenB : pool.tokenA,
      };
    }
  }
  console.warn(`No direct path found between ${tokenInId} and ${tokenOutId}`);
  return null;
}

// ============================================================================
// APPROVAL FUNCTIONS
// ============================================================================

async function approveTokenAllowance(params: ApproveTokenParams): Promise<void> {
  const { client, operatorAccountId, tokenToApproveId, amountInSmallestUnit, spenderContractId } =
    params;

  logInfo("[Approval] Starting token allowance approval process", {
    tokenToApproveId,
    amountInSmallestUnit,
    spenderContractId,
    operatorAccountId: operatorAccountId.toString(),
  });

  if (tokenToApproveId.toLowerCase() === "hbar" || tokenToApproveId === "0.0.0") {
    logError("[Approval] Attempted to call approveTokenAllowance for HBAR.", params);
    throw new Error("approveTokenAllowance is for HTS fungible tokens, not HBAR.");
  }

  try {
    const approveTx = new AccountAllowanceApproveTransaction();
    let approvalAmountForSdk: Long | number;

    const amountBigInt = BigInt(amountInSmallestUnit);

    if (amountInSmallestUnit === "-1") {
      approvalAmountForSdk = Long.MAX_UNSIGNED_VALUE;
      logInfo(
        `[Approval] Approving MAX (Long.MAX_UNSIGNED_VALUE) allowance for token ${tokenToApproveId} to spender ${spenderContractId}`,
      );
    } else {
      if (amountBigInt <= 0) {
        logError("[Approval] Approval amount must be positive.", { amountInSmallestUnit });
        throw new Error("Token approval amount must be a positive number.");
      }
      if (amountBigInt > BigInt(Long.MAX_UNSIGNED_VALUE.toString())) {
        logError("[Approval] Requested approval amount exceeds Long.MAX_UNSIGNED_VALUE.", {
          amountStr: amountInSmallestUnit,
        });
        throw new Error(
          `Requested approval amount ${amountInSmallestUnit} exceeds the representable range.`,
        );
      }
      approvalAmountForSdk = Long.fromString(amountBigInt.toString());
      logInfo(
        `[Approval] Approving allowance of ${amountInSmallestUnit} for token ${tokenToApproveId} to spender ${spenderContractId}`,
      );
    }

    approveTx.approveTokenAllowance(
      tokenToApproveId,
      operatorAccountId,
      AccountId.fromString(spenderContractId),
      approvalAmountForSdk,
    );

    const signedTx = await approveTx.freezeWith(client).signWithOperator(client);
    const approveTxResponse = await signedTx.execute(client);

    logInfo("[Approval] Approval transaction submitted:", {
      transactionId: approveTxResponse.transactionId.toString(),
    });

    const receipt = await approveTxResponse.getReceipt(client);
    logInfo("[Approval] Approval transaction receipt status:", {
      status: receipt.status.toString(),
    });

    if (receipt.status.toString().toUpperCase() !== "SUCCESS") {
      throw new Error(`Token allowance approval failed with status: ${receipt.status.toString()}`);
    }
  } catch (error: any) {
    logError("[Approval] Error during token allowance approval:", {
      errorMessage: error.message,
      tokenToApproveId,
      amountInSmallestUnit,
      spenderContractId,
      stack: error.stack,
    });
    throw error;
  }
}

// ============================================================================
// SWAP EXECUTION
// ============================================================================

async function _executeSwapInternal(
  params: ExecuteSwapParamsInternal,
): Promise<SwapExecutionResultInternal> {
  const {
    client,
    pathTokens,
    pathFees,
    amountInSmallestUnit,
    tokenOutId,
    slippageTolerancePercent,
    isHbarIn,
    needsUnwrap,
    deadlineTimestamp,
    operatorAccountId,
    operatorEvmAddress,
    routerAddress,
    quoterAddress,
  } = params;

  logInfo("[_executeSwapInternal] Starting internal swap execution", params);

  try {
    const pathHexData = createPathHexData(pathTokens, pathFees);
    const encodedPathBytes = hexStringToUint8Array(pathHexData);
    const pathHexForExactInput = "0x" + pathHexData;

    const quoteExactInputFcnData = abiInterfaces.encodeFunctionData("quoteExactInput", [
      encodedPathBytes,
      amountInSmallestUnit,
    ]);

    logInfo("[_executeSwapInternal] Executing quoteExactInput via provider.call", {
      quoterAddress,
      data: quoteExactInputFcnData,
    });
    const quoteResult = await provider.call({
      to: `0x${TokenId.fromString(quoterAddress).toSolidityAddress()}`,
      data: quoteExactInputFcnData,
    });
    const decodedQuote = abiInterfaces.decodeFunctionResult("quoteExactInput", quoteResult);
    const quotedAmountOutFromContract = decodedQuote.amountOut.toString();
    logInfo("[_executeSwapInternal] Decoded quoteExactInput result", {
      quotedAmountOutFromContract,
    });

    const amountOutMinimumSmallestUnit = calculateAmountOutMinimum(
      quotedAmountOutFromContract,
      slippageTolerancePercent,
    );
    logInfo("[_executeSwapInternal] Calculated amountOutMinimumSmallestUnit", {
      amountOutMinimumSmallestUnit,
      slippageTolerancePercent,
    });

    const exactInputRecipient = needsUnwrap
      ? `0x${TokenId.fromString(routerAddress).toSolidityAddress()}`
      : operatorEvmAddress;
    logInfo("[_executeSwapInternal] Determined exactInput recipient", {
      exactInputRecipient,
      needsUnwrap,
    });

    const exactInputParams = {
      path: pathHexForExactInput,
      recipient: exactInputRecipient,
      deadline: deadlineTimestamp,
      amountIn: amountInSmallestUnit,
      amountOutMinimum: amountOutMinimumSmallestUnit,
    };
    const exactInputEncoded = abiInterfaces.encodeFunctionData("exactInput", [exactInputParams]);
    logInfo("[_executeSwapInternal] Prepared exactInput call data", { params: exactInputParams });

    let secondMulticallData: string;
    if (needsUnwrap) {
      secondMulticallData = abiInterfaces.encodeFunctionData("unwrapWHBAR", [
        0,
        operatorEvmAddress,
      ]);
      logInfo("[_executeSwapInternal] Prepared unwrapWHBAR call data", {
        recipient: operatorEvmAddress,
      });
    } else {
      secondMulticallData = abiInterfaces.encodeFunctionData("refundETH");
      logInfo("[_executeSwapInternal] Prepared refundETH call data");
    }

    const multicallParams = [exactInputEncoded, secondMulticallData];
    const multicallTxData = abiInterfaces.encodeFunctionData("multicall", [multicallParams]);
    const multicallTxDataAsUint8Array = hexStringToUint8Array(multicallTxData.slice(2));

    logInfo("[_executeSwapInternal] Preparing ContractExecuteTransaction for multicall");
    const swapTransaction = new ContractExecuteTransaction()
      .setContractId(routerAddress)
      .setGas(2_000_000)
      .setFunctionParameters(multicallTxDataAsUint8Array);

    if (isHbarIn) {
      swapTransaction.setPayableAmount(Hbar.fromTinybars(amountInSmallestUnit));
      logInfo("[_executeSwapInternal] Set payable HBAR amount", {
        amountInTinybars: amountInSmallestUnit,
      });
    }

    const signedTx = await swapTransaction.freezeWith(client).signWithOperator(client);
    const txResponse = await signedTx.execute(client);
    logInfo("[_executeSwapInternal] Swap transaction submitted", {
      transactionId: txResponse.transactionId.toString(),
    });

    const record = await txResponse.getRecord(client);
    logInfo("[_executeSwapInternal] Swap transaction record obtained", {
      status: record.receipt.status.toString(),
    });

    if (record.receipt.status.toString().toUpperCase() !== "SUCCESS") {
      throw new Error(
        `Swap transaction failed with status: ${record.receipt.status.toString()} - ${record.contractFunctionResult?.errorMessage}`,
      );
    }

    const multicallResults = abiInterfaces.decodeFunctionResult(
      "multicall",
      record.contractFunctionResult!.bytes,
    );
    const exactInputResultBytes = multicallResults.results[0];
    const decodedExactInputResult = abiInterfaces.decodeFunctionResult(
      "exactInput",
      exactInputResultBytes,
    );
    const amountOutFromTx = decodedExactInputResult.amountOut.toString();

    logInfo("[_executeSwapInternal] Successfully executed swap and parsed amountOut", {
      amountOutFromTx,
    });

    return {
      amountOutSmallestUnit: amountOutFromTx,
      quotedAmountOutSmallestUnit: quotedAmountOutFromContract,
      transactionId: txResponse.transactionId.toString(),
      transactionRecord: record,
    };
  } catch (error: any) {
    const safeErrorMessage =
      error instanceof Error && error.message ? error.message : String(error);
    const safeErrorStack =
      error instanceof Error && error.stack ? error.stack : "Stack not available";

    logError("[_executeSwapInternal] Error during internal swap execution:", {
      errorMessage: safeErrorMessage,
      pathTokens: params.pathTokens,
      amountInSmallestUnit: params.amountInSmallestUnit,
      stack: safeErrorStack,
      errorDetails: String(error),
    });
    throw error;
  }
}

// ============================================================================
// MAIN SWAP FUNCTION
// ============================================================================

async function swapHbarForToken(
  hbarAmountStr: string,
  toTokenIdStr: string,
  slippageTolerancePercent: number = 0.5,
  deadlineSeconds: number = 300,
): Promise<SwapResult> {
  logInfo("[swapHbarForToken] Initiating HBAR to Token swap", {
    hbarAmountStr,
    toTokenIdStr,
    slippageTolerancePercent,
    deadlineSeconds,
  });
  try {
    const { client, operatorAccountId, operatorEvmAddress } = await getClientAndOperatorDetails();

    const WHBAR_TOKEN_ID = HEDERA_NETWORK === "mainnet" ? WHBAR_TOKEN_ID_MAINNET : "0.0.15058"; // testnet fallback
    const tokenInId = WHBAR_TOKEN_ID;
    const amountInOriginal = hbarAmountStr;
    const amountInSmallestUnit = convertAmountToSmallestUnit(hbarAmountStr, HBAR_DECIMALS);

    const allPools = await getAllSimplifiedPools();
    const tokenOutInfo = await getTokenInfoById(toTokenIdStr, allPools);
    if (!tokenOutInfo) {
      throw new Error(`Output token ${toTokenIdStr} not found or has no decimal info.`);
    }

    const path = await findDirectPath(tokenInId, toTokenIdStr, allPools);
    if (!path) {
      throw new Error(
        `No direct liquidity path found from HBAR (WHBAR ${tokenInId}) to ${toTokenIdStr}.`,
      );
    }

    const deadlineTimestamp = getCurrentUnixTimestampInSeconds() + deadlineSeconds;

    const internalParams: ExecuteSwapParamsInternal = {
      client,
      pathTokens: path.pathTokens,
      pathFees: path.pathFees,
      amountInSmallestUnit,
      tokenOutId: toTokenIdStr,
      slippageTolerancePercent,
      isHbarIn: true,
      needsUnwrap: false,
      deadlineTimestamp,
      operatorAccountId,
      operatorEvmAddress,
      routerAddress: V2_SWAP_ROUTER_ADDRESS,
      quoterAddress: V2_QUOTER_ADDRESS,
    };

    const result = await _executeSwapInternal(internalParams);

    const amountOutMinimumSmallestUnitForDetails = calculateAmountOutMinimum(
      result.quotedAmountOutSmallestUnit,
      slippageTolerancePercent,
    );

    return {
      transactionId: result.transactionId,
      tokenInId: "HBAR",
      amountInOriginal,
      amountInSmallestUnit,
      tokenOutId: toTokenIdStr,
      amountOutSmallestUnit: result.amountOutSmallestUnit,
      pathUsed: { tokens: path.pathTokens, fees: path.pathFees },
      details: {
        quotedAmountOutSmallestUnit: result.quotedAmountOutSmallestUnit,
        amountOutMinimumSmallestUnit: amountOutMinimumSmallestUnitForDetails,
        consensusTimestamp: result.transactionRecord?.consensusTimestamp?.toDate().toISOString(),
      },
    };
  } catch (error: any) {
    const errorMessageString =
      error instanceof Error && error.message ? error.message : String(error);
    const errorStackString =
      error instanceof Error && error.stack ? error.stack : "Stack not available";

    logError("[swapHbarForToken] Error", {
      error: errorMessageString,
      stack: errorStackString,
      hbarAmountStr,
      toTokenIdStr,
    });

    return {
      transactionId: "",
      tokenInId: "HBAR",
      amountInOriginal: hbarAmountStr,
      amountInSmallestUnit: "0",
      tokenOutId: toTokenIdStr,
      amountOutSmallestUnit: "0",
      pathUsed: { tokens: [], fees: [] },
      error: errorMessageString || "Unknown error during HBAR to Token swap.",
    };
  }
}

// ============================================================================
// VERIFICATION & MAIN SCRIPT
// ============================================================================

function verifySwapResult(result: SwapResult): boolean {
  if (!result.transactionId || result.transactionId.trim() === "") {
    console.error("❌ Verification failed: Missing transaction ID");
    return false;
  }

  if (result.error) {
    console.error(`❌ Verification failed: Swap error - ${result.error}`);
    return false;
  }

  if (!result.tokenInId || !result.tokenOutId) {
    console.error("❌ Verification failed: Missing token IDs");
    return false;
  }

  const amountOut = BigInt(result.amountOutSmallestUnit || "0");
  if (amountOut <= BigInt(0)) {
    console.error("❌ Verification failed: Amount out is zero or negative");
    return false;
  }

  if (!result.pathUsed?.tokens || result.pathUsed.tokens.length === 0) {
    console.error("❌ Verification failed: Invalid swap path");
    return false;
  }

  console.log("✅ All verifications passed");
  return true;
}

async function main() {
  const hbarAmount = process.env.HBAR_AMOUNT || "1.0";
  const toTokenId = process.env.TO_TOKEN_ID;
  const slippageTolerance = parseFloat(process.env.SLIPPAGE_TOLERANCE || "0.5");
  const deadlineSeconds = parseInt(process.env.DEADLINE_SECONDS || "300", 10);

  if (!toTokenId) {
    console.error("❌ Error: TO_TOKEN_ID environment variable is required");
    console.error("Usage: TO_TOKEN_ID=0.0.12345 HBAR_AMOUNT=10.5 npm run mcp:swap");
    process.exit(1);
  }

  const tokenIdRegex = /^\d+\.\d+\.\d+$/;
  if (!tokenIdRegex.test(toTokenId)) {
    console.error(`❌ Error: Invalid token ID format: ${toTokenId}`);
    console.error("Expected format: shard.realm.num (e.g., 0.0.12345)");
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

  console.log("🔄 Starting HBAR to Token swap...");
  console.log(`   HBAR Amount: ${hbarAmount}`);
  console.log(`   To Token ID: ${toTokenId}`);
  console.log(`   Slippage: ${slippageTolerance}%`);
  console.log(`   Deadline: ${deadlineSeconds}s`);

  try {
    console.log("🔄 Executing swap...");
    const swapResult: SwapResult = await swapHbarForToken(
      hbarAmount,
      toTokenId,
      slippageTolerance,
      deadlineSeconds,
    );

    console.log("\n📊 Swap Result:");
    console.log(`   Transaction ID: ${swapResult.transactionId}`);
    console.log(`   Token In: ${swapResult.tokenInId}`);
    console.log(`   Amount In: ${swapResult.amountInOriginal} ${swapResult.tokenInId}`);
    console.log(`   Token Out: ${swapResult.tokenOutId}`);
    console.log(`   Amount Out: ${swapResult.amountOutSmallestUnit} (smallest unit)`);
    console.log(`   Path: ${swapResult.pathUsed.tokens.join(" -> ")}`);

    if (swapResult.details?.quotedAmountOutSmallestUnit) {
      console.log(`   Quoted Amount Out: ${swapResult.details.quotedAmountOutSmallestUnit}`);
    }

    console.log("\n🔍 Verifying swap result...");
    const isValid = verifySwapResult(swapResult);

    if (isValid) {
      console.log("\n✅ Swap completed successfully!");
      if (swapResult.details?.consensusTimestamp) {
        console.log(`   Consensus Timestamp: ${swapResult.details.consensusTimestamp}`);
      }
      console.log(`\n📝 Transaction ID: ${swapResult.transactionId}`);
    } else {
      console.log("\n❌ Swap verification failed!");
      process.exit(1);
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
