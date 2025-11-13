.PHONY: frontend-dev frontend-build frontend-install frontend-start frontend-format help

# Default target
help:
	@echo "Available targets:"
	@echo "  make frontend-install  - Install frontend dependencies"
	@echo "  make frontend-dev      - Run frontend development server"
	@echo "  make frontend-build    - Build frontend for production"
	@echo "  make frontend-start    - Start production server (after build)"
	@echo "  make frontend-format   - Format frontend code with Prettier"

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

