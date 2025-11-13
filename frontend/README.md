# Agent101 - Next.js Frontend

A Next.js application with API endpoints built using the App Router.

## Getting Started

First, navigate to the frontend directory and install the dependencies:

```bash
cd frontend
npm install
```

### Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual configuration values. The `.env.local` file is git-ignored and should not be committed.

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Endpoints

### Health Check
- `GET /api/health` - Returns API health status

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user (requires `name` and `email` in body)
- `GET /api/users/[id]` - Get a specific user by ID
- `PUT /api/users/[id]` - Update a user by ID (requires `name` and `email` in body)
- `DELETE /api/users/[id]` - Delete a user by ID

## Project Structure

```
frontend/
  ├── app/
  │   ├── api/           # API routes
  │   │   ├── health/
  │   │   └── users/
  │   ├── layout.tsx     # Root layout
  │   ├── page.tsx       # Home page
  │   └── globals.css    # Global styles
  ├── .env.example       # Example environment variables
  ├── package.json
  ├── tsconfig.json
  └── next.config.js
```

## Build

```bash
npm run build
npm start
```

