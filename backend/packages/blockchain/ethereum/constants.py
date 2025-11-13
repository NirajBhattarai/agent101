"""Ethereum network constants and token addresses."""

# Ethereum Mainnet Uniswap V3 Factory Address
UNISWAP_V3_FACTORY_MAINNET = "0x1F98431c8aD98523631AE4a59f267346ea31F984"

# Ethereum Sepolia Testnet Uniswap V3 Factory Address
UNISWAP_V3_FACTORY_SEPOLIA = "0x0227628f3F023bb0B980b67D528571c95c6DaC1c"

# Network configurations
NETWORKS = {
    "mainnet": {
        "factory": UNISWAP_V3_FACTORY_MAINNET,
        "name": "Ethereum Mainnet",
        "chain_id": 1,
    },
    "sepolia": {
        "factory": UNISWAP_V3_FACTORY_SEPOLIA,
        "name": "Ethereum Sepolia Testnet",
        "chain_id": 11155111,
    },
}

# Common Ethereum token addresses (Mainnet)
ETHEREUM_TOKENS = {
    "WETH": {
        "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "decimals": 18,
    },
    "USDC": {
        "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0c3606eB48",  # USDC on Ethereum Mainnet
        "decimals": 6,
    },
    "USDT": {
        "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "decimals": 6,
    },
    "DAI": {
        "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        "decimals": 18,
    },
    "WBTC": {
        "address": "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        "decimals": 8,
    },
}

