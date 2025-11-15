"""
Token discovery service for fetching popular tokens and mapping across chains.

Fetches popular tokens from Ethereum and maps them to Polygon and Hedera.
"""

import os
from typing import Optional

import requests

# In-memory cache for discovered tokens
_TOKEN_CACHE: dict[str, dict] = {}


def get_popular_ethereum_tokens(limit: int = 50) -> list[dict]:
    """
    Fetch popular tokens from Ethereum using CoinGecko API.

    Args:
        limit: Maximum number of tokens to fetch (default: 50)

    Returns:
        List of token dictionaries with symbol, name, and CoinGecko ID
    """
    api_key = os.getenv("COINGECKO_API_KEY")

    if not api_key:
        print("⚠️  CoinGecko API key not configured. Using default popular tokens.")
        return _get_default_popular_tokens()

    try:
        url = "https://api.coingecko.com/api/v3/coins/markets"
        params = {
            "vs_currency": "usd",
            "order": "market_cap_desc",
            "per_page": limit,
            "page": 1,
            "sparkline": False,
        }

        headers = {}
        if api_key.startswith("CG-"):
            headers["x-cg-demo-api-key"] = api_key
        else:
            headers["x-cg-pro-api-key"] = api_key

        response = requests.get(url, params=params, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()

        tokens = []
        for token in data:
            tokens.append(
                {
                    "id": token.get("id", ""),
                    "symbol": token.get("symbol", "").upper(),
                    "name": token.get("name", ""),
                    "market_cap": token.get("market_cap", 0),
                    "market_cap_rank": token.get("market_cap_rank", 999),
                }
            )

        return tokens
    except Exception as e:
        print(f"❌ Error fetching popular tokens from CoinGecko: {e}")
        return _get_default_popular_tokens()


def _get_default_popular_tokens() -> list[dict]:
    """Get default list of popular tokens if API is unavailable."""
    return [
        {"symbol": "BTC", "name": "Bitcoin", "id": "bitcoin", "market_cap_rank": 1},
        {"symbol": "ETH", "name": "Ethereum", "id": "ethereum", "market_cap_rank": 2},
        {"symbol": "USDT", "name": "Tether", "id": "tether", "market_cap_rank": 3},
        {"symbol": "BNB", "name": "BNB", "id": "binancecoin", "market_cap_rank": 4},
        {"symbol": "SOL", "name": "Solana", "id": "solana", "market_cap_rank": 5},
        {"symbol": "USDC", "name": "USD Coin", "id": "usd-coin", "market_cap_rank": 6},
        {"symbol": "XRP", "name": "XRP", "id": "ripple", "market_cap_rank": 7},
        {"symbol": "DOGE", "name": "Dogecoin", "id": "dogecoin", "market_cap_rank": 8},
        {"symbol": "ADA", "name": "Cardano", "id": "cardano", "market_cap_rank": 9},
        {"symbol": "TRX", "name": "TRON", "id": "tron", "market_cap_rank": 10},
        {"symbol": "MATIC", "name": "Polygon", "id": "matic-network", "market_cap_rank": 11},
        {"symbol": "DOT", "name": "Polkadot", "id": "polkadot", "market_cap_rank": 12},
        {"symbol": "LINK", "name": "Chainlink", "id": "chainlink", "market_cap_rank": 13},
        {
            "symbol": "WBTC",
            "name": "Wrapped Bitcoin",
            "id": "wrapped-bitcoin",
            "market_cap_rank": 14,
        },
        {"symbol": "UNI", "name": "Uniswap", "id": "uniswap", "market_cap_rank": 15},
        {"symbol": "DAI", "name": "Dai Stablecoin", "id": "dai", "market_cap_rank": 16},
        {"symbol": "AAVE", "name": "Aave", "id": "aave", "market_cap_rank": 17},
        {"symbol": "AVAX", "name": "Avalanche", "id": "avalanche-2", "market_cap_rank": 18},
        {"symbol": "SHIB", "name": "Shiba Inu", "id": "shiba-inu", "market_cap_rank": 19},
        {"symbol": "ATOM", "name": "Cosmos", "id": "cosmos", "market_cap_rank": 20},
    ]


def get_token_addresses_across_chains(coin_id: str) -> dict[str, str | None]:
    """
    Get token contract addresses across Ethereum, Polygon, and Hedera.

    Args:
        coin_id: CoinGecko coin ID (e.g., "ethereum", "usd-coin")

    Returns:
        Dictionary with addresses for each chain:
        {
            "ethereum": "0x...",
            "polygon": "0x...",
            "hedera": "0x..." or "0.0.123456"
        }
    """
    api_key = os.getenv("COINGECKO_API_KEY")

    if not api_key:
        return {"ethereum": None, "polygon": None, "hedera": None}

    try:
        coin_url = f"https://api.coingecko.com/api/v3/coins/{coin_id}"
        coin_params = {"localization": "false", "tickers": "false"}

        headers = {}
        if api_key.startswith("CG-"):
            headers["x-cg-demo-api-key"] = api_key
        else:
            headers["x-cg-pro-api-key"] = api_key

        response = requests.get(coin_url, params=coin_params, headers=headers, timeout=15)
        response.raise_for_status()
        coin_data = response.json()

        platforms = coin_data.get("platforms", {})

        # Map CoinGecko platform IDs to our chain names
        addresses = {
            "ethereum": platforms.get("ethereum"),
            "polygon": platforms.get("polygon-pos"),
            "hedera": platforms.get("hedera-hashgraph"),
        }

        # Get decimals if available
        detail_platforms = coin_data.get("detail_platforms", {})
        decimals = {}
        if "ethereum" in detail_platforms:
            decimals["ethereum"] = detail_platforms["ethereum"].get("decimal_place", 18)
        if "polygon-pos" in detail_platforms:
            decimals["polygon"] = detail_platforms["polygon-pos"].get("decimal_place", 18)
        if "hedera-hashgraph" in detail_platforms:
            decimals["hedera"] = detail_platforms["hedera-hashgraph"].get("decimal_place", 8)

        return {
            "ethereum": addresses["ethereum"],
            "polygon": addresses["polygon"],
            "hedera": addresses["hedera"],
            "decimals": decimals,
            "name": coin_data.get("name", ""),
            "symbol": coin_data.get("symbol", "").upper(),
        }
    except Exception as e:
        print(f"❌ Error fetching token addresses for {coin_id}: {e}")
        return {"ethereum": None, "polygon": None, "hedera": None}


def discover_and_cache_popular_tokens(limit: int = 5) -> dict[str, dict]:
    """
    Discover popular tokens from Ethereum and map them across all chains.
    Store results in memory cache.

    Args:
        limit: Maximum number of tokens to discover (default: 5 to avoid rate limits)

    Returns:
        Dictionary mapping token symbols to their chain addresses
    """
    global _TOKEN_CACHE

    # Limit to 5 to avoid CoinGecko rate limits
    actual_limit = min(limit, 5)
    print(f"🔍 Discovering top {actual_limit} popular tokens from Ethereum...")

    popular_tokens = get_popular_ethereum_tokens(limit=actual_limit)
    discovered_tokens = {}

    for token in popular_tokens:
        symbol = token["symbol"]
        coin_id = token["id"]

        print(f"  📍 Fetching addresses for {symbol} ({coin_id})...")

        addresses = get_token_addresses_across_chains(coin_id)

        if any(addresses.get(chain) for chain in ["ethereum", "polygon", "hedera"]):
            discovered_tokens[symbol] = {
                "symbol": symbol,
                "name": addresses.get("name", token.get("name", "")),
                "coin_id": coin_id,
                "ethereum": addresses.get("ethereum"),
                "polygon": addresses.get("polygon"),
                "hedera": addresses.get("hedera"),
                "decimals": addresses.get("decimals", {}),
                "market_cap_rank": token.get("market_cap_rank", 999),
            }

    # Update cache
    _TOKEN_CACHE.update(discovered_tokens)

    print(f"✅ Discovered {len(discovered_tokens)} tokens with addresses across chains")

    return discovered_tokens


def get_cached_tokens() -> dict[str, dict]:
    """
    Get all cached tokens.

    Returns:
        Dictionary of cached tokens
    """
    return _TOKEN_CACHE.copy()


def get_token_for_chain(symbol: str, chain: str) -> dict | None:
    """
    Get token address for a specific chain from cache.

    Args:
        symbol: Token symbol (e.g., "USDC")
        chain: Chain name ("ethereum", "polygon", "hedera")

    Returns:
        Dictionary with token info and address, or None if not found
    """
    symbol_upper = symbol.upper()
    token = _TOKEN_CACHE.get(symbol_upper)

    if not token:
        return None

    address = token.get(chain.lower())
    if not address:
        return None

    return {
        "symbol": symbol_upper,
        "name": token.get("name", ""),
        "address": address,
        "chain": chain.lower(),
        "decimals": token.get("decimals", {}).get(chain.lower(), 18),
    }


def get_all_tokens_for_chain(chain: str) -> list[dict]:
    """
    Get all cached tokens available on a specific chain.

    Args:
        chain: Chain name ("ethereum", "polygon", "hedera")

    Returns:
        List of token dictionaries with addresses on the specified chain
    """
    chain_lower = chain.lower()
    tokens = []

    for symbol, token_data in _TOKEN_CACHE.items():
        address = token_data.get(chain_lower)
        if address:
            tokens.append(
                {
                    "symbol": symbol,
                    "name": token_data.get("name", ""),
                    "address": address,
                    "chain": chain_lower,
                    "decimals": token_data.get("decimals", {}).get(chain_lower, 18),
                    "market_cap_rank": token_data.get("market_cap_rank", 999),
                }
            )

    # Sort by market cap rank
    tokens.sort(key=lambda x: x.get("market_cap_rank", 999))

    return tokens


def clear_cache() -> None:
    """Clear the token cache."""
    global _TOKEN_CACHE
    _TOKEN_CACHE = {}
    print("🗑️  Token cache cleared")
