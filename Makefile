.PHONY: frontend-dev frontend-build frontend-install frontend-start frontend-format \
	backend-dev backend-install backend-format backend-lint backend-test help

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
	@echo "  make backend-install   - Install backend dependencies"
	@echo "  make backend-dev       - Run backend development server"
	@echo "  make backend-format   - Format backend code with Black"
	@echo "  make backend-lint     - Lint backend code with Ruff"
	@echo "  make backend-test     - Run backend tests"

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
	cd backend && black app/ tests/

# Lint backend code
backend-lint:
	cd backend && ruff check app/ tests/

# Run backend tests
backend-test:
	cd backend && pytest

