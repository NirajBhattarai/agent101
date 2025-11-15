"""
Balance Extractor Agent.

Extracts account addresses from user queries and prepares balance query parameters.
Uses token data from token_extractor_agent response to get token addresses.
"""

import json
import re
from typing import Optional

from google.adk.agents.llm_agent import LlmAgent
from google.adk.sessions.session import Session

# Balance Extraction Agent - Extracts account addresses and prepares balance queries
balance_extraction_agent = LlmAgent(
    name="BalanceExtractorAgent",
    model="gemini-2.5-flash",
    instruction=(
        "You are a Professional Balance Query Address Extractor.\n\n"
        "YOUR TASK:\n"
        "Extract account addresses from user balance queries and prepare balance query parameters.\n"
        "You will receive token data from the token extractor agent in the session state, so you "
        "only need to extract account addresses and chain information.\n\n"
        "INPUT:\n"
        "- User query for balance\n"
        "- Token data from token extractor agent is available in session.state['token_data'] "
        "(contains token addresses, networks, etc.)\n\n"
        "ACCESSING TOKEN DATA:\n"
        "The token extractor agent has already run and stored its output in session.state['token_data'].\n"
        "You can reference this data when determining token symbols and chain information.\n"
        "The token_data contains networks with tokens, their addresses, and chain information.\n\n"
        "EXTRACTION STEPS:\n"
        "1. Extract Account Address:\n"
        "   - Look for Hedera addresses (format: 0.0.123456)\n"
        "   - Look for EVM addresses (format: 0x followed by 40 hex characters)\n"
        "   - If found, extract it. If not found, set to null.\n"
        "   - Validate address format:\n"
        "     * Hedera: Must match pattern 0.0.xxxxx (where x is digit)\n"
        "     * EVM: Must be 0x followed by exactly 40 hexadecimal characters\n\n"
        "2. Detect Chain from Address or Query:\n"
        '   - If address is Hedera format (0.0.xxx), chain is "hedera"\n'
        "   - If address is EVM format (0x...), check query for chain mention:\n"
        '     * "ethereum" or "eth" -> "ethereum"\n'
        '     * "polygon" or "matic" -> "polygon"\n'
        '     * If no chain mentioned, infer from token data or set to "unknown"\n'
        '   - If "all chains" or "all" is mentioned, set chain to "all"\n'
        '   - If no chain can be determined, set to "unknown"\n\n'
        "3. Identify Query Type:\n"
        '   - "popular_tokens": Query mentions "popular tokens", "trending tokens", '
        '"top tokens", "popular" (no address needed)\n'
        '   - "all_chains_token": Token specified in token data but no chain specified\n'
        '   - "specific_token_chain": Token AND chain both specified in token data\n'
        '   - "standard_balance": General balance query without specific token\n\n'
        "4. Determine Address Requirements:\n"
        "   - requires_address: true if query needs an account address (most balance queries)\n"
        "   - requires_address: false for popular tokens query (no address needed)\n"
        "   - address_error: Set error message if address is required but missing or invalid\n\n"
        "5. Use Token Data from Token Extractor:\n"
        "   - Token addresses are already extracted by token extractor agent\n"
        "   - Use token_symbol from token data if available\n"
        "   - Use chain information from token data if available\n"
        "   - Focus only on extracting account address from user query\n\n"
        "ADDRESS FORMATS:\n"
        "- Hedera: 0.0.123456 (account ID format, digits only)\n"
        "- Ethereum/Polygon: 0x followed by 40 hexadecimal characters (case-insensitive)\n"
        "- Examples:\n"
        "  * Valid Hedera: 0.0.123456, 0.0.456789\n"
        "  * Valid EVM: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb, "
        "0x1234567890123456789012345678901234567890\n"
        "  * Invalid: 0x123 (too short), 0.0.abc (non-numeric), 0xGG... (invalid hex)\n\n"
        "OUTPUT FORMAT - CRITICAL: Output ONLY valid, minified JSON. "
        "NO markdown, NO extra text before or after:\n\n"
        "{\n"
        '  "account_address": "0.0.123456" or "0x..." or null,\n'
        '  "token_symbol": "USDT" or null (from token data if available),\n'
        '  "chain": "ethereum" | "polygon" | "hedera" | "all" | "unknown",\n'
        '  "query_type": "popular_tokens" | "all_chains_token" | "specific_token_chain" | "standard_balance",\n'
        '  "requires_address": true or false,\n'
        '  "address_error": null or "error message if address is invalid/required"\n'
        "}\n\n"
        "RESPONSE GUIDELINES:\n\n"
        "1. CHAIN VALUES: Always use lowercase network identifiers\n"
        "   - ethereum, polygon, hedera, all, unknown\n\n"
        "2. QUERY TYPE VALUES:\n"
        "   - popular_tokens: User wants popular/trending tokens (no address needed)\n"
        "   - all_chains_token: Token specified but no chain (query across all chains)\n"
        "   - specific_token_chain: Both token and chain specified\n"
        "   - standard_balance: General balance query without specific token\n\n"
        "3. ADDRESS VALIDATION:\n"
        "   - Validate Hedera addresses: Must be 0.0. followed by digits only\n"
        "   - Validate EVM addresses: Must be 0x followed by exactly 40 hex characters\n"
        "   - If address format is invalid, set address_error with description\n"
        '   - If address is required but missing, set address_error: "Account address is required for balance queries"\n\n'
        "4. TOKEN SYMBOL:\n"
        "   - Extract from token data if available\n"
        "   - Set to null if no token specified\n"
        "   - Use exact capitalization (USDT not usdt)\n\n"
        "5. ERROR HANDLING:\n"
        "   - Always provide valid JSON structure even if some fields are null\n"
        "   - Include helpful error messages in address_error field\n"
        "   - If query is unclear, set appropriate address_error\n\n"
        "EXAMPLE QUERIES AND EXPECTED OUTPUTS:\n\n"
        'Query: "Get balance for 0.0.123456 on Hedera"\n'
        'Output: {{"account_address": "0.0.123456", "token_symbol": null, '
        '"chain": "hedera", "query_type": "standard_balance", '
        '"requires_address": true, "address_error": null}}\n\n'
        'Query: "Get USDT balance for 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb on Ethereum"\n'
        'Output: {{"account_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", '
        '"token_symbol": "USDT", "chain": "ethereum", "query_type": "specific_token_chain", '
        '"requires_address": true, "address_error": null}}\n\n'
        'Query: "Get USDC balance" (with token data from token extractor)\n'
        'Output: {{"account_address": null, "token_symbol": "USDC", "chain": "unknown", '
        '"query_type": "all_chains_token", "requires_address": true, '
        '"address_error": "Account address is required for balance queries"}}\n\n'
        'Query: "Get popular tokens"\n'
        'Output: {{"account_address": null, "token_symbol": null, "chain": "unknown", '
        '"query_type": "popular_tokens", "requires_address": false, "address_error": null}}\n\n'
        'Query: "Get balance for 0.0.123456"\n'
        'Output: {{"account_address": "0.0.123456", "token_symbol": null, "chain": "hedera", '
        '"query_type": "standard_balance", "requires_address": true, "address_error": null}}\n\n'
        "CRITICAL RULES:\n"
        "- Output ONLY JSON, no markdown code blocks, no extra text\n"
        "- Do NOT include backticks or markdown formatting\n"
        "- Validate all addresses are in correct format\n"
        "- Use exact capitalization for token symbols (USDT not usdt)\n"
        "- Always include all required fields in the JSON response\n"
        "- Set address_error to helpful message if address is required but missing\n"
        "- Do NOT extract token addresses - that's done by token extractor agent\n"
        "- Focus ONLY on extracting account addresses from user query\n"
        "- Make response immediately parseable by JSON parsers"
    ),
    output_key="balance_data",
)


def parse_balance_response(session: Session) -> dict:
    """
    Parse balance response from single agent.

    Args:
        session: ADK Session with agent output

    Returns:
        Structured balance extraction data
    """
    try:
        # Get output from agent
        balance_data = session.state.get("balance_data")

        if not balance_data:
            return {
                "account_address": None,
                "token_symbol": None,
                "chain": "unknown",
                "query_type": "standard_balance",
                "requires_address": True,
                "address_error": "No data extracted",
            }

        # Parse JSON if string
        if isinstance(balance_data, str):
            try:
                balance_data = json.loads(balance_data)
            except json.JSONDecodeError:
                # Fallback: extract JSON from response
                balance_data = _extract_json(balance_data)

        return balance_data

    except Exception as e:
        return {
            "account_address": None,
            "token_symbol": None,
            "chain": "unknown",
            "query_type": "standard_balance",
            "requires_address": True,
            "address_error": str(e),
        }


def _extract_json(response: str) -> dict:
    """
    Extract JSON from LLM response with advanced fallback.

    Args:
        response: Raw response string from LLM

    Returns:
        Parsed JSON dictionary or empty structure if parsing fails
    """
    try:
        # Try direct parse first
        return json.loads(response)
    except json.JSONDecodeError:
        pass

    # Try markdown code block
    json_match = re.search(r"```json\s*(\{.*?\})\s*```", response, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try generic code block
    json_match = re.search(r"```\s*(\{.*?\})\s*```", response, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find brace-enclosed JSON
    brace_start = response.find("{")
    if brace_start != -1:
        brace_count = 0
        brace_end = -1
        for i in range(brace_start, len(response)):
            if response[i] == "{":
                brace_count += 1
            elif response[i] == "}":
                brace_count -= 1
                if brace_count == 0:
                    brace_end = i + 1
                    break

        if brace_end != -1:
            try:
                return json.loads(response[brace_start:brace_end])
            except json.JSONDecodeError:
                pass

    # Return empty structure
    return {
        "account_address": None,
        "token_symbol": None,
        "chain": "unknown",
        "query_type": "standard_balance",
        "requires_address": True,
        "address_error": "Could not parse JSON from response",
    }


# Test queries for validation
TEST_QUERIES = [
    "Get balance for 0.0.123456 on Hedera",
    "Get USDT balance for 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb on Ethereum",
    "Get USDC balance",
    "Get popular tokens",
    "Get balance for 0.0.123456",
    "Show me HBAR balance for account 0.0.456789",
    "Get all token balances for 0x1234567890123456789012345678901234567890 on Polygon",
]


# Example expected response for "Get balance for 0.0.123456 on Hedera"
EXAMPLE_RESPONSE = {
    "account_address": "0.0.123456",
    "token_symbol": None,
    "chain": "hedera",
    "query_type": "standard_balance",
    "requires_address": True,
    "address_error": None,
}
