# Agent101 Backend

A multi-agent system for DeFi operations across Ethereum, Polygon, and Hedera networks. The backend consists of specialized agents that coordinate to handle balance queries, liquidity analysis, token swaps, sentiment analysis, and trading recommendations.

## 🏗️ Architecture

The backend follows a **multi-agent orchestration pattern** with clear separation between agents, shared packages, and communication protocols.

```
┌─────────────────────────────────────────────────────────────┐
│              Orchestrator Agent (Port 9000)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Google ADK + AG-UI Protocol Adapter                  │  │
│  │  - Receives queries from frontend                      │  │
│  │  - Coordinates specialized agents                      │  │
│  │  - Aggregates responses                                │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────┬───────────┬───────────┬───────────┬─────────────┘
            │           │           │           │
            │ A2A       │ A2A       │ A2A       │ A2A
            │ Protocol  │ Protocol  │ Protocol  │ Protocol
    ┌───────▼───┐ ┌─────▼────┐ ┌───▼────┐ ┌───▼──────┐
    │  Balance  │ │Liquidity │ │  Swap  │ │Sentiment│
    │  Agent    │ │  Agent   │ │ Agent  │ │ Agent   │
    │  (9997)   │ │  (9998)  │ │ (9999) │ │(10000)  │
    └───────┬───┘ └─────┬────┘ └───┬────┘ └───┬──────┘
            │           │           │           │
            └───────────┴───────────┴───────────┘
                           │
                           │ Direct Tool Calls
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Blockchain Packages (Shared)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Ethereum    │  │   Polygon    │  │    Hedera    │      │
│  │  - Uniswap   │  │   - Uniswap  │  │  - SaucerSwap│      │
│  │  - Balance   │  │   - Balance  │  │  - Balance   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
backend/
├── agents/                    # Agent implementations
│   ├── orchestrator/          # Orchestrator agent (coordinator)
│   │   ├── __main__.py        # Server entry point
│   │   ├── agent.py           # Agent definition
│   │   └── core/              # Core logic
│   │       ├── constants.py   # Configuration
│   │       └── instruction.py # LLM instructions
│   │
│   ├── balance/               # Balance agent
│   │   ├── __main__.py        # A2A server
│   │   ├── agent.py           # Agent logic
│   │   ├── executor.py        # Executor implementation
│   │   ├── core/              # Core domain logic
│   │   │   ├── constants.py
│   │   │   ├── exceptions.py
│   │   │   ├── models/        # Data models
│   │   │   └── response_validator.py
│   │   ├── services/          # Business logic
│   │   │   ├── query_parser.py
│   │   │   ├── response_builder.py
│   │   │   └── executor_validator.py
│   │   └── tools/             # Blockchain tools
│   │       ├── ethereum.py
│   │       ├── polygon.py
│   │       └── hedera.py
│   │
│   ├── multichain_liquidity/  # Liquidity agent
│   ├── swap/                  # Swap agent
│   ├── sentiment/             # Sentiment agent
│   └── trading/               # Trading agent
│
└── packages/                  # Shared packages
    └── blockchain/            # Blockchain integrations
        ├── dex/               # DEX base classes
        │   ├── base/          # Base types and clients
        │   ├── abis/          # Contract ABIs
        │   └── utils/         # Utilities
        ├── ethereum/          # Ethereum integration
        │   ├── uniswap/       # Uniswap V3
        │   └── balance/       # Balance queries
        ├── polygon/           # Polygon integration
        │   ├── uniswap/       # Uniswap V3
        │   └── balance/       # Balance queries
        └── hedera/            # Hedera integration
            ├── saucerswap/    # SaucerSwap DEX
            ├── balance/       # Balance queries
            └── client.py      # Hedera client
```

## 🤖 Agents

### Orchestrator Agent

**Port**: 9000  
**Protocol**: AG-UI Protocol (via Google ADK)  
**Role**: Central coordinator that receives user queries and delegates to specialized agents

**Features**:
- Receives natural language queries from frontend
- Coordinates multiple specialized agents
- Aggregates responses from agents
- Handles complex workflows (e.g., swap: balance → liquidity → swap)

**Architecture**:
- Uses Google ADK (Agent Development Kit) with Gemini models
- Wrapped with AG-UI Protocol adapter for frontend communication
- Communicates with specialized agents via A2A Protocol

### Balance Agent

**Port**: 9997  
**Protocol**: A2A Protocol  
**Role**: Fetches account balances across multiple chains

**Capabilities**:
- Query balances on Ethereum, Polygon, and Hedera
- Support for native tokens (ETH, MATIC, HBAR) and ERC-20/HTS tokens
- Multi-chain balance aggregation

**Architecture**:
- **Agent Layer**: `agent.py` - Agent definition
- **Executor Layer**: `executor.py` - A2A executor implementation
- **Service Layer**: Query parsing, response building, validation
- **Tool Layer**: Direct blockchain client calls

### Multi-Chain Liquidity Agent

**Port**: 9998  
**Protocol**: A2A Protocol  
**Role**: Aggregates liquidity information from multiple DEXes

**Capabilities**:
- Query liquidity pools across Ethereum, Polygon, and Hedera
- Support for token pair queries (e.g., "ETH/USDC")
- DEX-specific data (Uniswap V3, SaucerSwap)

### Swap Agent

**Port**: 9999  
**Protocol**: A2A Protocol  
**Role**: Executes token swaps across supported chains

**Capabilities**:
- Swap tokens on Ethereum, Polygon, and Hedera
- Multi-DEX aggregation for best rates
- Transaction creation and tracking

### Sentiment Agent

**Port**: 10000  
**Protocol**: A2A Protocol  
**Role**: Provides cryptocurrency sentiment analysis

**Capabilities**:
- Sentiment balance analysis
- Social volume tracking
- Trending words detection
- Social dominance metrics

### Trading Agent

**Port**: 10001  
**Protocol**: A2A Protocol  
**Role**: Provides ML-powered trading recommendations

**Capabilities**:
- Buy/sell/hold recommendations for BTC and ETH
- Technical analysis (RSI, MACD, Moving Averages)
- ML price predictions
- Entry price, stop loss, and target calculations

## 📦 Blockchain Packages

### Shared DEX Package (`packages/blockchain/dex/`)

Base classes and utilities for DEX integrations:

- **`base/`**: Base types and Web3 client abstractions
- **`abis/`**: Contract ABIs (ERC-20, Uniswap V3 Factory, Pool)
- **`utils/`**: Address utilities and error handling

### Ethereum Package (`packages/blockchain/ethereum/`)

- **Uniswap V3**: Pool factory, liquidity queries, swap execution
- **Balance**: Native ETH and ERC-20 token balance queries

### Polygon Package (`packages/blockchain/polygon/`)

- **Uniswap V3**: Same as Ethereum (different network)
- **Balance**: Native MATIC and ERC-20 token balance queries

### Hedera Package (`packages/blockchain/hedera/`)

- **SaucerSwap**: Hedera-native DEX integration
- **Balance**: HBAR and HTS token balance queries
- **Client**: Hedera SDK client wrapper

## 🔄 Communication Protocols

### AG-UI Protocol
- **Used for**: Frontend ↔ Orchestrator
- **Format**: JSON-RPC over HTTP
- **Implementation**: Google ADK with AG-UI adapter

### A2A Protocol (Agent-to-Agent)
- **Used for**: Orchestrator ↔ Specialized Agents
- **Format**: HTTP-based agent communication
- **Implementation**: A2A SDK (`a2a-sdk`, `a2a-server`)

### Direct Tool Calls
- **Used for**: Agents ↔ Blockchain Packages
- **Format**: Direct Python function calls
- **No protocol overhead**: Fast, synchronous operations

## 🚀 Getting Started

### Prerequisites

- Python 3.11 or higher
- pip or uv (recommended for faster installs)
- Google API Key (for Gemini models)

### Installation

1. **Navigate to backend directory**:
```bash
cd backend
```

2. **Create virtual environment** (optional but recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -e ".[dev]"
```

Or using uv (faster):
```bash
uv pip install -e ".[dev]"
```

### Environment Variables

Create a `.env` file in the backend directory:

```bash
# Google API Key (required for orchestrator)
GOOGLE_API_KEY=your_google_api_key
# OR
GEMINI_API_KEY=your_gemini_api_key

# Model Configuration
GEMINI_MODEL=gemini-2.5-pro  # Default

# Agent Ports (optional, defaults shown)
ORCHESTRATOR_PORT=9000
BALANCE_AGENT_PORT=9997
LIQUIDITY_AGENT_PORT=9998
SWAP_AGENT_PORT=9999
SENTIMENT_AGENT_PORT=10000
TRADING_AGENT_PORT=10001
```

### Running Agents

**Option 1: Using Makefile (Recommended)**

Start all agents:
```bash
make agents-start
```

Start individual agents:
```bash
make agent-orchestrator
make agent-balance
make agent-liquidity
make agent-swap
make agent-sentiment
make agent-trading
```

**Option 2: Manual Start**

Each agent can be run as a module:

```bash
# Orchestrator
python -m agents.orchestrator

# Specialized Agents
python -m agents.balance
python -m agents.multichain_liquidity
python -m agents.swap
python -m agents.sentiment
python -m agents.trading
```

**Option 3: Using uv**

```bash
uv run -m agents.orchestrator
uv run -m agents.balance
# etc.
```

### Agent Endpoints

- **Orchestrator**: `http://localhost:9000/`
- **Balance Agent**: `http://localhost:9997/`
- **Liquidity Agent**: `http://localhost:9998/`
- **Swap Agent**: `http://localhost:9999/`
- **Sentiment Agent**: `http://localhost:10000/`
- **Trading Agent**: `http://localhost:10001/`

## 🔧 Development

### Code Formatting

Format code with Ruff:
```bash
make backend-format
# Or manually:
ruff format agents/ packages/ tests/
```

### Linting

Lint code with Ruff:
```bash
make backend-lint
# Or manually:
ruff check agents/ packages/ tests/
```

Fix auto-fixable issues:
```bash
make backend-lint-fix
# Or manually:
ruff check --fix agents/ packages/ tests/
```

### Type Checking

Check types with mypy:
```bash
make backend-type-check
# Or manually:
mypy agents/ packages/
```

### Running Tests

Run all tests:
```bash
make backend-test
# Or manually:
pytest
```

Run tests with coverage:
```bash
make backend-test-coverage
# Or manually:
pytest --cov=packages --cov=agents --cov-report=term-missing --cov-report=html
```

Run specific test suites:
```bash
make backend-test-saucerswap      # Hedera/SaucerSwap tests
make backend-test-uniswap         # Uniswap tests (Ethereum + Polygon)
make backend-test-ethereum        # Ethereum tests only
make backend-test-polygon         # Polygon tests only
```

### All Checks

Run all quality checks:
```bash
make backend-check
```

This runs:
- Format check
- Linting
- Type checking
- Tests

## 📝 Agent Development Guide

### Creating a New Agent

1. **Create agent directory**:
```
agents/
└── my_agent/
    ├── __init__.py
    ├── __main__.py        # A2A server entry point
    ├── agent.py           # Agent logic
    ├── executor.py        # A2A executor
    └── core/
        ├── constants.py
        └── ...
```

2. **Implement Agent Class**:
```python
# agents/my_agent/agent.py
class MyAgent:
    async def invoke(self, query: str, session_id: str) -> str:
        # Agent logic here
        return response
```

3. **Create A2A Executor**:
```python
# agents/my_agent/executor.py
class MyAgentExecutor(DefaultAgentExecutor):
    async def execute(self, task: Task) -> TaskResult:
        agent = MyAgent()
        result = await agent.invoke(task.input, task.session_id)
        return TaskResult(output=result)
```

4. **Set up A2A Server**:
```python
# agents/my_agent/__main__.py
from a2a_server import A2AStarletteApplication, DefaultRequestHandler
from .executor import MyAgentExecutor

def main():
    request_handler = DefaultRequestHandler(
        agent_executor=MyAgentExecutor(),
        task_store=InMemoryTaskStore(),
    )
    server = A2AStarletteApplication(
        agent_card=agent_card,
        http_handler=request_handler,
    )
    uvicorn.run(server.build(), host="0.0.0.0", port=PORT)
```

5. **Add to Orchestrator**:
Update `agents/orchestrator/core/instruction.py` to include your agent in the available agents list.

### Using Blockchain Packages

Import and use blockchain packages in your agent:

```python
from packages.blockchain.ethereum.balance import get_ethereum_balance
from packages.blockchain.hedera.saucerswap.pool import get_pool_liquidity
from packages.blockchain.polygon.uniswap.swap import create_swap_transaction

# Use in agent
balance = await get_ethereum_balance(address)
liquidity = await get_pool_liquidity(token_a, token_b)
swap_tx = await create_swap_transaction(...)
```

## 🧪 Testing

### Test Structure

Tests are organized by package:
```
tests/
├── conftest.py              # Pytest configuration
└── test_hedera_constants.py

packages/blockchain/*/__test__/
├── test_constants.py
├── test_factory.py
└── test_web3_client.py
```

### Running Tests

```bash
# All tests
pytest

# Specific package
pytest packages/blockchain/hedera/saucerswap/__test__/

# With coverage
pytest --cov=packages --cov=agents --cov-report=html
```

## 📚 Dependencies

### Core Dependencies
- **a2a-sdk**: Agent-to-Agent communication
- **a2a-server**: A2A server implementation
- **google-adk**: Google Agent Development Kit
- **ag-ui-adk**: AG-UI Protocol adapter
- **fastapi**: Web framework (for orchestrator)
- **uvicorn**: ASGI server

### Blockchain Dependencies
- **web3**: Ethereum/Polygon Web3 client
- **@hashgraph/sdk**: Hedera SDK (via Python bindings)

### ML/Analytics
- **numpy**, **pandas**: Data processing
- **scikit-learn**: Machine learning

See `pyproject.toml` for complete dependency list.

## 🔍 Troubleshooting

### Agent Not Starting

1. Check if port is already in use:
```bash
lsof -i :9000  # Replace with agent port
```

2. Verify environment variables are set:
```bash
echo $GOOGLE_API_KEY
```

3. Check Python version:
```bash
python --version  # Should be 3.11+
```

### Import Errors

Ensure package is installed in editable mode:
```bash
pip install -e ".[dev]"
```

### A2A Communication Issues

1. Verify all agents are running
2. Check agent ports match configuration
3. Verify A2A SDK is installed: `pip list | grep a2a`

## 📖 Additional Resources

- [Orchestrator README](./agents/orchestrator/README.md) - Detailed orchestrator documentation
- [Hedera Package README](./packages/blockchain/hedera/README.md) - Hedera integration details
- [Main README](../README.md) - Overall project architecture

## 📝 License

MIT License
