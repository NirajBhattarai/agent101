"""Token search tools for Token Research Agent."""

import os
from typing import Optional

import requests


def search_token_on_web(token_symbol: str) -> Optional[dict]:
    """
    Search for token information on the web using Google Custom Search.

    Args:
        token_symbol: Token symbol to search for (e.g., "USDT", "WBTC")

    Returns:
        Dictionary with token information including search results, or None if not found
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    search_engine_id = os.getenv("GOOGLE_SEARCH_ENGINE_ID")

    if not api_key or not search_engine_id:
        print("⚠️  Google API key or Search Engine ID not configured. Skipping web search.")
        return None

    try:
        query = f"{token_symbol} token contract address ethereum polygon"
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": api_key,
            "cx": search_engine_id,
            "q": query,
            "num": 5,
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        # Extract relevant information from search results
        results = []
        for item in data.get("items", [])[:3]:
            snippet = item.get("snippet", "")
            title = item.get("title", "")
            results.append({"title": title, "snippet": snippet})

        return {
            "token_symbol": token_symbol.upper(),
            "search_results": results,
            "source": "google_search",
        }
    except Exception as e:
        print(f"❌ Error searching for token {token_symbol}: {e}")
        return None


def search_token_contract_address(token_symbol: str, chain: str) -> Optional[dict]:
    """
    Search for token contract address on a specific chain using CoinGecko API.

    Args:
        token_symbol: Token symbol (e.g., "USDT")
        chain: Chain name (e.g., "ethereum", "polygon", "hedera")

    Returns:
        Dictionary with contract address and token info, or None if not found
    """
    api_key = os.getenv("COINGECKO_API_KEY")

    if not api_key:
        print("⚠️  CoinGecko API key not configured.")
        return None

    try:
        # First, search for the token ID
        search_url = "https://api.coingecko.com/api/v3/search"
        search_params = {"query": token_symbol}
        search_headers = {}
        if api_key:
            if api_key.startswith("CG-"):
                search_headers["x-cg-demo-api-key"] = api_key
            else:
                search_headers["x-cg-pro-api-key"] = api_key

        search_response = requests.get(
            search_url, params=search_params, headers=search_headers, timeout=10
        )
        search_response.raise_for_status()
        search_data = search_response.json()

        if not search_data.get("coins"):
            return None

        # Get the first matching coin
        coin_id = search_data["coins"][0]["id"]

        # Map chain names to CoinGecko platform IDs
        chain_map = {
            "ethereum": "ethereum",
            "polygon": "polygon-pos",
            "bsc": "binance-smart-chain",
            "hedera": "hedera-hashgraph",
        }

        platform_id = chain_map.get(chain.lower())
        if not platform_id:
            return None

        # Get token details
        coin_url = f"https://api.coingecko.com/api/v3/coins/{coin_id}"
        coin_params = {"localization": "false", "tickers": "false"}
        coin_headers = {}
        if api_key:
            if api_key.startswith("CG-"):
                coin_headers["x-cg-demo-api-key"] = api_key
            else:
                coin_headers["x-cg-pro-api-key"] = api_key

        coin_response = requests.get(coin_url, params=coin_params, headers=coin_headers, timeout=10)
        coin_response.raise_for_status()
        coin_data = coin_response.json()

        platforms = coin_data.get("platforms", {})
        contract_address = platforms.get(platform_id)

        if contract_address:
            return {
                "token_symbol": token_symbol.upper(),
                "chain": chain,
                "contract_address": contract_address,
                "token_id": coin_id,
                "name": coin_data.get("name", ""),
                "symbol": coin_data.get("symbol", "").upper(),
            }

        return None
    except Exception as e:
        print(f"❌ Error searching for {token_symbol} on {chain}: {e}")
        return None
