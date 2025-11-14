"""Hedera balance client for getting token and native HBAR balances."""

import os
from typing import Optional
import requests

from packages.blockchain.hedera.constants import HEDERA_TOKENS

# Use public Hedera Mirror Node API for mainnet
HEDERA_MAINNET_RPC = os.getenv("HEDERA_MAINNET_RPC", "https://mainnet-public.mirrornode.hedera.com")
HEDERA_TESTNET_RPC = os.getenv("HEDERA_TESTNET_RPC", "https://testnet.hashio.io/api")


def get_hedera_api_base(network: str = "mainnet") -> str:
    """
    Get Hedera API base URL for the specified network.
    
    Args:
        network: Network name ("mainnet" or "testnet")
        
    Returns:
        API base URL (always mainnet for now)
    """
    # Always use mainnet
    return HEDERA_MAINNET_RPC


def resolve_hedera_account_id(account_identifier: str, api_base: str) -> Optional[str]:
    """
    Resolve account identifier to Hedera account ID format (0.0.123456).
    
    Args:
        account_identifier: Account ID in any format (0.0.123456 or 0x...)
        api_base: Hedera API base URL
        
    Returns:
        Hedera account ID in format 0.0.123456, or None if cannot be resolved
    """
    # If already in Hedera format, return as is
    if account_identifier.count(".") == 2:
        return account_identifier
    
    # If EVM address, try to resolve to account ID
    if account_identifier.startswith("0x"):
        try:
            # Use Mirror Node API to resolve EVM address to account ID
            response = requests.get(
                f"{api_base}/api/v1/accounts/{account_identifier}",
                timeout=10,
            )
            if response.status_code == 200:
                data = response.json()
                if "account" in data:
                    account_id = data["account"]
                    # Extract account ID from response (format: "0.0.123456")
                    # Response structure: { "account": "0.0.10083096", ... }
                    if isinstance(account_id, str) and account_id.count(".") == 2:
                        return account_id
                    # Handle nested case if it exists
                    if isinstance(account_id, dict) and "account" in account_id:
                        nested_id = account_id["account"]
                        if isinstance(nested_id, str) and nested_id.count(".") == 2:
                            return nested_id
            # If 404, the EVM address doesn't correspond to a Hedera account
            elif response.status_code == 404:
                return None
        except Exception:
            pass
    
    # Fallback: return None if cannot resolve
    return None


def get_account_identifier_for_api(account_address: str, account_id: Optional[str]) -> str:
    """
    Get account identifier for API calls (prefers EVM format if available).
    
    Args:
        account_address: Original account address
        account_id: Resolved account ID (can be None)
    
    Returns:
        Account identifier to use for API calls
    """
    # Prefer EVM format if available
    if account_address.startswith("0x"):
        return account_address
    # Use account_id if available, otherwise fallback to account_address
    return account_id if account_id else account_address


def get_native_hbar_balance(account_identifier: str, api_base: str) -> dict:
    """
    Get native HBAR balance for an account.
    
    Args:
        account_identifier: Account ID (0.0.123456) or EVM address (0x...)
        api_base: Hedera API base URL
        
    Returns:
        Dictionary with balance information
    """
    try:
        # If already in Hedera format, use it directly
        if account_identifier.count(".") == 2:
            account_id = account_identifier
        else:
            # Resolve to account ID if needed (for EVM addresses)
            account_id = resolve_hedera_account_id(account_identifier, api_base)
            
            # If account_id is None, the EVM address doesn't correspond to a Hedera account
            if account_id is None:
                return {
                    "token_type": "native",
                    "token_symbol": "HBAR",
                    "token_address": "0.0.0",
                    "balance": "0",
                    "balance_raw": "0",
                    "decimals": 8,
                    "error": f"EVM address {account_identifier} does not correspond to a Hedera account (HTTP 404)",
                }
        
        # Use Mirror Node API with account ID
        api_url = f"{api_base}/api/v1/accounts/{account_id}"
        response = requests.get(api_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            # Extract balance from the response structure
            # Response structure: { "account": "0.0.10083096", "balance": { "balance": 1249347801 } }
            if "balance" in data:
                balance_obj = data["balance"]
                if isinstance(balance_obj, dict) and "balance" in balance_obj:
                    balance_raw = int(balance_obj["balance"])
                    balance = balance_raw / (10**8)  # HBAR has 8 decimals
                    
                    return {
                        "token_type": "native",
                        "token_symbol": "HBAR",
                        "token_address": "0.0.0",
                        "balance": str(balance),
                        "balance_raw": str(balance_raw),
                        "decimals": 8,
                    }
            else:
                # Log for debugging
                print(f"⚠️ Warning: No 'balance' key in response for {account_id}")
                print(f"Response keys: {list(data.keys())}")
                return {
                    "token_type": "native",
                    "token_symbol": "HBAR",
                    "token_address": "0.0.0",
                    "balance": "0",
                    "balance_raw": "0",
                    "decimals": 8,
                    "error": f"No balance found in response. Response keys: {list(data.keys())}",
                }
        
        # Log error for debugging
        print(f"❌ Error fetching balance for {account_id}: HTTP {response.status_code}")
        print(f"URL: {api_url}")
        try:
            error_data = response.json()
            print(f"Error response: {error_data}")
        except:
            print(f"Error response text: {response.text[:200]}")
        
        return {
            "token_type": "native",
            "token_symbol": "HBAR",
            "token_address": "0.0.0",
            "balance": "0",
            "balance_raw": "0",
            "decimals": 8,
            "error": f"Failed to fetch balance: HTTP {response.status_code}",
        }
    except Exception as e:
        return {
            "token_type": "native",
            "token_symbol": "HBAR",
            "token_address": "0.0.0",
            "balance": "0",
            "balance_raw": "0",
            "decimals": 8,
            "error": str(e),
        }


def get_token_balance_hedera(account_id: str, token_symbol: str) -> dict:
    """
    Get token balance for an account on Hedera.
    
    Args:
        account_id: Hedera account ID (0.0.123456)
        token_symbol: Token symbol (e.g., "USDC", "USDT", "HBAR")
        
    Returns:
        Dictionary with balance information
    """
    try:
        # Get token info from constants
        if token_symbol.upper() not in HEDERA_TOKENS:
            return {
                "token_symbol": token_symbol,
                "token_address": "0.0.0",
                "balance": "0",
                "balance_raw": "0",
                "decimals": 6,
                "error": f"Token {token_symbol} not found in HEDERA_TOKENS",
            }
        
        token_info = HEDERA_TOKENS[token_symbol.upper()]
        token_id = token_info["tokenid"]
        decimals = token_info.get("decimals", 6)
        
        # Use Mirror Node API to get token balance (always mainnet)
        api_base = get_hedera_api_base("mainnet")
        api_url = f"{api_base}/api/v1/accounts/{account_id}/tokens"
        response = requests.get(api_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            tokens = data.get("tokens", [])
            
            # Find matching token
            for token in tokens:
                if token.get("token_id") == token_id:
                    balance_raw = int(token.get("balance", 0))
                    balance = balance_raw / (10**decimals)
                    
                    return {
                        "token_symbol": token_symbol.upper(),
                        "token_address": token_id,
                        "balance": str(balance),
                        "balance_raw": str(balance_raw),
                        "decimals": decimals,
                    }
        
        # Token not found or balance is 0
        return {
            "token_symbol": token_symbol.upper(),
            "token_address": token_id,
            "balance": "0",
            "balance_raw": "0",
            "decimals": decimals,
        }
    except Exception as e:
        return {
            "token_symbol": token_symbol,
            "token_address": "0.0.0",
            "balance": "0",
            "balance_raw": "0",
            "decimals": 6,
            "error": str(e),
        }


def get_multiple_token_balances_hedera(
    account_id: str, token_symbols: list[str]
) -> list[dict]:
    """
    Get balances for multiple tokens on Hedera.
    
    Args:
        account_id: Hedera account ID (0.0.123456)
        token_symbols: List of token symbols
        
    Returns:
        List of balance dictionaries
    """
    results = []
    for symbol in token_symbols:
        result = get_token_balance_hedera(account_id, symbol)
        results.append(result)
    return results

