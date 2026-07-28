# Run FraudShield locally with Docker Compose

This guide starts the React frontend, Spring Boot backend, and MongoDB locally with Docker Compose.

## Prerequisites

Install Docker Desktop or Docker Engine with the Docker Compose plugin, then start Docker.

## Start the full stack

From the repository root, run:

```bash
docker compose up --build
```

Docker Compose builds:

- `fraudshield-backend:local` from `Backend/Dockerfile`
- `fraudshield-frontend:local` from `FrontEnd/Dockerfile`
- `mongo:7` for MongoDB

## Open the app

Open the frontend in your browser:

```text
http://localhost:3000
```

The frontend container serves the built React app with Nginx. Nginx proxies `/api`, `/health`, `/ready`, and `/ws` requests to the backend container.

The backend is also exposed directly for debugging:

```text
http://localhost:8080
```

MongoDB is exposed locally for database tools:

```text
mongodb://fraudshield:fraudshield-local-password@localhost:27017/fraudshield?authSource=admin
```

## Verify the services

In another terminal, run:

```bash
docker compose ps
curl http://localhost:8080/health
curl http://localhost:8080/ready
```

`/ready` should report MongoDB as available after MongoDB finishes starting.

## Stop the stack

Stop containers while preserving MongoDB data:

```bash
docker compose down
```

Stop containers and delete the local MongoDB volume:

```bash
docker compose down -v
```

## Optional Cortex API key

If you have a Cortex API key, pass it when starting the stack:

```bash
CORTEX_API_KEY="your-key" docker compose up --build
```

If you do not set it, the backend uses the existing placeholder fallback.

## Troubleshooting

View logs for all services:

```bash
docker compose logs -f
```

View only backend logs:

```bash
docker compose logs -f fraudshield-backend
```

Rebuild from scratch:

```bash
docker compose build --no-cache
docker compose up
```
