"""Polygon network constants and token addresses."""

# Polygon Mainnet Uniswap V3 Factory Address
UNISWAP_V3_FACTORY_MAINNET = "0x1F98431c8aD98523631AE4a59f267346ea31F984"

# Polygon Mumbai Testnet Uniswap V3 Factory Address
UNISWAP_V3_FACTORY_MUMBAI = "0x1F98431c8aD98523631AE4a59f267346ea31F984"  # Same as mainnet typically

# Network configurations
NETWORKS = {
    "mainnet": {
        "factory": UNISWAP_V3_FACTORY_MAINNET,
        "name": "Polygon Mainnet",
        "chain_id": 137,
    },
    "mumbai": {
        "factory": UNISWAP_V3_FACTORY_MUMBAI,
        "name": "Polygon Mumbai Testnet",
        "chain_id": 80001,
    },
}

# Common Polygon token addresses (Mainnet)
POLYGON_TOKENS = {
    "WETH": {
        "address": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
        "decimals": 18,
    },
    "USDC": {
        "address": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        "decimals": 6,
    },
    "USDT": {
        "address": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        "decimals": 6,
    },
    "DAI": {
        "address": "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
        "decimals": 18,
    },
    "WMATIC": {
        "address": "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
        "decimals": 18,
    },
}

