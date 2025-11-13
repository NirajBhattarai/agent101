/**
 * Utility functions for Liquidity Requirements Form
 */

import { filterStrings, getTokenPairError, type FormErrors } from "../shared";

/**
 * Filter pairs based on search query with optional regex support
 */
export function filterPairs(
  pairs: string[],
  searchQuery: string,
  useRegex: boolean = false,
): string[] {
  return filterStrings(pairs, searchQuery, useRegex);
}

/**
 * Validate liquidity form
 */
export function validateLiquidityForm(formData: { tokenPair: string }): FormErrors {
  const errors: FormErrors = {};

  const pairError = getTokenPairError(formData.tokenPair);
  if (pairError) {
    errors.tokenPair = pairError;
  }

  return errors;
}
