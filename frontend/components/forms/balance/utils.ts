/**
 * Utility functions for Balance Requirements Form
 */

import { type Token } from "@/lib/constants/tokens";
import { filterTokens as filterTokensShared, getAddressError, type FormErrors } from "../shared";

/**
 * Filter tokens based on search query with optional regex support
 */
export function filterTokens(
  tokens: Token[],
  searchQuery: string,
  useRegex: boolean = false,
): Token[] {
  return filterTokensShared(tokens, searchQuery, useRegex, true); // includeAddress = true
}

/**
 * Validate balance form
 */
export function validateBalanceForm(formData: { accountAddress: string }): FormErrors {
  const errors: FormErrors = {};

  const addressError = getAddressError(formData.accountAddress);
  if (addressError) {
    errors.accountAddress = addressError;
  }

  return errors;
}
