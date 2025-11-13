/**
 * Utility functions for Bridge Requirements Form
 */

import { type Token as BridgeableToken } from "@/lib/constants/tokens";
import {
  filterTokens as filterTokensShared,
  getAddressError,
  getAmountError,
  getDifferentChainsError,
  type FormErrors,
} from "../shared";

/**
 * Filter tokens based on search query with optional regex support
 */
export function filterTokens(
  tokens: BridgeableToken[],
  searchQuery: string,
  useRegex: boolean = false,
): BridgeableToken[] {
  return filterTokensShared(tokens, searchQuery, useRegex, false); // includeAddress = false
}

/**
 * Validate bridge form
 */
export function validateBridgeForm(formData: {
  accountAddress: string;
  sourceChain: string;
  destinationChain: string;
  amount: string;
}): FormErrors {
  const errors: FormErrors = {};

  const addressError = getAddressError(formData.accountAddress);
  if (addressError) {
    errors.accountAddress = addressError;
  }

  const chainsError = getDifferentChainsError(formData.sourceChain, formData.destinationChain);
  if (chainsError) {
    errors.destinationChain = chainsError;
  }

  const amountError = getAmountError(formData.amount, "amount to bridge");
  if (amountError) {
    errors.amount = amountError;
  }

  return errors;
}
