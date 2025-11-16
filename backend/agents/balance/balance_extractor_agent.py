"""
Balance Extractor Agent.

Extracts account addresses from user queries and fetches balance data using available tools.
Uses token data from token_extractor_agent response to get token addresses.

REQUEST FORMAT:
The agent receives a user query string that may contain:
- Account addresses (Hedera format: 0.0.123456 or EVM format: 0x...)
- Blockchain network names (e.g., "Ethereum", "Polygon", "Hedera", "all chains")
- Token symbols (e.g., "USDT", "USDC", "HBAR", "ETH", "MATIC")
- Requests for "all balances" or "popular tokens"

Example Requests:
- "Get balance for 0.0.123456 on Hedera"
- "Get USDT balance for 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb on Ethereum"
- "Get all balances for 0x46f3da7d7811bb339cea36bb7199361a543de22f" (no chain = all chains)
- "Get USDC balance" (requires address)
- "Get popular tokens"
- "Show me HBAR balance for account 0.0.456789"
- "Get all token balances for 0x1234567890123456789012345678901234567890 on Polygon"

RESPONSE FORMAT:
The agent can return two types of responses:

1. TOOL RESPONSE (when agent calls tools directly):
{
  "type": "balance",
  "chain": "hedera" | "ethereum" | "polygon" | "all",
  "account_address": "0.0.123456" | "0x...",
  "balances": [
    {
      "token_type": "native",
      "token_symbol": "HBAR",
      "token_address": "0.0.0",
      "balance": "103.43977453",
      "balance_raw": "10343977453",
      "decimals": 8
    },
    {
      "token_type": "token",
      "token_symbol": "USDC",
      "token_address": "0.0.1055472",
      "balance": "1000.0",
      "balance_raw": "1000000000",
      "decimals": 6
    }
  ],
  "total_usd_value": "$0.00"
}

For "all" chains, returns:
{
  "type": "balance_summary",
  "account_address": "0x...",
  "token_address": "USDC" | null,
  "chains": {
    "hedera": {
      "type": "balance",
      "chain": "hedera",
      "account_address": "0.0.123456",
      "balances": [...],
      "total_usd_value": "$0.00"
    },
    "ethereum": {...},
    "polygon": {...}
  },
  "total_usd_value": "$0.00"
}

2. EXTRACTION RESPONSE (when agent only extracts parameters):
{
  "account_address": "0.0.123456" | "0x..." | null,
  "token_symbol": "USDT" | null,
  "chain": "ethereum" | "polygon" | "hedera" | "all" | "unknown",
  "query_type": "popular_tokens" | "all_chains_token" | "specific_token_chain" | "standard_balance",
  "requires_address": true | false,
  "address_error": null | "error message if address is invalid/required"
}

RESPONSE FIELDS:
Tool Response:
- type: Always "balance" or "balance_summary" for all chains
- chain: Network identifier (hedera, ethereum, polygon, all)
- account_address: The account address queried
- balances: Array of balance objects, each containing:
  - token_type: "native" or "token"
  - token_symbol: Token ticker (HBAR, ETH, USDC, etc.)
  - token_address: Contract address or native token identifier
  - balance: Human-readable balance string
  - balance_raw: Raw balance as string (before decimal conversion)
  - decimals: Number of decimal places
- total_usd_value: Total USD value (currently "$0.00")

Extraction Response:
- account_address: Extracted account address or null
- token_symbol: Extracted token symbol or null
- chain: Detected or inferred chain
- query_type: Type of query (popular_tokens, all_chains_token, etc.)
- requires_address: Whether address is required for this query
- address_error: Error message if address is missing or invalid

The response is stored in session.state['balance_data'] for use by the executor.
The executor will use tool responses directly or use extraction responses to call balance tools.
"""

# Standard library imports
import json
import re

# Third-party imports
from google.adk.agents.llm_agent import LlmAgent
from google.adk.sessions.session import Session

# Local imports
from .tools import (
    get_balance_all_chains,
    get_balance_ethereum,
    get_balance_hedera,
    get_balance_polygon,
    get_popular_tokens,
)

# Balance Extraction Agent - Extracts account addresses and prepares balance queries
balance_extraction_agent = LlmAgent(
    name="BalanceExtractorAgent",
    model="gemini-2.5-flash",
    instruction=(
        "You are a Professional Balance Query Address Extractor.\n\n"
        "YOUR TASK:\n"
        "Extract account addresses from user balance queries and fetch balance data using available tools.\n"
        "You will receive token data from the token extractor agent in the session state.\n"
        "After extracting account address and chain information, use the appropriate balance tool to fetch balances.\n"
        "Return the complete balance response from the tool.\n\n"
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
        '     * If no chain mentioned, set to "all" (query all chains)\n'
        '   - If "all chains" or "all" is mentioned, set chain to "all"\n'
        '   - If no chain can be determined AND address is provided, set to "all"\n'
        '   - If no chain can be determined AND no address, set to "unknown"\n\n'
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
        "6. Fetch Balance Data Using Tools:\n"
        "   - After extracting account address and chain, use the appropriate tool:\n"
        "     * get_balance_hedera(account_address, token_symbol) - For Hedera chain\n"
        "       Returns native HBAR balance and ERC20 token balances\n"
        "     * get_balance_ethereum(account_address, token_symbol) - For Ethereum chain\n"
        "       Returns native ETH balance and ERC20 token balances\n"
        "     * get_balance_polygon(account_address, token_symbol) - For Polygon chain\n"
        "       Returns native MATIC balance and ERC20 token balances\n"
        "     * get_balance_all_chains(account_address, token_symbol) - For all chains or when chain is unknown\n"
        "       Returns balances across Hedera, Ethereum, and Polygon\n"
        "       Use this when chain is 'all' or when EVM address is provided but no chain is specified\n"
        "   - If token_symbol is provided, pass it to the tool\n"
        "   - If token_symbol is None, the tool will return all balances (native + tokens)\n"
        "   - Return the complete response object from the tool\n\n"
        "ADDRESS FORMATS:\n"
        "- Hedera: 0.0.123456 (account ID format, digits only)\n"
        "- Ethereum/Polygon: 0x followed by 40 hexadecimal characters (case-insensitive)\n"
        "- Examples:\n"
        "  * Valid Hedera: 0.0.123456, 0.0.456789\n"
        "  * Valid EVM: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb, "
        "0x1234567890123456789012345678901234567890\n"
        "  * Invalid: 0x123 (too short), 0.0.abc (non-numeric), 0xGG... (invalid hex)\n\n"
        "OUTPUT FORMAT:\n"
        "If you have an account address and chain information, USE THE APPROPRIATE TOOL to fetch balances.\n"
        "Return the COMPLETE response object from the tool (which includes balances, native tokens, ERC20 tokens).\n\n"
        "If you cannot fetch balances (missing address, invalid address, etc.), output this JSON structure:\n"
        "{\n"
        '  "account_address": "0.0.123456" or "0x..." or null,\n'
        '  "token_symbol": "USDT" or null (from token data if available),\n'
        '  "chain": "ethereum" | "polygon" | "hedera" | "all" | "unknown",\n'
        '  "query_type": "popular_tokens" | "all_chains_token" | "specific_token_chain" | "standard_balance",\n'
        '  "requires_address": true or false,\n'
        '  "address_error": null or "error message if address is invalid/required"\n'
        "}\n\n"
        "PREFERRED: Use tools to fetch actual balance data and return the tool's response object.\n\n"
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
        'Query: "Get all balances for 0x46f3da7d7811bb339cea36bb7199361a543de22f" (no chain mentioned)\n'
        'Output: {{"account_address": "0x46f3da7d7811bb339cea36bb7199361a543de22f", "token_symbol": null, '
        '"chain": "all", "query_type": "standard_balance", "requires_address": true, "address_error": null}}\n'
        'Note: When EVM address is provided but no chain is mentioned, use "all" to query all chains.\n\n'
        "CRITICAL RULES:\n"
        "- ALWAYS use the appropriate balance tool when you have a valid account address\n"
        "- Tools return complete balance objects with native and ERC20 token balances\n"
        "- Return the tool's response object directly (it's already in JSON format)\n"
        "- If address is missing or invalid, return the error JSON structure above\n"
        "- Validate all addresses are in correct format before calling tools\n"
        "- Use exact capitalization for token symbols (USDT not usdt)\n"
        "- Do NOT extract token addresses - that's done by token extractor agent\n"
        "- Focus on extracting account addresses and then fetching balances with tools\n"
        "- For 'all' chains, use get_balance_all_chains tool\n"
        "- For specific chains, use the chain-specific tool (get_balance_hedera, get_balance_ethereum, get_balance_polygon)"
    ),
    output_key="balance_data",
    tools=[
        get_popular_tokens,
        get_balance_hedera,
        get_balance_ethereum,
        get_balance_polygon,
        get_balance_all_chains,
    ],
)


def parse_balance_response(session: Session) -> dict:
    """
    Parse balance response from single agent.

    WHEN THIS FUNCTION IS CALLED:
    This function is called by the BalanceExecutor in executor.py after the SequentialAgent
    has completed execution. The execution flow is:

    1. User sends a balance query request
    2. BalanceExecutor.execute() is called (A2A Protocol entry point)
    3. SequentialAgent (root_agent) runs with two sub-agents:
       a. Token Extraction Agent - extracts token info, stores in session.state['token_data']
       b. Balance Extraction Agent - extracts account address/chain, stores in session.state['balance_data']
    4. After SequentialAgent completes, executor retrieves the session
    5. parse_balance_response() is called to parse the balance_data from session.state
    6. The parsed data is then used to build the final balance response

    Handles two types of responses:
    1. Tool response: Direct balance data from balance tools (has "type" and "balances")
       - This happens when the agent used tools directly (get_balance_hedera, etc.)
       - The tool response is already complete and ready to return
    2. Extraction response: Extracted parameters (has "account_address", "chain", etc.)
       - This happens when the agent only extracted parameters without calling tools
       - The executor will then use these parameters to call balance tools

    Args:
        session: ADK Session with agent output (contains session.state['balance_data'])

    Returns:
        Structured balance data (either tool response or extraction data)
    """
    try:
        print("=" * 80)
        print("📞 parse_balance_response() CALLED")
        print("   Called by: BalanceExecutor.execute() after SequentialAgent completes")
        print("   Purpose: Parse balance_data from session.state['balance_data']")
        print("=" * 80)

        # Get output from agent
        balance_data = session.state.get("balance_data")

        print("🔍 Balance Extractor Agent - Response Received")

        if not balance_data:
            print("⚠️  No balance_data found in session state")
            return {
                "account_address": None,
                "token_symbol": None,
                "chain": "unknown",
                "query_type": "standard_balance",
                "requires_address": True,
                "address_error": "No data extracted",
            }

        # Step 1: Check response type and parse accordingly
        response_type = type(balance_data).__name__
        print(f"📥 Raw response type: {response_type}")

        # Step 2: Parse based on type
        if isinstance(balance_data, str):
            # STRING TYPE: Parse as JSON string
            print(f"📝 Raw string response (first 200 chars): {balance_data[:200]}")
            print("🔄 Parsing STRING response as JSON...")
            balance_data = _parse_string_response(balance_data)
        elif isinstance(balance_data, dict):
            # DICT TYPE: Use directly, no parsing needed
            print(f"📦 Raw dict response keys: {list(balance_data.keys())}")
            print(f"📦 Raw dict response preview: {json.dumps(balance_data, indent=2)[:500]}")
            print("✅ Using DICT response directly (no parsing needed)")
        else:
            # UNKNOWN TYPE: Log and return error
            print(f"⚠️  Unsupported response type: {response_type}")
            print("📤 Returning error response")
            print("=" * 80)
            return {
                "account_address": None,
                "token_symbol": None,
                "chain": "unknown",
                "query_type": "standard_balance",
                "requires_address": True,
                "address_error": f"Unsupported response type: {response_type}",
            }

        # Step 3: Unwrap tool response if wrapped (e.g., {"get_balance_hedera_response": {...}})
        if isinstance(balance_data, dict):
            original_keys = list(balance_data.keys())
            balance_data = _unwrap_tool_response(balance_data)
            if list(balance_data.keys()) != original_keys:
                print("🔓 Unwrapped tool response (keys changed)")

        # Step 4: Determine response type and return appropriately
        if isinstance(balance_data, dict):
            return _handle_parsed_response(balance_data)
        else:
            print(f"⚠️  Parsed response is not a dict: {type(balance_data)}")
            print("📤 Returning error response")
            print("=" * 80)
            return {
                "account_address": None,
                "token_symbol": None,
                "chain": "unknown",
                "query_type": "standard_balance",
                "requires_address": True,
                "address_error": "Parsed response is not a valid dictionary",
            }

    except Exception as e:
        print("=" * 80)
        print("❌ Error in parse_balance_response")
        print(f"   Error: {str(e)}")
        print("=" * 80)
        return {
            "account_address": None,
            "token_symbol": None,
            "chain": "unknown",
            "query_type": "standard_balance",
            "requires_address": True,
            "address_error": str(e),
        }


def _parse_string_response(response: str) -> dict:
    """
    Parse string response as JSON.

    Tries multiple parsing strategies:
    1. Direct JSON parse
    2. Extract from markdown code blocks
    3. Extract complete JSON by brace matching

    Args:
        response: String response to parse

    Returns:
        Parsed dictionary
    """
    # Try direct JSON parse first
    try:
        parsed = json.loads(response)
        print("✅ Successfully parsed JSON directly from string")
        return parsed
    except json.JSONDecodeError:
        print("⚠️  Direct JSON parse failed, trying extraction methods...")

    # Try extraction methods
    parsed = _extract_json(response)
    if parsed and not parsed.get("address_error"):
        print("✅ Successfully extracted JSON using fallback methods")
        return parsed

    # If all parsing fails, return error structure
    print("❌ All JSON parsing methods failed")
    return {
        "account_address": None,
        "token_symbol": None,
        "chain": "unknown",
        "query_type": "standard_balance",
        "requires_address": True,
        "address_error": "Could not parse JSON from string response",
    }


def _handle_parsed_response(balance_data: dict) -> dict:
    """
    Handle parsed response and determine its type.

    Checks if response is:
    - Tool response: Has "type" and "balances" fields
    - Extraction response: Has extraction fields like "account_address", "chain", etc.

    Args:
        balance_data: Parsed dictionary response

    Returns:
        The response dictionary with appropriate logging
    """
    # Check if this is a tool response (has "type" and "balances" fields)
    if "type" in balance_data and "balances" in balance_data:
        # This is a tool response - return as-is
        print("✅ Detected TOOL RESPONSE (has 'type' and 'balances')")
        print(f"   Type: {balance_data.get('type')}")
        print(f"   Chain: {balance_data.get('chain', 'N/A')}")
        print(f"   Account: {balance_data.get('account_address', 'N/A')}")
        print(f"   Number of balances: {len(balance_data.get('balances', []))}")
        print("📤 Returning tool response as-is")
        print("=" * 80)
        return balance_data
    else:
        # Otherwise, it's an extraction response - return as-is
        print("✅ Detected EXTRACTION RESPONSE (has extraction fields)")
        print(f"   Account address: {balance_data.get('account_address', 'N/A')}")
        print(f"   Chain: {balance_data.get('chain', 'N/A')}")
        print(f"   Token symbol: {balance_data.get('token_symbol', 'N/A')}")
        print(f"   Query type: {balance_data.get('query_type', 'N/A')}")
        print(f"   Address error: {balance_data.get('address_error', 'N/A')}")
        print("📤 Returning extraction response")
        print("=" * 80)
        return balance_data


def _unwrap_tool_response(data: dict) -> dict:
    """
    Unwrap tool response if it's wrapped in a response key.

    Handles cases where LLM wraps tool response like:
    {"get_balance_hedera_response": {...actual response...}}

    Args:
        data: Dictionary that might contain wrapped tool response

    Returns:
        Unwrapped dictionary or original if not wrapped
    """
    # Check for common tool response wrapper keys
    tool_response_keys = [
        "get_balance_hedera_response",
        "get_balance_ethereum_response",
        "get_balance_polygon_response",
        "get_balance_all_chains_response",
        "balance_response",
        "response",
    ]

    for key in tool_response_keys:
        if key in data and isinstance(data[key], dict):
            print(f"🔓 Unwrapping tool response from key: {key}")
            return data[key]

    # Check if all keys are tool response wrappers (single key that contains dict)
    if len(data) == 1:
        key, value = next(iter(data.items()))
        if isinstance(value, dict) and ("type" in value or "balances" in value):
            print(f"🔓 Unwrapping tool response from single key: {key}")
            return value

    return data


def _extract_json(response: str) -> dict:
    """
    Extract JSON from LLM response with advanced fallback.

    Handles markdown code blocks and multiline JSON.

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

    # Try markdown code block with multiline support
    # Match ```json ... ``` or ``` ... ``` with proper brace matching
    json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", response, re.DOTALL)
    if json_match:
        try:
            # Extract the JSON content
            json_content = json_match.group(1)
            # Try to find complete JSON by matching braces
            parsed = _extract_complete_json(json_content)
            if parsed:
                return parsed
        except Exception:
            pass

    # Try to find brace-enclosed JSON from the start
    brace_start = response.find("{")
    if brace_start != -1:
        parsed = _extract_complete_json(response[brace_start:])
        if parsed:
            return parsed

    # Return empty structure
    return {
        "account_address": None,
        "token_symbol": None,
        "chain": "unknown",
        "query_type": "standard_balance",
        "requires_address": True,
        "address_error": "Could not parse JSON from response",
    }


def _extract_complete_json(text: str) -> dict | None:
    """
    Extract complete JSON object by matching braces.

    Args:
        text: Text containing JSON

    Returns:
        Parsed JSON dict or None if parsing fails
    """
    brace_start = text.find("{")
    if brace_start == -1:
        return None

    brace_count = 0
    brace_end = -1
    for i in range(brace_start, len(text)):
        if text[i] == "{":
            brace_count += 1
        elif text[i] == "}":
            brace_count -= 1
            if brace_count == 0:
                brace_end = i + 1
                break

    if brace_end != -1:
        try:
            return json.loads(text[brace_start:brace_end])
        except json.JSONDecodeError:
            pass

    return None


