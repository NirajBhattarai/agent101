# Agent101 - Multi-Agent DeFi Platform

A comprehensive DeFi platform powered by a multi-agent system that enables users to interact with multiple blockchain networks (Ethereum, Polygon, Hedera) through natural language conversations.

## 🏗️ Architecture Overview

Agent101 follows a **multi-agent orchestration architecture** with a clear separation between frontend, backend agents, and shared blockchain packages.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  CopilotKit UI + Wallet Integration (Reown AppKit)       │  │
│  │  - Chat Interface                                        │  │
│  │  - Swap, Balance, Liquidity, Bridge Features            │  │
│  │  - Payment Facilitator (x402 Hedera)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ AG-UI Protocol
                             │ (HTTP/JSON-RPC)
┌────────────────────────────▼────────────────────────────────────┐
│              Orchestrator Agent (Port 9000)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Google ADK + AG-UI Protocol Adapter                      │  │
│  │  - Receives user queries                                  │  │
│  │  - Coordinates specialized agents                        │  │
│  │  - Aggregates responses                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────┬───────────┬───────────┬───────────┬───────────────┘
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
┌──────────────────────────▼──────────────────────────────────────┐
│              Blockchain Packages (Shared)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Ethereum    │  │   Polygon    │  │    Hedera    │         │
│  │  - Uniswap   │  │   - Uniswap  │  │  - SaucerSwap│         │
│  │  - Balance   │  │   - Balance  │  │  - Balance   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. **Frontend** (`frontend/`)
- **Framework**: Next.js 16 with React 19
- **UI**: CopilotKit for conversational interface
- **Wallet**: Reown AppKit (formerly WalletConnect) for multi-chain wallet connectivity
- **State Management**: Redux Toolkit + TanStack Query
- **Features**: Chat, Swap, Balance, Liquidity, Bridge, Payment Facilitator

#### 2. **Backend Agents** (`backend/agents/`)
- **Orchestrator Agent**: Central coordinator using Google ADK + AG-UI Protocol
- **Specialized Agents**: Each agent handles a specific domain
  - **Balance Agent**: Multi-chain balance queries
  - **Multi-Chain Liquidity Agent**: DEX liquidity aggregation
  - **Swap Agent**: Token swap execution
  - **Sentiment Agent**: Cryptocurrency sentiment analysis
  - **Trading Agent**: ML-powered trading recommendations

#### 3. **Blockchain Packages** (`backend/packages/blockchain/`)
- **Shared Libraries**: Reusable blockchain integration code
- **Supported Chains**: Ethereum, Polygon, Hedera
- **DEX Integrations**: Uniswap V3 (Ethereum/Polygon), SaucerSwap (Hedera)

### Communication Protocols

1. **AG-UI Protocol**: Frontend ↔ Orchestrator
   - JSON-RPC over HTTP
   - Enables natural language conversations

2. **A2A Protocol**: Orchestrator ↔ Specialized Agents
   - Agent-to-Agent communication
   - Enables agent coordination and delegation

3. **Direct Tool Calls**: Agents ↔ Blockchain Packages
   - Direct function calls to blockchain clients
   - No protocol overhead for internal operations

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.11+ (for backend)
- **uv** or **pip** (Python package manager)
- **Google API Key** (for Gemini models)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd agent101-new
```

2. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

3. **Install Backend Dependencies**
```bash
cd backend
pip install -e ".[dev]"
# Or with uv (faster):
uv pip install -e ".[dev]"
```

### Environment Setup

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id
HEDERA_FACILITATOR_ACCOUNT_ID=0.0.xxxxx
HEDERA_FACILITATOR_PRIVATE_KEY=your_private_key
```

**Backend** (`.env`):
```bash
GOOGLE_API_KEY=your_google_api_key
GEMINI_MODEL=gemini-2.5-pro
```

### Running the Application

**Option 1: Using Makefile (Recommended)**
```bash
# Start all agents
make agents-start

# In another terminal, start frontend
make frontend-dev
```

**Option 2: Manual Start**

1. **Start Backend Agents**:
```bash
# Terminal 1: Orchestrator
cd backend && python -m agents.orchestrator

# Terminal 2-6: Specialized Agents
cd backend && python -m agents.balance
cd backend && python -m agents.multichain_liquidity
cd backend && python -m agents.swap
cd backend && python -m agents.sentiment
cd backend && python -m agents.trading
```

2. **Start Frontend**:
```bash
cd frontend
npm run dev
```

## 📁 Project Structure

```
agent101-new/
├── frontend/                 # Next.js frontend application
│   ├── app/                  # Next.js app router
│   │   ├── api/              # API routes (orchestrator, facilitator)
│   │   ├── chat/             # Chat interface page
│   │   ├── swap/             # Swap feature page
│   │   └── payment/          # Payment facilitator page
│   ├── components/           # React components
│   │   ├── chat/             # Chat UI components
│   │   ├── features/         # Feature-specific components
│   │   ├── forms/            # Form components
│   │   └── shared/           # Shared components
│   └── scripts/              # Utility scripts
│
├── backend/                  # Python backend
│   ├── agents/               # Agent implementations
│   │   ├── orchestrator/     # Orchestrator agent
│   │   ├── balance/          # Balance agent
│   │   ├── multichain_liquidity/  # Liquidity agent
│   │   ├── swap/             # Swap agent
│   │   ├── sentiment/        # Sentiment agent
│   │   └── trading/          # Trading agent
│   └── packages/             # Shared packages
│       └── blockchain/       # Blockchain integrations
│           ├── ethereum/      # Ethereum integration
│           ├── polygon/      # Polygon integration
│           └── hedera/       # Hedera integration
│
└── Makefile                  # Development commands
```

## 🔄 Agent Workflow

### Example: Token Swap Workflow

1. **User Query**: "Swap 0.1 HBAR to USDC on Hedera"
2. **Orchestrator** receives query via AG-UI Protocol
3. **Orchestrator** calls **Balance Agent** (A2A) to check user balance
4. **Orchestrator** calls **Liquidity Agent** (A2A) to find pools
5. **Orchestrator** calls **Swap Agent** (A2A) to execute swap
6. **Orchestrator** aggregates results and responds to frontend

### Agent Communication Flow

```
User → Frontend → Orchestrator → Balance Agent → Blockchain Package
                              → Liquidity Agent → Blockchain Package
                              → Swap Agent → Blockchain Package
                              → Response → Frontend → User
```

## 🛠️ Development

### Code Quality

**Backend**:
```bash
make backend-format      # Format code
make backend-lint        # Lint code
make backend-type-check  # Type checking
make backend-test        # Run tests
```

**Frontend**:
```bash
make frontend-format     # Format code
npm run lint            # Lint code
```

### Testing

**Backend Tests**:
```bash
make backend-test                    # All tests
make backend-test-saucerswap         # Hedera tests
make backend-test-uniswap            # Uniswap tests
make backend-test-coverage           # With coverage
```

## 📚 Documentation

- [Backend README](./backend/README.md) - Backend architecture and agent details
- [Frontend README](./frontend/README.md) - Frontend architecture and features
- [Orchestrator README](./backend/agents/orchestrator/README.md) - Orchestrator agent details

## 🔌 API Endpoints

### Orchestrator Agent
- **URL**: `http://localhost:9000/`
- **Protocol**: AG-UI Protocol (JSON-RPC)

### Specialized Agents (A2A Protocol)
- **Balance Agent**: `http://localhost:9997/`
- **Liquidity Agent**: `http://localhost:9998/`
- **Swap Agent**: `http://localhost:9999/`
- **Sentiment Agent**: `http://localhost:10000/`
- **Trading Agent**: `http://localhost:10001/`

### Frontend API Routes
- **Orchestrator Proxy**: `/api/orchestrator`
- **Payment Facilitator**: `/api/facilitator/*`

## 🌐 Supported Blockchains

- **Ethereum**: Uniswap V3, ERC-20 tokens
- **Polygon**: Uniswap V3, ERC-20 tokens
- **Hedera**: SaucerSwap, HTS tokens, HBAR

## 🤝 Contributing

1. Follow the existing code structure
2. Maintain separation of concerns (agents, packages, frontend)
3. Write tests for new features
4. Update documentation

## 📝 License

MIT License

## 🙏 Acknowledgments

Built for **Hedera Hello Future: Ascension Hackathon 2025**

