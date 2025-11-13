/**
 * Shared TypeScript types for all forms
 */

/**
 * Standard form errors type
 * Maps field names to error messages
 */
export type FormErrors = Record<string, string>;

/**
 * Common form props interface
 */
export interface FormProps {
  args: any;
  respond: any;
}

/**
 * Token interface for forms that use tokens
 */
export interface Token {
  symbol: string;
  name: string;
  address?: string;
  type?: "native" | "token";
  chain?: string;
}

/**
 * Chain option interface
 */
export interface ChainOption {
  value: string;
  label: string;
  icon: string;
}
