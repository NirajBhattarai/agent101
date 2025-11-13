/**
 * Common validation functions for all forms
 */

/**
 * Validate address format (Hedera or EVM)
 * @param address - Address to validate
 * @returns true if valid, false otherwise
 */
export function validateAddress(address: string): boolean {
  if (!address || !address.trim()) return false;

  const hederaPattern = /^0\.0\.\d+$/;
  const evmPattern = /^0x[a-fA-F0-9]{40}$/;
  return hederaPattern.test(address.trim()) || evmPattern.test(address.trim());
}

/**
 * Get address validation error message
 * @param address - Address to validate
 * @returns Error message if invalid, empty string if valid
 */
export function getAddressError(address: string): string {
  if (!address.trim()) {
    return "Please enter an account address";
  }
  if (!validateAddress(address)) {
    return "Invalid address format. Use Hedera format (0.0.123456) or EVM format (0x...)";
  }
  return "";
}

/**
 * Validate amount (must be a positive number)
 * @param amount - Amount string to validate
 * @returns true if valid, false otherwise
 */
export function validateAmount(amount: string): boolean {
  if (!amount || !amount.trim()) return false;
  const amountNum = parseFloat(amount);
  return !isNaN(amountNum) && amountNum > 0;
}

/**
 * Get amount validation error message
 * @param amount - Amount to validate
 * @param fieldName - Field name for error message (default: "amount")
 * @returns Error message if invalid, empty string if valid
 */
export function getAmountError(amount: string, fieldName: string = "amount"): string {
  if (!amount.trim()) {
    return `Please enter an ${fieldName}`;
  }
  if (!validateAmount(amount)) {
    return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be a positive number`;
  }
  return "";
}

/**
 * Validate slippage tolerance (0-50%)
 * @param slippage - Slippage percentage string
 * @returns true if valid, false otherwise
 */
export function validateSlippage(slippage: string): boolean {
  if (!slippage || !slippage.trim()) return false;
  const slippageNum = parseFloat(slippage);
  return !isNaN(slippageNum) && slippageNum >= 0 && slippageNum <= 50;
}

/**
 * Get slippage validation error message
 * @param slippage - Slippage to validate
 * @returns Error message if invalid, empty string if valid
 */
export function getSlippageError(slippage: string): string {
  if (!slippage.trim()) {
    return "Please enter slippage tolerance";
  }
  if (!validateSlippage(slippage)) {
    return "Slippage tolerance must be between 0 and 50";
  }
  return "";
}

/**
 * Validate token pair format (e.g., HBAR/USDC)
 * @param pair - Token pair string to validate
 * @returns true if valid, false otherwise
 */
export function validateTokenPair(pair: string): boolean {
  if (!pair || !pair.trim()) return true; // Optional field
  const pairPattern = /^[A-Z0-9]+\/[A-Z0-9]+$/i;
  return pairPattern.test(pair.trim());
}

/**
 * Get token pair validation error message
 * @param pair - Token pair to validate
 * @returns Error message if invalid, empty string if valid
 */
export function getTokenPairError(pair: string): string {
  if (pair.trim() && !validateTokenPair(pair)) {
    return "Invalid format. Use format: TOKEN1/TOKEN2 (e.g., HBAR/USDC)";
  }
  return "";
}

/**
 * Validate that two chains are different
 * @param sourceChain - Source chain
 * @param destinationChain - Destination chain
 * @returns true if different, false if same
 */
export function validateDifferentChains(sourceChain: string, destinationChain: string): boolean {
  return sourceChain !== destinationChain;
}

/**
 * Get different chains validation error message
 * @param sourceChain - Source chain
 * @param destinationChain - Destination chain
 * @returns Error message if invalid, empty string if valid
 */
export function getDifferentChainsError(sourceChain: string, destinationChain: string): string {
  if (!validateDifferentChains(sourceChain, destinationChain)) {
    return "Destination chain must be different from source chain";
  }
  return "";
}
