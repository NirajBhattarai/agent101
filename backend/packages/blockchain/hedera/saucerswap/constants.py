"""SaucerSwap constants and configuration."""

# SaucerSwap Factory Addresses
SAUCERSWAP_FACTORY_V3_MAINNET = "0x0000000000000000000000000000000000000000"  # TODO: Update with actual mainnet address
SAUCERSWAP_FACTORY_V3_TESTNET = "0x0000000000000000000000000000000000000000"  # TODO: Update with actual testnet address

# Network configurations
NETWORKS = {
    "mainnet": {
        "factory": SAUCERSWAP_FACTORY_V3_MAINNET,
        "name": "Hedera Mainnet",
    },
    "testnet": {
        "factory": SAUCERSWAP_FACTORY_V3_TESTNET,
        "name": "Hedera Testnet",
    },
}

