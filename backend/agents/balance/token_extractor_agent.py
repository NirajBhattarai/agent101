"""
Token Extractor Agent.

Extracts token information (symbols, addresses, networks) from user queries
and organizes them into structured JSON format by blockchain network.

REQUEST FORMAT:
The agent receives a user query string that may contain:
- Token symbols (e.g., "USDT", "USDC", "ETH", "HBAR", "MATIC")
- Blockchain network names (e.g., "Ethereum", "Polygon", "Hedera")
- Contract addresses (hexadecimal starting with 0x)
- Requests for "all networks" or "all chains"

Example Requests:
- "Get USDT on Ethereum and Polygon"
- "What's the address of USDC on Ethereum, Polygon, and Hedera?"
- "Show me ETH, MATIC, and HBAR on all networks"
- "Get HBAR on Hedera"
- "Find USDC addresses on Ethereum, Polygon, and Hedera"
- "USDT, USDC, and DAI on Ethereum"
- "All stablecoins on Polygon and Hedera"

RESPONSE FORMAT:
Returns a structured JSON object with the following structure:

{
  "networks": {
    "ethereum": {
      "name": "Ethereum",
      "chain_id": 1,
      "rpc": "https://eth.llamarpc.com",
      "tokens": [
        {
          "symbol": "USDT",
          "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          "decimals": 6,
          "is_native": false,
          "coingecko_id": "tether",
          "wrapped_address": "0x..." // Optional, for native tokens
        },
        {
          "symbol": "ETH",
          "address": "0x0000000000000000000000000000000000000000",
          "decimals": 18,
          "is_native": true,
          "coingecko_id": "ethereum",
          "wrapped_address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" // WETH
        }
      ]
    },
    "polygon": {
      "name": "Polygon",
      "chain_id": 137,
      "rpc": "https://polygon.llamarpc.com",
      "tokens": [
        {
          "symbol": "USDT",
          "address": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
          "decimals": 6,
          "is_native": false,
          "coingecko_id": "tether"
        }
      ]
    },
    "hedera": {
      "name": "Hedera",
      "chain_id": 295,
      "rpc": "https://mainnet.hashio.io/api",
      "tokens": [
        {
          "symbol": "HBAR",
          "address": "0x0000000000000000000000000000000000000000",
          "decimals": 8,
          "is_native": true,
          "coingecko_id": "hedera",
          "tokenid": "0.0.0",
          "wrapped_address": "0x..." // WHBAR
        }
      ]
    }
  },
  "tokens": [
    {
      "symbol": "USDT",
      "chains": ["ethereum", "polygon", "hedera"],
      "references": [
        {"chain": "ethereum", "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7"},
        {"chain": "polygon", "address": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"},
        {"chain": "hedera", "address": "0x0000000000000000000000000000000000101b07"}
      ]
    }
  ],
  "networks_list": ["ethereum", "polygon", "hedera"],
  "query_valid": true,
  "error": null,
  "summary": {
    "tokens_found": 1,
    "networks_found": 3,
    "total_tokens_extracted": 3
  }
}

RESPONSE FIELDS:
- networks: Object keyed by network name (ethereum, polygon, hedera)
  - Each network contains: name, chain_id, rpc, tokens array
- tokens: Flat array of unique tokens with cross-chain references
- networks_list: Array of network names found
- query_valid: Boolean indicating if query was understood
- error: Error message string or null
- summary: Statistics about extracted tokens

The response is stored in session.state['token_data'] for use by the balance extractor agent.
"""

import json
import re

from google.adk.agents.llm_agent import LlmAgent
from google.adk.sessions.session import Session

from packages.blockchain.ethereum.constants import ETHEREUM_TOKENS
from packages.blockchain.hedera.constants import HEDERA_TOKENS
from packages.blockchain.polygon.constants import POLYGON_TOKENS


def _format_tokens_for_instruction() -> str:
    """
    Format token constants into instruction string format.

    Returns:
        Formatted string with all token addresses for each network
    """
    lines = []

    # Ethereum tokens
    lines.append("Ethereum (Chain ID: 1):")
    for symbol, token_data in sorted(ETHEREUM_TOKENS.items()):
        address = token_data["address"]
        decimals = token_data["decimals"]
        is_native = address == "0x0000000000000000000000000000000000000000"
        native_str = ", native: true" if is_native else ""
        lines.append(f"- {symbol}: {address} (decimals: {decimals}{native_str})")
    lines.append("")

    # Polygon tokens
    lines.append("Polygon (Chain ID: 137):")
    for symbol, token_data in sorted(POLYGON_TOKENS.items()):
        address = token_data["address"]
        decimals = token_data["decimals"]
        is_native = address == "0x0000000000000000000000000000000000000000"
        native_str = ", native: true" if is_native else ""
        lines.append(f"- {symbol}: {address} (decimals: {decimals}{native_str})")
    lines.append("")

    # Hedera tokens
    lines.append("Hedera (Chain ID: 295):")
    for symbol, token_data in sorted(HEDERA_TOKENS.items()):
        address = token_data["address"]
        decimals = token_data["decimals"]
        tokenid = token_data.get("tokenid", "")
        is_native = tokenid == "0.0.0" or address == "0x0000000000000000000000000000000000000000"
        native_str = ", native: true" if is_native else ""
        tokenid_str = f", tokenid: {tokenid}" if tokenid else ""
        lines.append(f"- {symbol}: {address} (decimals: {decimals}{native_str}{tokenid_str})")
    lines.append("")

    return "\n".join(lines)


# Token Extraction Agent with detailed instruction
token_extraction_agent = LlmAgent(
    name="TokenExtractorAgent",
    model="gemini-2.5-flash",
    instruction=(
        "You are a Professional Token Information Extractor and Network Organizer.\n\n"
        "YOUR TASK:\n"
        "Parse the user's request and extract all token information (symbols, addresses, networks).\n"
        "Organize the extracted data into a structured JSON format organized by blockchain network.\n\n"
        "INPUT ANALYSIS:\n"
        '- User may ask for tokens on specific networks or "all networks"\n'
        "- User may provide token symbols (USDT, USDC, ETH, HBAR, DAI, etc.)\n"
        "- User may provide contract addresses (hexadecimal starting with 0x)\n"
        "- User may ask for multiple tokens on multiple networks\n\n"
        "EXTRACTION STEPS:\n"
        "1. Identify all token symbols mentioned (extract token tickers like USDT, USDC, etc.)\n"
        "2. Identify all blockchain networks mentioned (Ethereum, Polygon, Hedera)\n"
        "3. If no specific networks mentioned, default to all supported networks "
        "(Ethereum, Polygon, Hedera)\n"
        "4. Extract or know the contract address for each token on each network\n"
        "5. Extract or know the decimal places for each token (standard: 18 for native, "
        "6 for stablecoins)\n"
        "6. Determine if token is native currency for that network (ETH for Ethereum, "
        "MATIC for Polygon, HBAR for Hedera)\n\n"
        "IMPORTANT - NATIVE TOKEN WRAPPING FOR LIQUIDITY:\n"
        "When users want to swap or get liquidity for native tokens, you MUST use the wrapped "
        "token address instead:\n"
        "- HBAR (native) -> Use WHBAR address for liquidity/swap operations\n"
        "- MATIC (native) -> Use WMATIC address for liquidity/swap operations\n"
        "- ETH (native) -> Use WETH address for liquidity/swap operations\n"
        "This is because DEX liquidity pools use wrapped tokens, not native tokens directly.\n"
        "Always include both the native token (for balance queries) and wrapped token "
        "(for liquidity/swap operations) in the response.\n\n"
        "KNOWN TOKEN ADDRESSES (Reference Data):\n"
        f"{_format_tokens_for_instruction()}\n"
        "OUTPUT FORMAT - CRITICAL: Output ONLY valid, minified JSON. "
        "NO markdown, NO extra text before or after:\n\n"
        "{\n"
        '  "networks": {\n'
        '    "ethereum": {\n'
        '      "name": "Ethereum",\n'
        '      "chain_id": 1,\n'
        '      "rpc": "https://eth.llamarpc.com",\n'
        '      "tokens": [\n'
        "        {\n"
        '          "symbol": "USDT",\n'
        '          "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",\n'
        '          "decimals": 6,\n'
        '          "is_native": false,\n'
        '          "coingecko_id": "tether"\n'
        "        },\n"
        "        {\n"
        '          "symbol": "ETH",\n'
        '          "address": "0x0000000000000000000000000000000000000000",\n'
        '          "decimals": 18,\n'
        '          "is_native": true,\n'
        '          "coingecko_id": "ethereum"\n'
        "        }\n"
        "      ]\n"
        "    },\n"
        '    "polygon": {\n'
        '      "name": "Polygon",\n'
        '      "chain_id": 137,\n'
        '      "rpc": "https://polygon.llamarpc.com",\n'
        '      "tokens": [\n'
        "        {\n"
        '          "symbol": "USDT",\n'
        '          "address": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",\n'
        '          "decimals": 6,\n'
        '          "is_native": false,\n'
        '          "coingecko_id": "tether"\n'
        "        }\n"
        "      ]\n"
        "    }\n"
        "  },\n"
        '  "tokens": [\n'
        "    {\n"
        '      "symbol": "USDT",\n'
        '      "chains": ["ethereum", "polygon"],\n'
        '      "references": [\n'
        '        {"chain": "ethereum", "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7"},\n'
        '        {"chain": "polygon", "address": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"}\n'
        "      ]\n"
        "    }\n"
        "  ],\n"
        '  "networks_list": ["ethereum", "polygon"],\n'
        '  "query_valid": true,\n'
        '  "error": null,\n'
        '  "summary": {\n'
        '    "tokens_found": 1,\n'
        '    "networks_found": 2,\n'
        '    "total_tokens_extracted": 2\n'
        "  }\n"
        "}\n\n"
        "RESPONSE GUIDELINES:\n\n"
        "1. NETWORK KEYS: Always use lowercase network identifiers\n"
        "   - ethereum, polygon, hedera\n\n"
        "2. FOR EACH NETWORK OBJECT, INCLUDE:\n"
        "   - name: Full human-readable network name\n"
        "   - chain_id: Numeric chain ID for RPC calls\n"
        "   - rpc: Default RPC endpoint URL\n"
        "   - tokens: Array of token objects for that network\n\n"
        "3. FOR EACH TOKEN OBJECT, INCLUDE:\n"
        "   - symbol: Token ticker (USDT, USDC, ETH, etc.)\n"
        "   - address: Contract address (hex format 0x...) or 0x0000... for native\n"
        "   - decimals: Number of decimal places (usually 18 or 6)\n"
        "   - is_native: Boolean - true if native currency, false otherwise\n"
        "   - coingecko_id: Coingecko identifier for price data (lowercase, hyphen-separated)\n"
        "   - wrapped_address: (OPTIONAL) If native token, include wrapped token address "
        "for liquidity/swap operations (WHBAR for HBAR, WMATIC for MATIC, WETH for ETH)\n\n"
        "4. INCLUDE FLAT TOKENS ARRAY:\n"
        "   - Lists unique tokens\n"
        "   - Shows all chains where token exists\n"
        "   - Includes reference array for quick lookup\n\n"
        "5. INCLUDE SUMMARY SECTION:\n"
        "   - tokens_found: Count of unique tokens\n"
        "   - networks_found: Count of networks\n"
        "   - total_tokens_extracted: Total token-network pairs\n\n"
        "6. VALIDATION:\n"
        "   - query_valid: true if query was understood, false if unclear\n"
        "   - error: null if no errors, else error message string\n\n"
        "7. ERROR HANDLING:\n"
        "   - If user query is invalid or unclear, set query_valid=false and explain in error field\n"
        "   - If token not found, still structure response but mark with unknown fields\n"
        "   - Never leave array fields empty - use empty arrays []\n\n"
        "EXAMPLE QUERIES AND EXPECTED OUTPUTS:\n\n"
        'Query: "Get USDT on Ethereum and Polygon"\n'
        "Output: networks.ethereum.tokens[USDT], networks.polygon.tokens[USDT]\n\n"
        'Query: "What\'s USDC address on Ethereum, Polygon, and Hedera?"\n'
        "Output: networks.ethereum.tokens[USDC], networks.polygon.tokens[USDC], "
        "networks.hedera.tokens[USDC]\n\n"
        'Query: "Show me all stablecoins (USDT, USDC, DAI) across Ethereum and Polygon"\n'
        "Output: networks.ethereum.tokens[USDT, USDC, DAI], "
        "networks.polygon.tokens[USDT, USDC, DAI]\n\n"
        'Query: "Get HBAR on Hedera"\n'
        "Output: networks.hedera.tokens[HBAR with is_native=true]\n\n"
        'Query: "ETH, MATIC, and HBAR on all networks"\n'
        "Output: ETH on ethereum (with WETH wrapped_address), MATIC on polygon "
        "(with WMATIC wrapped_address), HBAR on hedera (with WHBAR wrapped_address)\n\n"
        "CRITICAL RULES:\n"
        "- Output ONLY JSON, no markdown code blocks, no extra text\n"
        "- Do NOT include backticks or markdown formatting\n"
        "- Validate all addresses are in correct format (0x followed by 40 hex chars or "
        "0x0000... for native)\n"
        "- Validate decimals are within reasonable range (6 or 18 most common)\n"
        "- Use exact capitalization for token symbols (USDT not usdt)\n"
        "- If unsure about data, include it but do NOT make up contract addresses\n"
        "- Always include coingecko_id for major tokens for price integration\n"
        "- Include RPC URLs for each network for easy integration\n"
        "- For native tokens (HBAR, MATIC, ETH), ALWAYS include the wrapped token address "
        "in wrapped_address field for liquidity/swap operations\n"
        "- When user requests swap or liquidity for native tokens, include both native and "
        "wrapped versions in the tokens array\n"
        "- Make response immediately parseable by JSON parsers"
    ),
    output_key="token_data",
)


def parse_token_response(session: Session) -> dict:
    """
    Parse token response from single agent.

    Args:
        session: ADK Session with agent output

    Returns:
        Structured token data by network
    """
    try:
        # Get output from agent
        token_data = session.state.get("token_data")

        if not token_data:
            return {
                "networks": {},
                "tokens": [],
                "networks_list": [],
                "query_valid": False,
                "error": "No data extracted",
            }

        # Parse JSON if string
        if isinstance(token_data, str):
            try:
                token_data = json.loads(token_data)
            except json.JSONDecodeError:
                # Fallback: extract JSON from response
                token_data = _extract_json(token_data)

        return token_data

    except Exception as e:
        return {
            "networks": {},
            "tokens": [],
            "query_valid": False,
            "error": str(e),
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
        "networks": {},
        "tokens": [],
        "networks_list": [],
        "query_valid": False,
        "error": "Could not parse JSON from response",
    }


