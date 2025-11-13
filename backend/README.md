# Agent101 Backend

Python backend API built with FastAPI.

## Getting Started

### Prerequisites

- Python 3.11 or higher
- pip or uv (recommended)

### Installation

1. Navigate to the backend directory:

```bash
cd backend
```

2. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -e ".[dev]"
```

Or using uv (faster):

```bash
uv pip install -e ".[dev]"
```

### Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your actual configuration values.

### Running the Server

**Development mode:**

```bash
uvicorn app.main:app --reload
```

Or using the script:

```bash
python -m app.main
```

The API will be available at [http://localhost:8000](http://localhost:8000)

**API Documentation:**
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## API Endpoints

### Health Check
- `GET /api/v1/health` - Returns API health status

### Users
- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/{user_id}` - Get a specific user by ID
- `POST /api/v1/users` - Create a new user (requires `name` and `email` in body)
- `PUT /api/v1/users/{user_id}` - Update a user by ID
- `DELETE /api/v1/users/{user_id}` - Delete a user by ID

## Project Structure

```
backend/
  ├── app/
  │   ├── api/
  │   │   └── v1/
  │   │       ├── health.py
  │   │       └── users.py
  │   ├── core/
  │   │   └── config.py
  │   ├── __init__.py
  │   └── main.py
  ├── packages/              # Reusable packages
  │   └── blockchain/       # Blockchain integrations
  │       └── hedera/       # Hedera Hashgraph package
  │           ├── __init__.py
  │           ├── client.py
  │           ├── transactions.py
  │           ├── example.py
  │           └── README.md
  ├── tests/
  ├── .env.example
  ├── pyproject.toml
  └── README.md
```

## Packages

The backend uses a packages structure for organizing reusable modules:

### Blockchain Packages

- **`packages/blockchain/hedera/`** - Hedera Hashgraph integration
  - Client implementation for connecting to Hedera network
  - Transaction utilities for creating and managing transactions
  - See `packages/blockchain/hedera/README.md` for usage details

### Using Packages

Import packages in your code:

```python
from packages.blockchain.hedera import HederaClient
from packages.blockchain.hedera.transactions import TransactionService
```

## Development

### Code Formatting

Format code with Black:

```bash
black app/ packages/
```

### Linting

Lint code with Ruff:

```bash
ruff check app/ packages/
```

Fix auto-fixable issues:

```bash
ruff check --fix app/ packages/
```

### Type Checking

Check types with mypy:

```bash
mypy app/ packages/
```

### Running Tests

```bash
pytest
```

## Build

This project uses `pyproject.toml` for configuration. To build:

```bash
pip install build
python -m build
```

