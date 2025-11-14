# Agent101 Frontend

A modern Next.js application that provides a conversational DeFi interface powered by CopilotKit and multi-chain wallet connectivity. Users can interact with blockchain networks (Ethereum, Polygon, Hedera) through natural language conversations.

## 🏗️ Architecture

The frontend follows a **component-based architecture** with clear separation between UI components, API routes, state management, and blockchain integrations.

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Pages: /, /chat, /swap, /payment                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Routes: /api/orchestrator, /api/facilitator      │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────┬───────────┬───────────┬───────────┬─────────────┘
            │           │           │           │
    ┌───────▼───┐ ┌─────▼────┐ ┌───▼────┐ ┌───▼──────┐
    │ CopilotKit│ │  Reown   │ │ Redux  │ │ TanStack │
    │   UI      │ │ AppKit   │ │ Store  │ │  Query  │
    └───────┬───┘ └─────┬────┘ └───┬────┘ └───┬──────┘
            │           │           │           │
            └───────────┴───────────┴───────────┘
                           │
                           │ HTTP/JSON-RPC
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Backend Orchestrator (Port 9000)                │
│              AG-UI Protocol Communication                   │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
frontend/
├── app/                        # Next.js App Router
│   ├── api/                    # API routes
│   │   ├── copilotkit/         # CopilotKit route handler
│   │   ├── orchestrator/       # Orchestrator proxy route
│   │   └── facilitator/        # Payment facilitator routes
│   │       ├── route.ts        # Main facilitator handler
│   │       ├── supported/      # Supported payment kinds
│   │       ├── verify/         # Payment verification
│   │       └── settle/         # Payment settlement
│   │
│   ├── chat/                   # Chat interface page
│   │   └── page.tsx
│   ├── swap/                   # Swap feature page
│   │   └── page.tsx
│   ├── payment/                # Payment facilitator page
│   │   └── page.tsx
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   ├── providers.tsx           # Global providers (Redux, Wagmi, Query)
│   └── globals.css             # Global styles
│
├── components/                 # React components
│   ├── chat/                   # Chat UI components
│   │   ├── DeFiChat.tsx        # Main chat component
│   │   └── a2a/                # A2A message components
│   │       ├── MessageFromA2A.tsx
│   │       └── MessageToA2A.tsx
│   │
│   ├── features/               # Feature-specific components
│   │   ├── balance/            # Balance display
│   │   ├── swap/               # Swap interface
│   │   ├── liquidity/         # Liquidity pools
│   │   ├── bridge/             # Bridge interface
│   │   ├── swap_router/       # Swap router
│   │   ├── pool_calculator/   # Pool calculator
│   │   └── market_insights/   # Market insights
│   │
│   ├── forms/                  # Form components
│   │   ├── balance/            # Balance query form
│   │   ├── swap/               # Swap form
│   │   ├── liquidity/         # Liquidity form
│   │   ├── bridge/             # Bridge form
│   │   ├── payment/            # Payment form
│   │   └── shared/             # Shared form components
│   │
│   └── shared/                 # Shared components
│       ├── Logo.tsx
│       └── WalletConnect.tsx
│
├── lib/                        # Library code (if exists)
│   └── store/                  # Redux store configuration
│
├── scripts/                    # Utility scripts
│   ├── testFacilitator.ts     # Facilitator test script
│   ├── swapHbarToToken.ts     # Swap test scripts
│   └── ...
│
├── types/                      # TypeScript type definitions
│   └── index.ts
│
└── public/                     # Static assets
    └── logo.svg
```

## 🎨 Key Technologies

### Core Framework
- **Next.js 16**: React framework with App Router
- **React 19**: UI library
- **TypeScript**: Type safety

### UI & Chat
- **CopilotKit**: Conversational AI interface
  - `@copilotkit/react-core`: Core CopilotKit functionality
  - `@copilotkit/react-ui`: UI components
  - `@copilotkit/runtime`: Runtime utilities

### Wallet Integration
- **Reown AppKit** (formerly WalletConnect): Multi-chain wallet connectivity
  - `@reown/appkit`: Main AppKit library
  - `@reown/appkit-adapter-wagmi`: Wagmi adapter
- **Wagmi**: React Hooks for Ethereum
- **Viem**: TypeScript Ethereum library

### State Management
- **Redux Toolkit**: Global state management
- **TanStack Query**: Server state and caching

### Blockchain Libraries
- **@hashgraph/sdk**: Hedera Hashgraph SDK
- **ethers**: Ethereum library
- **@layerzerolabs/lz-v2-utilities**: LayerZero utilities

### Styling
- **Tailwind CSS 4**: Utility-first CSS framework
- **PostCSS**: CSS processing

## 🔄 Data Flow

### Chat Flow

```
User Input
    ↓
CopilotKit UI Component
    ↓
/api/copilotkit/route.ts (Next.js API Route)
    ↓
AG-UI Protocol (JSON-RPC)
    ↓
Backend Orchestrator (Port 9000)
    ↓
Specialized Agents (A2A Protocol)
    ↓
Response → Frontend → Display in Chat
```

### Wallet Connection Flow

```
User Clicks "Connect Wallet"
    ↓
Reown AppKit Modal
    ↓
User Selects Wallet
    ↓
Wagmi Provider (via AppKit Adapter)
    ↓
Wallet Connected State (Redux)
    ↓
Components Access via useAppKitAccount()
```

### Feature Card Updates

```
Agent Response (JSON)
    ↓
CopilotKit Message Handler
    ↓
Parse Response Type (balance, swap, liquidity, etc.)
    ↓
Update Feature Card State
    ↓
Render Updated UI Component
```

## 🚀 Getting Started

### Prerequisites

1. **Node.js** 18 or higher
2. **Reown AppKit Project ID**: Create a project at [https://cloud.reown.com](https://cloud.reown.com)

### Installation

1. **Navigate to frontend directory**:
```bash
cd frontend
```

2. **Install dependencies**:
```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# Reown AppKit (Required)
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id_here

# Hedera x402 Facilitator (Optional - for payment processing)
HEDERA_FACILITATOR_ACCOUNT_ID=0.0.6805685
HEDERA_FACILITATOR_PRIVATE_KEY=302e0201...

# Orchestrator URL (Optional - defaults to localhost:9000)
ORCHESTRATOR_URL=http://localhost:9000/
```

### Running the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## 📄 Pages

### Landing Page (`/`)

- Hero section with project overview
- Feature highlights
- Wallet connection button
- Navigation to chat and other features

### Chat Page (`/chat`)

- Main conversational interface
- CopilotKit chat component
- Feature cards for displaying agent responses:
  - Balance Card
  - Swap Card
  - Liquidity Card
  - Bridge Card
  - Swap Router Card
  - Pool Calculator Card
  - Market Insights Card

### Swap Page (`/swap`)

- Dedicated swap interface
- Swap form component
- Real-time swap data display
- Wallet connection required

### Payment Page (`/payment`)

- Payment facilitator interface
- x402 Hedera payment processing
- Payment verification and settlement

## 🔌 API Routes

### `/api/copilotkit`

**Handler**: `app/api/copilotkit/route.ts`

Main CopilotKit route that:
- Receives chat messages from CopilotKit UI
- Forwards to orchestrator via AG-UI Protocol
- Handles agent responses
- Parses structured data for feature cards
- Updates component state

### `/api/orchestrator`

**Handler**: `app/api/orchestrator/route.ts`

Direct proxy to orchestrator agent:
- Accepts JSON-RPC requests
- Forwards to orchestrator at `http://localhost:9000/`
- Returns orchestrator responses

### `/api/facilitator/*`

**Handlers**: `app/api/facilitator/*/route.ts`

Payment facilitator endpoints:
- **`/api/facilitator/supported`**: Get supported payment kinds
- **`/api/facilitator/verify`**: Verify payment payload
- **`/api/facilitator/settle`**: Settle verified payment

## 🧩 Components

### Chat Components

#### `DeFiChat`
Main chat interface component that:
- Integrates CopilotKit UI
- Handles message sending/receiving
- Parses agent responses
- Updates feature card states
- Manages conversation flow

#### `MessageFromA2A` / `MessageToA2A`
Custom message components for A2A protocol messages

### Feature Components

Each feature has a dedicated card component:
- **`BalanceCard`**: Displays account balances
- **`SwapCard`**: Shows swap transaction details
- **`LiquidityCard`**: Displays liquidity pool information
- **`BridgeCard`**: Shows bridge transaction details
- **`SwapRouterCard`**: Displays swap routing information
- **`PoolCalculatorCard`**: Shows pool calculation results
- **`MarketInsightsCard`**: Displays market insights

### Form Components

Form components for user input:
- **`BalanceForm`**: Balance query form
- **`SwapForm`**: Swap transaction form
- **`LiquidityForm`**: Liquidity query form
- **`BridgeForm`**: Bridge transaction form
- **`PaymentForm`**: Payment form

### Shared Components

- **`Logo`**: Application logo component
- **`WalletConnect`**: Wallet connection button

## 💳 Payment Facilitator (x402 Hedera)

The frontend includes a built-in x402 payment facilitator for Hedera network.

### Overview

The facilitator enables paywalled experiences by:
- **Verifying** payment transactions before settlement
- **Settling** verified payments on the Hedera network
- **Paying transaction fees** on behalf of clients

### API Endpoints

- **`GET /api/facilitator/supported`** - Get supported payment kinds
- **`POST /api/facilitator/verify`** - Verify a payment payload
- **`POST /api/facilitator/settle`** - Settle a verified payment

### Configuration

Add to `.env.local`:
```bash
HEDERA_FACILITATOR_ACCOUNT_ID=0.0.6805685
HEDERA_FACILITATOR_PRIVATE_KEY=302e0201...
```

### Supported Networks

- `hedera-testnet` - Hedera testnet
- `hedera-mainnet` - Hedera mainnet

### Supported Payment Types

- **Native HBAR** - Asset ID: `0.0.0` or `"HBAR"`
- **HTS Tokens** - Asset ID: Token ID (e.g., `0.0.429274` for USDC on testnet)

### Testing

Test the facilitator:
```bash
npm run test:facilitator
```

Or directly:
```bash
tsx scripts/testFacilitator.ts
```

**Test Environment Variables**:
```bash
HEDERA_ACCOUNT_ID=0.0.123456
HEDERA_PRIVATE_KEY=302e0201...
PAYMENT_TYPE=hbar  # or "token"
AMOUNT=50000000
TOKEN_ID=0.0.429274  # if PAYMENT_TYPE=token
```

## 🔧 Development

### Code Formatting

Format code with Prettier:
```bash
npm run format
```

Check formatting:
```bash
npm run format:check
```

### Linting

Lint code with ESLint:
```bash
npm run lint
```

### Type Checking

TypeScript type checking is done automatically by the Next.js build process:
```bash
npm run build
```

## 📦 Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server

### Code Quality
- `npm run lint` - Run ESLint
- `npm run format` - Format with Prettier
- `npm run format:check` - Check formatting

### Testing
- `npm run test:facilitator` - Test payment facilitator
- `npm run test:facilitator:ethers` - Test facilitator with Ethers

### Utility Scripts
- `npm run swap` - Run swap test script
- `npm run mcp:swap` - Run MCP swap script
- `npm run swap:usdc-to-hbar` - Run USDC to HBAR swap

## 🎯 State Management

### Redux Store

Global state managed with Redux Toolkit:
- Wallet connection state
- Feature card data (balance, swap, liquidity, etc.)
- User preferences

### TanStack Query

Server state and caching:
- Blockchain data queries
- Agent response caching
- Optimistic updates

### Local State

Component-level state with React hooks:
- Form inputs
- UI state (modals, dropdowns)
- Temporary data

## 🔐 Wallet Integration

### Supported Wallets

Reown AppKit supports:
- MetaMask
- WalletConnect
- Coinbase Wallet
- And many more...

### Supported Chains

- **Ethereum**: Mainnet, Sepolia, etc.
- **Polygon**: Mainnet, Mumbai, etc.
- **Hedera**: Mainnet, Testnet

### Wallet State

Access wallet state in components:
```typescript
import { useAppKitAccount } from "@reown/appkit/react";

const { address, isConnected } = useAppKitAccount?.() || {};
```

## 🎨 Styling

### Tailwind CSS

Utility-first CSS framework:
- Custom color palette
- Responsive design utilities
- Component styling

### Global Styles

- `app/globals.css` - Global styles and Tailwind directives
- `app/copilot.css` - CopilotKit-specific styles

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Environment Variables for Production

Set in Vercel dashboard:
- `NEXT_PUBLIC_REOWN_PROJECT_ID`
- `HEDERA_FACILITATOR_ACCOUNT_ID`
- `HEDERA_FACILITATOR_PRIVATE_KEY`
- `ORCHESTRATOR_URL` (if different from default)

### Netlify

Configuration file: `netlify.toml`

## 🐛 Troubleshooting

### Wallet Not Connecting

1. Verify `NEXT_PUBLIC_REOWN_PROJECT_ID` is set
2. Check browser console for errors
3. Ensure wallet extension is installed

### Orchestrator Connection Issues

1. Verify backend orchestrator is running on port 9000
2. Check `ORCHESTRATOR_URL` environment variable
3. Check browser network tab for failed requests

### Build Errors

1. Clear `.next` directory: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check TypeScript errors: `npm run build`

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [CopilotKit Documentation](https://docs.copilotkit.ai/)
- [Reown AppKit Documentation](https://docs.reown.com/)
- [Wagmi Documentation](https://wagmi.sh/)
- [Main README](../README.md) - Overall project architecture
- [Backend README](../backend/README.md) - Backend architecture

## 📝 License

MIT License
