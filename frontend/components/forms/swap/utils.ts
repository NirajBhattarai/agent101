/**
 * Utility functions for Swap Requirements Form
 *
 * Validation and helper functions for swap form
 */

import { Token, HEDERA_TOKENS, POLYGON_TOKENS } from "@/lib/constants/tokens";
import {
  getAddressError,
  getAmountError,
  getSlippageError,
  filterTokens as filterTokensShared,
  type FormErrors,
} from "../shared";

// Re-export FormErrors for convenience
export type { FormErrors };

export interface FormData {
  chain: string;
  tokenInSymbol: string;
  tokenOutSymbol: string;
  amountIn: string;
  slippageTolerance: string;
  accountAddress: string;
}

/**
 * Check if token is available on chain
 */
export function isTokenAvailableOnChain(tokenSymbol: string, chain: string): boolean {
  const available = chain === "hedera" ? HEDERA_TOKENS : POLYGON_TOKENS;
  return available.some((t) => t.symbol === tokenSymbol);
}

/**
 * Get available tokens for chain
 */
export function getAvailableTokensForChain(chain: string): Token[] {
  if (chain === "hedera") return HEDERA_TOKENS;
  if (chain === "polygon") return POLYGON_TOKENS;
  return [...HEDERA_TOKENS, ...POLYGON_TOKENS];
}

/**
 * Validate swap form
 */
export function validateSwapForm(formData: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!formData.chain) {
    errors.chain = "Please select a blockchain";
  }

  const addressError = getAddressError(formData.accountAddress);
  if (addressError) {
    errors.accountAddress = addressError;
  }

  if (!formData.tokenInSymbol) {
    errors.tokenInSymbol = "Please select a token to swap from";
  } else if (formData.chain && !isTokenAvailableOnChain(formData.tokenInSymbol, formData.chain)) {
    errors.tokenInSymbol = `${formData.tokenInSymbol} is not available on ${formData.chain}`;
  }

  if (!formData.tokenOutSymbol) {
    errors.tokenOutSymbol = "Please select a token to swap to";
  } else if (formData.chain && !isTokenAvailableOnChain(formData.tokenOutSymbol, formData.chain)) {
    errors.tokenOutSymbol = `${formData.tokenOutSymbol} is not available on ${formData.chain}`;
  }

  if (
    formData.tokenInSymbol &&
    formData.tokenOutSymbol &&
    formData.tokenInSymbol === formData.tokenOutSymbol
  ) {
    errors.tokenOutSymbol = "Token out must be different from token in";
  }

  const amountError = getAmountError(formData.amountIn, "amount to swap");
  if (amountError) {
    errors.amountIn = amountError;
  }

  const slippageError = getSlippageError(formData.slippageTolerance);
  if (slippageError) {
    errors.slippageTolerance = slippageError;
  }

  return errors;
}

/**
 * Filter tokens based on search query
 */
export function filterTokens(tokens: Token[], searchQuery: string): Token[] {
  return filterTokensShared(tokens, searchQuery, false, false); // no regex, no address
}

/**
 * Get default tokens for chain
 * Re-exported from centralized defaults
 */
export { getDefaultTokensForChain } from "@/lib/constants/defaults";

/**
 * Check if token is incompatible with chain
 */
export function isTokenIncompatibleWithChain(tokenSymbol: string, chain: string): boolean {
  if (chain === "hedera") {
    return tokenSymbol === "MATIC" || tokenSymbol === "WMATIC";
  } else if (chain === "polygon") {
    return tokenSymbol === "HBAR" || tokenSymbol === "WHBAR";
  }
  return false;
}
