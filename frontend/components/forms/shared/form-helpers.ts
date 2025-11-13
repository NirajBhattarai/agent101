/**
 * Common helper functions for all forms
 */

/**
 * Generic filter function with regex support
 * Filters an array of items based on a search query
 * @param items - Array of items to filter
 * @param searchQuery - Search query string
 * @param useRegex - Whether to use regex matching
 * @param getSearchableText - Function to extract searchable text from each item
 * @returns Filtered array of items
 */
export function filterWithRegex<T>(
  items: T[],
  searchQuery: string,
  useRegex: boolean,
  getSearchableText: (item: T) => string | string[],
): T[] {
  if (!searchQuery.trim()) return items;

  try {
    if (useRegex) {
      const regex = new RegExp(searchQuery, "i");
      return items.filter((item) => {
        const searchable = getSearchableText(item);
        if (Array.isArray(searchable)) {
          return searchable.some((text) => regex.test(text));
        }
        return regex.test(searchable);
      });
    } else {
      const searchLower = searchQuery.toLowerCase();
      return items.filter((item) => {
        const searchable = getSearchableText(item);
        if (Array.isArray(searchable)) {
          return searchable.some((text) => text.toLowerCase().includes(searchLower));
        }
        return searchable.toLowerCase().includes(searchLower);
      });
    }
  } catch (e) {
    // Invalid regex, fallback to simple search
    const searchLower = searchQuery.toLowerCase();
    return items.filter((item) => {
      const searchable = getSearchableText(item);
      if (Array.isArray(searchable)) {
        return searchable.some((text) => text.toLowerCase().includes(searchLower));
      }
      return searchable.toLowerCase().includes(searchLower);
    });
  }
}

/**
 * Filter tokens by symbol, name, and optionally address
 * @param tokens - Array of tokens to filter
 * @param searchQuery - Search query
 * @param useRegex - Whether to use regex
 * @param includeAddress - Whether to include address in search (default: false)
 * @returns Filtered tokens
 */
export function filterTokens<T extends { symbol: string; name: string; address?: string }>(
  tokens: T[],
  searchQuery: string,
  useRegex: boolean = false,
  includeAddress: boolean = false,
): T[] {
  return filterWithRegex(tokens, searchQuery, useRegex, (token) => {
    const searchable = [token.symbol, token.name];
    if (includeAddress && token.address) {
      searchable.push(token.address);
    }
    return searchable;
  });
}

/**
 * Filter string array (like token pairs)
 * @param items - Array of strings to filter
 * @param searchQuery - Search query
 * @param useRegex - Whether to use regex
 * @returns Filtered strings
 */
export function filterStrings(
  items: string[],
  searchQuery: string,
  useRegex: boolean = false,
): string[] {
  return filterWithRegex(items, searchQuery, useRegex, (item) => item);
}

/**
 * Parse form arguments (handles both JSON string and object)
 * @param args - Arguments from form
 * @returns Parsed arguments object
 */
export function parseFormArgs(args: any): any {
  if (typeof args === "string") {
    try {
      return JSON.parse(args);
    } catch (e) {
      return {};
    }
  }
  return args || {};
}

/**
 * Trim all string values in an object
 * @param obj - Object with string values
 * @returns Object with trimmed values
 */
export function trimFormData<T extends Record<string, any>>(obj: T): T {
  const trimmed: any = {};
  for (const [key, value] of Object.entries(obj)) {
    trimmed[key] = typeof value === "string" ? value.trim() : value;
  }
  return trimmed as T;
}
