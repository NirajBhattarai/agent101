.PHONY: frontend-dev frontend-build frontend-install frontend-start frontend-format \
	backend-dev backend-install backend-format backend-lint backend-test \
	backend-test-saucerswap backend-test-saucerswap-coverage backend-test-all backend-test-watch \
	backend-test-ethereum backend-test-polygon backend-test-uniswap \
	agent-orchestrator agent-liquidity agents-start agents-stop agents-status agents-restart help

# Default target
help:
	@echo "Available targets:"
	@echo ""
	@echo "Frontend:"
	@echo "  make frontend-install  - Install frontend dependencies"
	@echo "  make frontend-dev      - Run frontend development server"
	@echo "  make frontend-build    - Build frontend for production"
	@echo "  make frontend-start    - Start production server (after build)"
	@echo "  make frontend-format   - Format frontend code with Prettier"
	@echo ""
	@echo "Backend:"
	@echo "  make backend-install        - Install backend dependencies"
	@echo "  make backend-dev            - Run backend development server"
	@echo "  make backend-format        - Format backend code with Black"
	@echo "  make backend-format-check  - Check code formatting (no changes)"
	@echo "  make backend-lint          - Lint backend code with Ruff"
	@echo "  make backend-lint-fix      - Fix linting issues automatically"
	@echo "  make backend-type-check    - Type check with mypy"
	@echo "  make backend-test                - Run backend tests"
	@echo "  make backend-test-coverage        - Run tests with coverage report"
	@echo "  make backend-test-saucerswap     - Run SaucerSwap tests only"
	@echo "  make backend-test-saucerswap-coverage - Run SaucerSwap tests with coverage"
	@echo "  make backend-test-ethereum       - Run Ethereum Uniswap tests"
	@echo "  make backend-test-polygon        - Run Polygon Uniswap tests"
	@echo "  make backend-test-uniswap        - Run all Uniswap tests (Ethereum + Polygon)"
	@echo "  make backend-test-all             - Run all tests (SaucerSwap + other tests)"
	@echo "  make backend-test-watch           - Run SaucerSwap tests in watch mode (stops on first failure)"
	@echo "  make backend-check                - Run all checks (format, lint, type, test)"
	@echo ""
	@echo "Agents:"
	@echo "  make agent-orchestrator           - Start Orchestrator Agent (port 9000)"
	@echo "  make agent-liquidity              - Start Multi-Chain Liquidity Agent (port 9998)"
	@echo "  make agents-start                - Start all agents (orchestrator + liquidity)"
	@echo "  make agents-stop                 - Stop all running agents"
	@echo "  make agents-status               - Check status of all agents"
	@echo "  make agents-restart              - Restart all agents"

# Install frontend dependencies
frontend-install:
	cd frontend && npm install

# Run frontend development server
frontend-dev:
	cd frontend && npm run dev

# Build frontend for production
frontend-build:
	cd frontend && npm run build

# Start production server (requires build first)
frontend-start:
	cd frontend && npm start

# Format frontend code
frontend-format:
	cd frontend && npm run format

# Install backend dependencies
backend-install:
	cd backend && pip install -e ".[dev]"

# Run backend development server
backend-dev:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Format backend code
backend-format:
	cd backend && black packages/ agents/ tests/

# Check backend code formatting (without modifying)
backend-format-check:
	cd backend && black --check packages/ agents/ tests/

# Lint backend code
backend-lint:
	cd backend && ruff check packages/ agents/ tests/

# Fix linting issues automatically
backend-lint-fix:
	cd backend && ruff check --fix packages/ agents/ tests/

# Run backend tests
backend-test:
	cd backend && pytest

# Run backend tests with coverage
backend-test-coverage:
	cd backend && pytest --cov=packages --cov=agents --cov-report=term-missing --cov-report=html

# Type check backend code
backend-type-check:
	cd backend && mypy packages/ agents/

# Run all backend checks (format, lint, type-check, test)
backend-check: backend-format-check backend-lint backend-type-check backend-test
	@echo "All backend checks passed!"

# Run SaucerSwap tests only
backend-test-saucerswap:
	cd backend && uv run pytest packages/blockchain/hedera/saucerswap/__test__/ -v

# Run SaucerSwap tests with coverage
backend-test-saucerswap-coverage:
	cd backend && uv run pytest packages/blockchain/hedera/saucerswap/__test__/ -v --cov=packages/blockchain/hedera/saucerswap --cov-report=term-missing --cov-report=html

# Run all tests (SaucerSwap + other tests)
backend-test-all:
	cd backend && uv run pytest packages/blockchain/hedera/saucerswap/__test__/ tests/ -v

# Run SaucerSwap tests in watch mode (stops on first failure)
backend-test-watch:
	cd backend && uv run pytest packages/blockchain/hedera/saucerswap/__test__/ -v --tb=short -x

# Run Ethereum Uniswap tests
backend-test-ethereum:
	cd backend && uv run pytest packages/blockchain/ethereum/uniswap/__test__/ -v

# Run Polygon Uniswap tests
backend-test-polygon:
	cd backend && uv run pytest packages/blockchain/polygon/uniswap/__test__/ -v

# Run all Uniswap tests (Ethereum + Polygon)
backend-test-uniswap:
	cd backend && uv run pytest packages/blockchain/ethereum/uniswap/__test__/ packages/blockchain/polygon/uniswap/__test__/ -v

# Agent server targets (similar to agentflow101)
.PHONY: agents-start agents-stop agents-status agents-restart agent-orchestrator agent-liquidity

# Individual agent targets (can be run separately)
agent-orchestrator:
	@echo "🚀 Starting Orchestrator Agent..."
	@echo "   Orchestrator Agent: http://0.0.0.0:9000"
	cd backend && uv run -m agents.orchestrator.orchestrator

agent-liquidity:
	@echo "💧 Starting Multi-Chain Liquidity Agent..."
	@echo "   Multi-Chain Liquidity Agent: http://0.0.0.0:9998"
	cd backend && uv run -m agents.multichain_liquidity

# Start all agents in parallel (similar to agentflow101's dev-all-agents)
agents-start:
	@echo "🚀 Starting all agents..."
	@echo "   Orchestrator Agent: http://0.0.0.0:9000"
	@echo "   Multi-Chain Liquidity Agent: http://0.0.0.0:9998"
	@echo ""
	@echo "🛑 Stopping any existing agents..."
	@$(MAKE) agents-stop >/dev/null 2>&1 || true
	@sleep 1
	@echo ""
	@echo "📦 Installing dependencies..."
	@cd backend && (uv sync 2>&1 || uv pip install -e '.[dev]' 2>&1 || pip install -e '.[dev]' 2>&1) | grep -v '^$$' | head -20 || true
	@echo ""
	@echo "Starting agents in parallel (logs will appear in terminal)..."
	@echo "Press Ctrl+C to stop all agents"
	@echo ""
	@make -j2 agent-orchestrator agent-liquidity

# Stop all running agents (without using PID files)
agents-stop:
	@echo "🛑 Stopping all agents..."
	@pkill -f "agents.orchestrator.orchestrator" 2>/dev/null && echo "  ✓ Stopped Orchestrator Agent" || echo "  ⚠ Orchestrator Agent not running"
	@pkill -f "agents.multichain_liquidity" 2>/dev/null && echo "  ✓ Stopped Liquidity Agent" || echo "  ⚠ Liquidity Agent not running"
	@rm -rf $(AGENT_PID_DIR) 2>/dev/null || true
	@sleep 1
	@echo "✅ All agents stopped"

# Check status of all agents
agents-status:
	@echo "📊 Agent Status:"
	@echo ""
	@if [ -d "$(AGENT_PID_DIR)" ]; then \
		if [ -f "$(AGENT_PID_DIR)/orchestrator.pid" ]; then \
			PID=$$(cat $(AGENT_PID_DIR)/orchestrator.pid 2>/dev/null); \
			if [ -n "$$PID" ] && kill -0 $$PID 2>/dev/null; then \
				echo "  ✅ Orchestrator Agent: Running (PID: $$PID, Port: 9000)"; \
			else \
				echo "  ❌ Orchestrator Agent: Not running"; \
			fi; \
		else \
			echo "  ❌ Orchestrator Agent: Not started"; \
		fi; \
		if [ -f "$(AGENT_PID_DIR)/liquidity.pid" ]; then \
			PID=$$(cat $(AGENT_PID_DIR)/liquidity.pid 2>/dev/null); \
			if [ -n "$$PID" ] && kill -0 $$PID 2>/dev/null; then \
				echo "  ✅ Liquidity Agent: Running (PID: $$PID, Port: 9998)"; \
			else \
				echo "  ❌ Liquidity Agent: Not running"; \
			fi; \
		else \
			echo "  ❌ Liquidity Agent: Not started"; \
		fi; \
	else \
		echo "  ❌ No agents started (PID directory not found)"; \
	fi
	@echo ""

# Restart all agents
agents-restart: agents-stop agents-start
	@echo "🔄 Agents restarted!"

