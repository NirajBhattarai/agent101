"""
Hedera token addresses and IDs.

Comprehensive list of Hedera token addresses (Hedera format) and EVM addresses.

Each token has: address (EVM), decimals, and tokenid (Hedera format).
"""

# Hedera tokens - Dictionary format with address, decimals, and tokenid
# tokenid is hedera token id (0.0.123456) and tokenaddress is evm address (0x...)

HEDERA_TOKENS = {
    "HBAR": {
        "address": "0x0000000000000000000000000000000000000000",  # EVM address
        "decimals": 8,
        "tokenid": "0.0.0",  # Native token
    },
    "USDC": {
        "address": "0x000000000000000000000000000000000006f89a",
        "decimals": 6,
        "tokenid": "0.0.456858",
    },
    "USDT": {
        "address": "0x0000000000000000000000000000000000101b07",
        "decimals": 6,
        "tokenid": "0.0.1055472",
    },
    "SAUCE": {
        "address": "0x00000000000000000000000000000000000b2ad5",
        "decimals": 8,
        "tokenid": "0.0.731861",
    },
    "JAM": {
        "address": "0x000000000000000000000000000000000001f3f5",
        "decimals": 8,
        "tokenid": "0.0.127877",
    },
    "DOV": {
        "address": "0x0000000000000000000000000000000000098779",
        "decimals": 8,
        "tokenid": "0.0.624505",
    },
    "HBARX": {
        "address": "0x00000000000000000000000000000000000c4200",
        "decimals": 8,
        "tokenid": "0.0.803264",
    },
    "SHIBR": {
        "address": "0x00000000000000000000000000000000000b76ee",
        "decimals": 8,
        "tokenid": "0.0.751086",
    },
    "SKUX": {
        "address": "0x00000000000000000000000000000000000766af",
        "decimals": 8,
        "tokenid": "0.0.485527",
    },
    "TNG": {
        "address": "0x00000000000000000000000000000000000c22a7",
        "decimals": 8,
        "tokenid": "0.0.795239",
    },
    "HTC": {
        "address": "0x00000000000000000000000000000000000c26fd",
        "decimals": 8,
        "tokenid": "0.0.796381",
    },
    "WHBAR": {
        "address": "0x0000000000000000000000000000000000163B5a",
        "decimals": 8,
        "tokenid": "0.0.1456986",
    },
    "ETH": {
        "address": "0x000000000000000000000000000000000008437c",
        "decimals": 18,
        "tokenid": "0.0.541564",
    },
    "WETH": {
        "address": "0x000000000000000000000000000000000008437c",
        "decimals": 18,
        "tokenid": "0.0.541564",  # Same as ETH
    },
    "BTC": {
        "address": "0x0000000000000000000000000000000000101b07",
        "decimals": 8,
        "tokenid": "0.0.1055483",
    },
    "LINK": {
        "address": "0x0000000000000000000000000000000000101b07",
        "decimals": 18,
        "tokenid": "0.0.1055495",
    },
    "AVAX": {
        "address": "0x000000000000000000000000000000000011a79c",
        "decimals": 18,
        "tokenid": "0.0.1157020",
    },
}

# Legacy format mappings for backward compatibility
# Hedera tokens - Hedera format addresses (0.0.123456) - for balance checking
HEDERA_TOKEN_IDS = {symbol: token["tokenid"] for symbol, token in HEDERA_TOKENS.items()}

# Hedera token EVM address mapping - for contract calls
HEDERA_TOKEN_EVM_ADDRESSES = {
    symbol: token["address"] for symbol, token in HEDERA_TOKENS.items()
}

