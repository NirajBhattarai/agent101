# Railway Deployment Guide - Backend Only

This guide explains how to deploy the Agent101 backend services to Railway.

## Project Structure

The backend consists of multiple Python agents:
- **Orchestrator Agent**: Main coordinator agent (port 9000)
- **Balance Agent**: Balance checking agent (port 9997)
- **Liquidity Agent**: Liquidity pool information agent (port 9998)
- **Swap Agent**: Token swap agent (port 9999)

## Deployment Strategy

Deploy each agent as a **separate Railway service** so they can scale independently and communicate via their public URLs.

## Railway Setup Steps

### 1. Create Railway Project

1. Go to https://railway.app
2. Sign up or log in
3. Click "New Project"
4. Select "Deploy from GitHub repo" (recommended) or "Empty Project"

### 2. Deploy Orchestrator Agent

1. Click "New Service" → "GitHub Repo" (or "Empty Service")
2. **Service Name**: `orchestrator-agent`
3. **Root Directory**: `backend` (IMPORTANT: Set this to `backend`)
4. **Build Command**: `python3 -m pip install --upgrade pip && python3 -m pip install uv && uv sync` (or leave empty to use railway.toml)
5. **Start Command**: `uv run -m agents.orchestrator.orchestrator`
6. **Environment Variables**:
   ```bash
   PORT=9000  # Railway will override this, but set for clarity
   GOOGLE_API_KEY=your-google-api-key
   # OR
   GEMINI_API_KEY=your-gemini-api-key
   ORCHESTRATOR_PORT=9000
   RENDER_EXTERNAL_URL=https://your-orchestrator.railway.app
   ```

### 3. Deploy Balance Agent

1. Click "New Service" → "GitHub Repo" (or "Empty Service")
2. **Service Name**: `balance-agent`
3. **Root Directory**: `backend` (IMPORTANT: Set this to `backend`)
4. **Build Command**: `python3 -m pip install --upgrade pip && python3 -m pip install uv && uv sync` (or leave empty to use railway.toml)
5. **Start Command**: `uv run -m agents.balance`
6. **Environment Variables**:
   ```bash
   PORT=9997  # Railway will override this
   BALANCE_PORT=9997
   RENDER_EXTERNAL_URL=https://your-balance.railway.app
   ```

### 4. Deploy Liquidity Agent

1. Click "New Service" → "GitHub Repo" (or "Empty Service")
2. **Service Name**: `liquidity-agent`
3. **Root Directory**: `backend` (IMPORTANT: Set this to `backend`)
4. **Build Command**: `python3 -m pip install --upgrade pip && python3 -m pip install uv && uv sync` (or leave empty to use railway.toml)
5. **Start Command**: `uv run -m agents.multichain_liquidity`
6. **Environment Variables**:
   ```bash
   PORT=9998  # Railway will override this
   GOOGLE_API_KEY=your-google-api-key
   # OR
   GEMINI_API_KEY=your-gemini-api-key
   LIQUIDITY_PORT=9998
   RENDER_EXTERNAL_URL=https://your-liquidity.railway.app
   ```

### 5. Deploy Swap Agent

1. Click "New Service" → "GitHub Repo" (or "Empty Service")
2. **Service Name**: `swap-agent`
3. **Root Directory**: `backend` (IMPORTANT: Set this to `backend`)
4. **Build Command**: `python3 -m pip install --upgrade pip && python3 -m pip install uv && uv sync` (or leave empty to use railway.toml)
5. **Start Command**: `uv run -m agents.swap`
6. **Environment Variables**:
   ```bash
   PORT=9999  # Railway will override this
   SWAP_AGENT_PORT=9999
   RENDER_EXTERNAL_URL=https://your-swap.railway.app
   ```

## Environment Variables Reference

### Common Variables (All Agents)

```bash
# Python Version
PYTHON_VERSION=3.11

# API Keys (Required for ADK agents: Orchestrator, Liquidity)
GOOGLE_API_KEY=your-google-api-key
# OR
GEMINI_API_KEY=your-gemini-api-key

# Get API key from: https://aistudio.google.com/app/apikey

# RPC URLs (Optional - defaults provided)
ETHEREUM_MAINNET_RPC=https://eth.llamarpc.com
POLYGON_MAINNET_RPC=https://polygon-rpc.com
HEDERA_MAINNET_RPC=https://mainnet.hashio.io/api
```

### Service-Specific Variables

#### Orchestrator Agent
```bash
PORT=9000
ORCHESTRATOR_PORT=9000
RENDER_EXTERNAL_URL=https://your-orchestrator.railway.app
```

#### Balance Agent
```bash
PORT=9997
BALANCE_PORT=9997
RENDER_EXTERNAL_URL=https://your-balance.railway.app
```

#### Liquidity Agent
```bash
PORT=9998
LIQUIDITY_PORT=9998
RENDER_EXTERNAL_URL=https://your-liquidity.railway.app
```

#### Swap Agent
```bash
PORT=9999
SWAP_AGENT_PORT=9999
RENDER_EXTERNAL_URL=https://your-swap.railway.app
```

## Important Notes

### Root Directory Configuration

**CRITICAL**: For each service, you MUST set the **Root Directory** to `backend` in Railway's service settings. This tells Railway to build from the `backend` directory instead of the project root.

To set Root Directory:
1. Go to your service in Railway dashboard
2. Click on "Settings"
3. Scroll to "Root Directory"
4. Enter: `backend`
5. Save changes

### Port Configuration

- Railway automatically assigns a `PORT` environment variable
- Our agents check `PORT` first, then fall back to service-specific ports
- This ensures compatibility with Railway's port assignment

### Service URLs

After deployment, Railway provides public URLs for each service:
- `https://your-orchestrator.railway.app`
- `https://your-balance.railway.app`
- `https://your-liquidity.railway.app`
- `https://your-swap.railway.app`

Update `RENDER_EXTERNAL_URL` in each service with its Railway URL.

### Agent Communication

Agents communicate via their public Railway URLs. The Orchestrator agent needs to know the URLs of other agents. You can:

1. **Set environment variables in Orchestrator**:
   ```bash
   BALANCE_AGENT_URL=https://your-balance.railway.app
   LIQUIDITY_AGENT_URL=https://your-liquidity.railway.app
   SWAP_AGENT_URL=https://your-swap.railway.app
   ```

2. **Or configure in the frontend** (if you deploy frontend separately)

## Build and Deploy

### Automatic Deployment

Railway automatically deploys on:
- Push to main/master branch (if connected to GitHub)
- Manual trigger from Railway dashboard

### Manual Deployment

1. Go to Railway dashboard
2. Select a service
3. Click "Deploy" → "Deploy Now"

## Troubleshooting

### Build Failures

1. **Check Python version**: Ensure `PYTHON_VERSION=3.11` is set
2. **Check dependencies**: Verify `pyproject.toml` has all required packages
3. **Check build logs**: View detailed logs in Railway dashboard

### Service Not Starting

1. **Check logs**: View service logs in Railway dashboard
2. **Verify environment variables**: Ensure all required vars are set
3. **Check port**: Railway assigns `PORT` automatically - agents handle this
4. **Verify API keys**: Ensure `GOOGLE_API_KEY` or `GEMINI_API_KEY` is set for ADK agents

### Agent Communication Issues

1. **Verify URLs**: Check that agent URLs are correct
2. **Check CORS**: Ensure CORS is configured if needed
3. **Verify services are running**: Check Railway dashboard for service status

## Monitoring

- **Logs**: View real-time logs in Railway dashboard
- **Metrics**: Monitor CPU, memory, and network usage
- **Health Checks**: Set up health check endpoints if needed

## Cost Optimization

- **Free Tier**: Railway offers a free tier with limited resources
- **Resource Limits**: Monitor usage in Railway dashboard
- **Scaling**: Scale services up/down based on usage

## Quick Start Checklist

- [ ] Create Railway account
- [ ] Create new project
- [ ] Deploy Orchestrator Agent
- [ ] Deploy Balance Agent
- [ ] Deploy Liquidity Agent
- [ ] Deploy Swap Agent
- [ ] Set environment variables for each service
- [ ] Update `RENDER_EXTERNAL_URL` with Railway URLs
- [ ] Test agent communication
- [ ] Monitor logs and metrics

## Support

For issues:
1. Check Railway logs
2. Verify environment variables
3. Check agent code for errors
4. Review Railway documentation: https://docs.railway.app
