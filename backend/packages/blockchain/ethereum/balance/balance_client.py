"""Ethereum balance client for getting token and native ETH balances."""

import os
from typing import Optional
from web3 import Web3
from web3.providers import HTTPProvider

from packages.blockchain.ethereum.constants import ETHEREUM_TOKENS
from packages.blockchain.dex.abis.erc20 import ERC20_ABI

ETHEREUM_MAINNET_RPC = os.getenv("ETHEREUM_MAINNET_RPC", "https://eth.llamarpc.com")


def _get_web3_instance() -> Web3:
    """Get Web3 instance for Ethereum."""
    return Web3(HTTPProvider(ETHEREUM_MAINNET_RPC))


def get_native_eth_balance(account_address: str) -> dict:
    """
    Get native ETH balance for an account.
    
    Args:
        account_address: Account address (0x...)
        
    Returns:
        Dictionary with balance information
    """
    try:
        w3 = _get_web3_instance()
        
        # Check connection first
        if not w3.is_connected():
            return {
                "token_type": "native",
                "token_symbol": "ETH",
                "token_address": "0x0",
                "balance": "0",
                "balance_raw": "0",
                "decimals": 18,
                "error": "Failed to connect to Ethereum RPC",
            }
        
        if not w3.is_address(account_address):
            return {
                "token_type": "native",
                "token_symbol": "ETH",
                "token_address": "0x0",
                "balance": "0",
                "balance_raw": "0",
                "decimals": 18,
                "error": f"Invalid address: {account_address}",
            }
        
        account_address = w3.to_checksum_address(account_address)
        balance_raw = w3.eth.get_balance(account_address)
        balance = balance_raw / (10**18)
        
        return {
            "token_type": "native",
            "token_symbol": "ETH",
            "token_address": "0x0",
            "balance": str(balance),
            "balance_raw": str(balance_raw),
            "decimals": 18,
        }
    except Exception as e:
        return {
            "token_type": "native",
            "token_symbol": "ETH",
            "token_address": "0x0",
            "balance": "0",
            "balance_raw": "0",
            "decimals": 18,
            "error": f"Error fetching ETH balance: {str(e)}",
        }


def get_token_balance_ethereum(account_address: str, token_symbol: str) -> dict:
    """
    Get token balance for an account on Ethereum.
    
    Args:
        account_address: Account address (0x...)
        token_symbol: Token symbol (e.g., "USDC", "USDT", "WETH")
        
    Returns:
        Dictionary with balance information
    """
    try:
        w3 = _get_web3_instance()
        
        # Check connection first
        if not w3.is_connected():
            return {
                "token_symbol": token_symbol,
                "token_address": "0x0",
                "balance": "0",
                "balance_raw": "0",
                "decimals": 18,
                "error": "Failed to connect to Ethereum RPC",
            }
        
        if not w3.is_address(account_address):
            return {
                "token_symbol": token_symbol,
                "token_address": "0x0",
                "balance": "0",
                "balance_raw": "0",
                "decimals": 18,
                "error": f"Invalid address: {account_address}",
            }
        
        account_address = w3.to_checksum_address(account_address)
        
        # Get token info from constants
        if token_symbol.upper() not in ETHEREUM_TOKENS:
            return {
                "token_symbol": token_symbol,
                "token_address": "0x0",
                "balance": "0",
                "balance_raw": "0",
                "decimals": 18,
                "error": f"Token {token_symbol} not found in ETHEREUM_TOKENS",
            }
        
        token_info = ETHEREUM_TOKENS[token_symbol.upper()]
        token_address = w3.to_checksum_address(token_info["address"])
        decimals = token_info.get("decimals", 18)
        
        # Get balance from contract with timeout
        try:
            token_contract = w3.eth.contract(address=token_address, abi=ERC20_ABI)
            balance_raw = token_contract.functions.balanceOf(account_address).call()
            balance = balance_raw / (10**decimals)
            
            return {
                "token_symbol": token_symbol.upper(),
                "token_address": token_address,
                "balance": str(balance),
                "balance_raw": str(balance_raw),
                "decimals": decimals,
            }
        except Exception as contract_error:
            # More specific error for contract calls
            error_msg = f"Failed to fetch {token_symbol} balance: {str(contract_error)}"
            return {
                "token_symbol": token_symbol.upper(),
                "token_address": token_address,
                "balance": "0",
                "balance_raw": "0",
                "decimals": decimals,
                "error": error_msg,
            }
    except Exception as e:
        # Catch-all for other errors
        error_msg = f"Error fetching {token_symbol} balance: {str(e)}"
        return {
            "token_symbol": token_symbol,
            "token_address": "0x0",
            "balance": "0",
            "balance_raw": "0",
            "decimals": 18,
            "error": error_msg,
        }


def get_multiple_token_balances_ethereum(
    account_address: str, token_symbols: list[str]
) -> list[dict]:
    """
    Get balances for multiple tokens on Ethereum.
    
    Args:
        account_address: Account address (0x...)
        token_symbols: List of token symbols
        
    Returns:
        List of balance dictionaries
    """
    results = []
    for symbol in token_symbols:
        result = get_token_balance_ethereum(account_address, symbol)
        results.append(result)
    return results

