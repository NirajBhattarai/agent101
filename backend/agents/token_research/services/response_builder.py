"""Response builder for Token Research Agent."""

from typing import Optional

from ..core.models.token_research import (
    TokenDiscoveryResult,
    TokenInfo,
    TokenResearchResponse,
    TokenSearchResult,
)
from ..tools.token_discovery import discover_popular_tokens
from ..tools.token_search import search_token_contract_address, search_token_on_web


def build_token_search_response(token_symbol: str, chain: Optional[str] = None) -> dict:
    """
    Build response for token search query.

    Args:
        token_symbol: Token symbol to search for
        chain: Optional chain name to search on specific chain

    Returns:
        Dictionary with search results
    """
    tokens = []

    # Search on specific chain if provided
    if chain:
        token_info = search_token_contract_address(token_symbol, chain)
        if token_info:
            tokens.append(
                TokenInfo(
                    symbol=token_info.get("symbol", token_symbol.upper()),
                    name=token_info.get("name", ""),
                    address=token_info.get("contract_address"),
                    chain=chain,
                    coin_id=token_info.get("token_id"),
                )
            )
    else:
        # Search across all chains
        for chain_name in ["ethereum", "polygon", "hedera"]:
            token_info = search_token_contract_address(token_symbol, chain_name)
            if token_info:
                tokens.append(
                    TokenInfo(
                        symbol=token_info.get("symbol", token_symbol.upper()),
                        name=token_info.get("name", ""),
                        address=token_info.get("contract_address"),
                        chain=chain_name,
                        coin_id=token_info.get("token_id"),
                    )
                )

    # If no results from CoinGecko, try web search
    if not tokens:
        web_result = search_token_on_web(token_symbol)
        if web_result:
            # Web search doesn't provide addresses, but provides search results
            return {
                "type": "token_research",
                "query_type": "search",
                "token_symbol": token_symbol.upper(),
                "chain": chain,
                "search_result": {
                    "token_symbol": token_symbol.upper(),
                    "tokens": [],
                    "source": "web_search",
                    "web_results": web_result.get("search_results", []),
                },
                "error": None,
            }

    search_result = TokenSearchResult(
        token_symbol=token_symbol.upper(),
        tokens=tokens,
        source="coingecko" if tokens else "web_search",
    )

    response = TokenResearchResponse(
        query_type="search",
        token_symbol=token_symbol.upper(),
        chain=chain,
        search_result=search_result,
    )

    return response.model_dump(exclude_none=True)


def build_token_discovery_response(limit: int = 5) -> dict:
    """
    Build response for token discovery query.

    Args:
        limit: Maximum number of tokens to discover

    Returns:
        Dictionary with discovery results
    """
    try:
        discovered = discover_popular_tokens(limit=limit)

        tokens = []
        tokens_by_chain = {"ethereum": [], "polygon": [], "hedera": []}

        for symbol, token_data in discovered.items():
            token_info = TokenInfo(
                symbol=symbol,
                name=token_data.get("name", ""),
                coin_id=token_data.get("coin_id"),
                market_cap_rank=token_data.get("market_cap_rank"),
            )
            tokens.append(token_info)

            # Group by chain
            for chain in ["ethereum", "polygon", "hedera"]:
                address = token_data.get(chain)
                if address:
                    chain_token = TokenInfo(
                        symbol=symbol,
                        name=token_data.get("name", ""),
                        address=address,
                        chain=chain,
                        decimals=token_data.get("decimals", {}).get(chain),
                        coin_id=token_data.get("coin_id"),
                        market_cap_rank=token_data.get("market_cap_rank"),
                    )
                    tokens_by_chain[chain].append(chain_token.model_dump(exclude_none=True))

        discovery_result = TokenDiscoveryResult(
            total_tokens=len(tokens),
            tokens_by_chain=tokens_by_chain,
            tokens=[t.model_dump(exclude_none=True) for t in tokens],
        )

        response = TokenResearchResponse(
            query_type="discovery",
            discovery_result=discovery_result,
        )

        return response.model_dump(exclude_none=True)
    except Exception as e:
        print(f"❌ Error in token discovery: {e}")
        return {
            "type": "token_research",
            "query_type": "discovery",
            "error": f"Failed to discover tokens: {str(e)}",
        }
