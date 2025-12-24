# Frontend Dockerization

## Quick Start

Run the entire application (backend, database, frontend):

```bash
docker-compose up --build -d
```

Services will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **n8n**: http://localhost:5678

## Development

For frontend development (hot reload):

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server will run on http://localhost:5173

## Production Build

The frontend Dockerfile uses a multi-stage build:
1. **Stage 1**: Build React app with Node.js
2. **Stage 2**: Serve static files with nginx

Environment variable `VITE_API_BASE_URL` is set at build time:
- **Docker**: `http://backend:8000` (internal service name)
- **Development**: `http://localhost:8000` (default)

## Stopping Services

```bash
docker-compose down
```

## Rebuilding Frontend Only

```bash
docker-compose up --build -d frontend
```
