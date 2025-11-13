# Hedera Package

Hedera Hashgraph integration package for Agent101 backend.

## Overview

This package provides integration with the Hedera Hashgraph network, allowing the backend to interact with Hedera services.

## Structure

```
hedera/
├── __init__.py          # Package initialization
├── client.py            # Hedera client implementation
├── transactions.py      # Transaction utilities
└── README.md           # This file
```

## Usage

```python
from packages.blockchain.hedera import HederaClient

# Initialize client
client = HederaClient(
    account_id="0.0.123456",
    private_key="your-private-key"
)

# Connect to network
client.connect()

# Use client...
```

## Dependencies

Add Hedera SDK to `pyproject.toml`:

```toml
dependencies = [
    "hashgraph-sdk>=2.0.0",
]
```

## Development

This package is part of the backend monorepo structure and follows the same development guidelines.

