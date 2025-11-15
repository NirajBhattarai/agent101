"""
Token resolver for Swap Agent.

Automatically resolves token addresses using Token Research Agent if not found in constants.
"""

from typing import Any, Optional

from ...token_research.tools.token_search import search_token_contract_address
from .explorer_utils import get_explorer_url


def resolve_token_address(token_symbol: str, chain: str) -> dict[str, Any] | None:
    """
    Resolve token address for a given chain.

    First checks constants, then uses Token Research Agent if not found.

    Args:
        token_symbol: Token symbol (e.g., "LINK", "USDC")
        chain: Chain name ("hedera", "polygon", "ethereum")

    Returns:
        Dictionary with token info including address, or None if not found
    """
    token_symbol_upper = token_symbol.upper()

    # First check constants
    if chain == "hedera":
        from packages.blockchain.hedera.constants import HEDERA_TOKENS

        if token_symbol_upper in HEDERA_TOKENS:
            token_data = HEDERA_TOKENS[token_symbol_upper]
            address_evm = token_data.get("address")
            address_hedera = token_data.get("tokenid")

            # Always try to get accurate decimals from CoinGecko for better precision
            # This is especially important for tokens where constants might have wrong decimals
            decimals = token_data.get("decimals", 18)
            try:
                token_info_online = search_token_contract_address(token_symbol, chain)
                if token_info_online and token_info_online.get("decimals"):
                    # Use decimals from CoinGecko if available (more accurate)
                    decimals = token_info_online.get("decimals", decimals)
                    print(
                        f"📊 Using decimals from CoinGecko for {token_symbol_upper}: {decimals} (was {token_data.get('decimals', 18)} in constants)"
                    )
            except Exception as e:
                print(
                    f"⚠️  Could not fetch decimals from CoinGecko for {token_symbol_upper}: {e}, using constants value"
                )
                # Continue with constants decimals

            result = {
                "symbol": token_symbol_upper,
                "address_evm": address_evm,
                "address_hedera": address_hedera,
                "decimals": decimals,
                "source": "constants",
            }
            # Add explorer URL (use Hedera token ID if available, otherwise EVM address)
            explorer_address = address_hedera or address_evm
            if explorer_address:
                result["explorer_url"] = get_explorer_url(chain, explorer_address, "token")
            return result
    elif chain == "polygon":
        from packages.blockchain.polygon.constants import POLYGON_TOKENS

        if token_symbol_upper in POLYGON_TOKENS:
            token_data = POLYGON_TOKENS[token_symbol_upper]
            address = token_data.get("address")
            result = {
                "symbol": token_symbol_upper,
                "address": address,
                "decimals": token_data.get("decimals", 18),
                "source": "constants",
            }
            # Add explorer URL
            if address:
                result["explorer_url"] = get_explorer_url(chain, address, "token")
            return result
    elif chain == "ethereum":
        from packages.blockchain.ethereum.constants import ETHEREUM_TOKENS

        if token_symbol_upper in ETHEREUM_TOKENS:
            token_data = ETHEREUM_TOKENS[token_symbol_upper]
            address = token_data.get("address")
            result = {
                "symbol": token_symbol_upper,
                "address": address,
                "decimals": token_data.get("decimals", 18),
                "source": "constants",
            }
            # Add explorer URL
            if address:
                result["explorer_url"] = get_explorer_url(chain, address, "token")
            return result

    # Check cache from token discovery
    from packages.blockchain.token_discovery import get_token_for_chain

    cached_token = get_token_for_chain(token_symbol_upper, chain)
    if cached_token:
        if chain == "hedera":
            address_evm = cached_token.get("address")
            result = {
                "symbol": token_symbol_upper,
                "address_evm": address_evm,
                "address_hedera": None,  # Will need to convert EVM to Hedera ID
                "decimals": cached_token.get("decimals", 18),
                "source": "cache",
            }
            # Add explorer URL
            if address_evm:
                result["explorer_url"] = get_explorer_url(chain, address_evm, "token")
            return result
        else:
            address = cached_token.get("address")
            result = {
                "symbol": token_symbol_upper,
                "address": address,
                "decimals": cached_token.get("decimals", 18),
                "source": "cache",
            }
            # Add explorer URL
            if address:
                result["explorer_url"] = get_explorer_url(chain, address, "token")
            return result

    # Not found in constants or cache - use Token Research Agent
    print(
        f"🔍 Token {token_symbol} not found in constants for {chain}, searching via Token Research Agent..."
    )
    token_info = search_token_contract_address(token_symbol, chain)

    if token_info and token_info.get("contract_address"):
        address = token_info.get("contract_address")
        # Get decimals from CoinGecko if available, otherwise use default
        decimals = token_info.get("decimals", 18)

        if chain == "hedera":
            # For Hedera, we need to convert EVM address to Hedera token ID if possible
            from packages.blockchain.hedera.utils import solidity_address_to_token_id

            token_id = solidity_address_to_token_id(address)
            result = {
                "symbol": token_symbol_upper,
                "address_evm": address,
                "address_hedera": token_id,
                "decimals": decimals,  # From CoinGecko
                "source": "token_research",
                "name": token_info.get("name", ""),
            }
            # Add explorer URL (use Hedera token ID if available, otherwise EVM address)
            explorer_address = token_id or address
            if explorer_address:
                result["explorer_url"] = get_explorer_url(chain, explorer_address, "token")
            return result
        else:
            result = {
                "symbol": token_symbol_upper,
                "address": address,
                "decimals": decimals,  # From CoinGecko
                "source": "token_research",
                "name": token_info.get("name", ""),
            }
            # Add explorer URL
            result["explorer_url"] = get_explorer_url(chain, address, "token")
            return result

    return None


def resolve_token_addresses_for_swap(
    token_in_symbol: str, token_out_symbol: str, chain: str
) -> dict[str, Any]:
    """
    Resolve both token addresses for a swap.

    Args:
        token_in_symbol: Token in symbol
        token_out_symbol: Token out symbol
        chain: Chain name

    Returns:
        Dictionary with resolved token addresses and metadata
    """
    token_in_info = resolve_token_address(token_in_symbol, chain)
    token_out_info = resolve_token_address(token_out_symbol, chain)

    result = {
        "token_in_resolved": token_in_info is not None,
        "token_out_resolved": token_out_info is not None,
        "token_in_info": token_in_info,
        "token_out_info": token_out_info,
    }

    if not token_in_info:
        result["error"] = f"Token {token_in_symbol} not found for {chain}"
    if not token_out_info:
        result["error"] = f"Token {token_out_symbol} not found for {chain}"

    return result
