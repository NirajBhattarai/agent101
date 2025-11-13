.PHONY: frontend-dev frontend-build frontend-install frontend-start frontend-format \
	backend-dev backend-install backend-format backend-lint backend-test \
	backend-test-saucerswap backend-test-saucerswap-coverage backend-test-all backend-test-watch \
	backend-test-ethereum backend-test-polygon backend-test-uniswap help

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

