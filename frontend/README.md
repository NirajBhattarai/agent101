This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

1. **Reown AppKit Project ID**: You need to create a project at [https://cloud.reown.com](https://cloud.reown.com) to get your project ID.

2. **Environment Variables**: Create a `.env.local` file in the frontend directory with your Reown project ID:

```bash
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id_here

# Hedera x402 Facilitator (Optional - for payment processing)
HEDERA_FACILITATOR_ACCOUNT_ID=0.0.6805685
HEDERA_FACILITATOR_PRIVATE_KEY=302e0201...
```

### Installation

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## x402 Hedera Facilitator

This frontend includes a built-in x402 payment facilitator for Hedera network. The facilitator enables paywalled experiences by verifying and settling payment transactions.

### Overview

The facilitator is responsible for:
- **Verifying** payment transactions before settlement
- **Settling** verified payments on the Hedera network
- **Paying transaction fees** on behalf of clients

### API Endpoints

The facilitator exposes the following Next.js API routes:

- **`GET /api/facilitator/supported`** - Get supported payment kinds
  ```bash
  curl http://localhost:3000/api/facilitator/supported
  ```

- **`POST /api/facilitator/verify`** - Verify a payment payload
  ```bash
  curl -X POST http://localhost:3000/api/facilitator/verify \
    -H "Content-Type: application/json" \
    -d '{
      "paymentPayload": {...},
      "paymentRequirements": {...}
    }'
  ```

- **`POST /api/facilitator/settle`** - Settle a verified payment
  ```bash
  curl -X POST http://localhost:3000/api/facilitator/settle \
    -H "Content-Type: application/json" \
    -d '{
      "paymentPayload": {...},
      "paymentRequirements": {...}
    }'
  ```

### Configuration

To enable the facilitator, add these environment variables to your `.env.local`:

```bash
# Hedera Facilitator Configuration (Required)
HEDERA_FACILITATOR_ACCOUNT_ID=0.0.6805685  # Your Hedera account ID (ECDSA format)
HEDERA_FACILITATOR_PRIVATE_KEY=302e0201...  # Your ECDSA private key (DER format)

# Delegated Account Configuration (Optional - for wallet signing flow)
# If not set, the facilitator account will be used as fallback
DELEGATED_ACCOUNT_PRIVATE_KEY=302e0201...  # Private key for delegated account (e.g., 0.0.6805685)
# OR
HEDERA_DELEGATED_ACCOUNT_PRIVATE_KEY=302e0201...  # Alternative variable name
```

**Note**: 
- The facilitator account should be funded with HBAR to pay for transaction fees.
- For wallet signing flow, you can optionally set up a delegated account. If `DELEGATED_ACCOUNT_PRIVATE_KEY` is not set, the facilitator account will be used to sign transactions.

### Supported Networks

- `hedera-testnet` - Hedera testnet
- `hedera-mainnet` - Hedera mainnet

### Supported Payment Types

- **Native HBAR** - Asset ID: `0.0.0` or `"HBAR"`
- **HTS Tokens** - Asset ID: Token ID (e.g., `0.0.429274` for USDC on testnet)

### Usage Example

```typescript
import { createHederaSigner, verify, settle } from "@/lib/shared/blockchain/hedera/facilitator";

// Create signer
const signer = createHederaSigner(
  "hedera-testnet",
  process.env.HEDERA_FACILITATOR_PRIVATE_KEY!,
  process.env.HEDERA_FACILITATOR_ACCOUNT_ID!
);

// Verify payment
const verifyResponse = await verify(signer, paymentPayload, paymentRequirements);

// Settle payment if valid
if (verifyResponse.isValid) {
  const settleResponse = await settle(signer, paymentPayload, paymentRequirements);
  console.log("Transaction:", settleResponse.transaction);
}
```

### Testing the Facilitator

A test script is provided to verify the facilitator functionality:

```bash
npm run test:facilitator
```

Or directly:

```bash
tsx scripts/testFacilitator.ts
```

The test script will:
1. Test the `/api/facilitator/supported` endpoint
2. Create a payment transaction (HBAR or token)
3. Verify the payment via `/api/facilitator/verify`
4. Settle the payment via `/api/facilitator/settle`

**Test Script Environment Variables:**

```bash
# Required
HEDERA_ACCOUNT_ID=0.0.123456          # Your payer account ID
HEDERA_PRIVATE_KEY=302e0201...        # Your payer private key

# Optional (defaults to .env.local facilitator config)
FACILITATOR_URL=http://localhost:3000 # Facilitator API URL
PAYMENT_TYPE=hbar                      # "hbar" or "token"
AMOUNT=50000000                        # Amount in tinybars (0.5 HBAR)
TOKEN_ID=0.0.429274                   # Token ID if PAYMENT_TYPE=token
HEDERA_NETWORK=hedera-testnet         # Network to use
PAY_TO=0.0.123456                     # Recipient account ID
```

**Example: Test HBAR Payment**

```bash
HEDERA_ACCOUNT_ID=0.0.123456 \
HEDERA_PRIVATE_KEY=302e0201... \
PAYMENT_TYPE=hbar \
AMOUNT=50000000 \
npm run test:facilitator
```

**Example: Test Token Payment**

```bash
HEDERA_ACCOUNT_ID=0.0.123456 \
HEDERA_PRIVATE_KEY=302e0201... \
PAYMENT_TYPE=token \
TOKEN_ID=0.0.429274 \
AMOUNT=1000000 \
npm run test:facilitator
```

### Code Location

The facilitator implementation is located at:
- `lib/shared/blockchain/hedera/facilitator/` - Core facilitator logic
- `app/api/facilitator/` - API route handlers
- `scripts/testFacilitator.ts` - Test script

For more details, see the [facilitator module documentation](./lib/shared/blockchain/hedera/facilitator/).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
