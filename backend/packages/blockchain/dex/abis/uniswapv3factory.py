"""Uniswap V3 Factory ABI.

This ABI is compatible with:
- SaucerSwap (Hedera) - Uniswap V3 fork
- Uniswap V3 (Ethereum, Polygon, Arbitrum, etc.)
- PancakeSwap V3 (BSC)
- Other Uniswap V3 forks
"""

UNISWAP_V3_FACTORY_ABI = [
    {
        "type": "constructor",
        "stateMutability": "undefined",
        "payable": False,
        "inputs": [],
    },
    {
        "type": "event",
        "anonymous": False,
        "name": "FeeAmountEnabled",
        "inputs": [
            {"type": "uint24", "name": "fee", "indexed": True},
            {"type": "int24", "name": "tickSpacing", "indexed": True},
        ],
    },
    {
        "type": "event",
        "anonymous": False,
        "name": "PoolCreated",
        "inputs": [
            {"type": "address", "name": "token0", "indexed": True},
            {"type": "address", "name": "token1", "indexed": True},
            {"type": "uint24", "name": "fee", "indexed": True},
            {"type": "int24", "name": "tickSpacing", "indexed": False},
            {"type": "address", "name": "pool", "indexed": False},
        ],
    },
    {
        "type": "function",
        "name": "collectRent",
        "constant": False,
        "payable": False,
        "inputs": [],
        "outputs": [],
    },
    {
        "type": "function",
        "name": "createPool",
        "constant": False,
        "stateMutability": "payable",
        "payable": True,
        "inputs": [
            {"type": "address", "name": "tokenA"},
            {"type": "address", "name": "tokenB"},
            {"type": "uint24", "name": "fee"},
        ],
        "outputs": [{"type": "address", "name": "pool"}],
    },
    {
        "type": "function",
        "name": "enableFeeAmount",
        "constant": False,
        "payable": False,
        "inputs": [
            {"type": "uint24", "name": "fee"},
            {"type": "int24", "name": "tickSpacing"},
        ],
        "outputs": [],
    },
    {
        "type": "function",
        "name": "feeAmountTickSpacing",
        "constant": True,
        "stateMutability": "view",
        "payable": False,
        "inputs": [{"type": "uint24", "name": ""}],
        "outputs": [{"type": "int24", "name": ""}],
    },
    {
        "type": "function",
        "name": "getPool",
        "constant": True,
        "stateMutability": "view",
        "payable": False,
        "inputs": [
            {"type": "address", "name": ""},
            {"type": "address", "name": ""},
            {"type": "uint24", "name": ""},
        ],
        "outputs": [{"type": "address", "name": ""}],
    },
    {
        "type": "function",
        "name": "mintFee",
        "constant": True,
        "stateMutability": "view",
        "payable": False,
        "inputs": [],
        "outputs": [{"type": "uint256", "name": ""}],
    },
    {
        "type": "function",
        "name": "owner",
        "constant": True,
        "stateMutability": "view",
        "payable": False,
        "inputs": [],
        "outputs": [{"type": "address", "name": ""}],
    },
    {
        "type": "function",
        "name": "parameters",
        "constant": True,
        "stateMutability": "view",
        "payable": False,
        "inputs": [],
        "outputs": [
            {"type": "address", "name": "factory"},
            {"type": "address", "name": "token0"},
            {"type": "address", "name": "token1"},
            {"type": "uint24", "name": "fee"},
            {"type": "int24", "name": "tickSpacing"},
        ],
    },
    {
        "type": "function",
        "name": "poolCreateFee",
        "constant": True,
        "stateMutability": "view",
        "payable": False,
        "inputs": [],
        "outputs": [{"type": "uint256", "name": ""}],
    },
    {
        "type": "function",
        "name": "rentPayer",
        "constant": True,
        "stateMutability": "view",
        "payable": False,
        "inputs": [],
        "outputs": [{"type": "address", "name": ""}],
    },
    {
        "type": "function",
        "name": "setMintFee",
        "constant": False,
        "payable": False,
        "inputs": [{"type": "uint256", "name": "_mintFee"}],
        "outputs": [],
    },
    {
        "type": "function",
        "name": "setOwner",
        "constant": False,
        "payable": False,
        "inputs": [{"type": "address", "name": "_owner"}],
        "outputs": [],
    },
    {
        "type": "function",
        "name": "setPoolCreateFee",
        "constant": False,
        "payable": False,
        "inputs": [{"type": "uint256", "name": "_poolCreateFee"}],
        "outputs": [],
    },
    {
        "type": "function",
        "name": "setRentPayer",
        "constant": False,
        "payable": False,
        "inputs": [{"type": "address", "name": "_rentPayer"}],
        "outputs": [],
    },
]

