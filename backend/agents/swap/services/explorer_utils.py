"""
Blockchain explorer URL utilities for Swap Agent.

Generates explorer links for token addresses and transactions.
"""


def get_explorer_url(chain: str, address: str, link_type: str = "token") -> str:
    """
    Get blockchain explorer URL for a token address or transaction.

    Args:
        chain: Chain name ("hedera", "polygon", "ethereum")
        address: Token address or transaction hash
        link_type: Type of link ("token" or "tx")

    Returns:
        Explorer URL string
    """
    if chain == "hedera":
        if link_type == "token":
            # HashScan token page
            return f"https://hashscan.io/mainnet/token/{address}"
        else:  # transaction
            return f"https://hashscan.io/mainnet/transaction/{address}"
    elif chain == "polygon":
        if link_type == "token":
            # PolygonScan token page
            return f"https://polygonscan.com/token/{address}"
        else:  # transaction
            return f"https://polygonscan.com/tx/{address}"
    elif chain == "ethereum":
        if link_type == "token":
            # Etherscan token page
            return f"https://etherscan.io/token/{address}"
        else:  # transaction
            return f"https://etherscan.io/tx/{address}"
    else:
        return ""
