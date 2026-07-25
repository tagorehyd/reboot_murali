# Run FraudShield locally with Docker Compose and full Canton deployment

This guide starts the complete local stack with Docker Compose:

- MongoDB projection/read-model database
- Canton network with BankA, BankB, BankC, and GlobalSynchronizer participants
- DAML contract build and DAR upload jobs
- DAML JSON API instances for the bank participants
- Spring Boot backend configured for real Canton/DAML submission
- React frontend served by Nginx

## Prerequisites

Install Docker Desktop or Docker Engine with the Docker Compose plugin, then start Docker.

> The first run downloads the Canton, DAML SDK, MongoDB, Java, and Node/Nginx images, so it can take several minutes.

## One-command full deployment

From the repository root, run:

```bash
./up-canton-integrated.sh
```

The script runs `docker compose pull` and then starts the full stack in detached mode with `docker compose up --build -d`.

## Manual full deployment

If you prefer to run the Docker Compose commands yourself, use:

```bash
docker compose pull
docker compose up --build -d
```

Docker Compose starts these services:

| Service | Purpose | Local endpoint |
| --- | --- | --- |
| `mongodb` | MongoDB database for FraudShield projections | `localhost:27017` |
| `canton` | Canton domain plus BankA, BankB, BankC, and GlobalSynchronizer participants | Ledger APIs on `5001`, `5011`, `5021`, `5031` |
| `daml-build` | One-shot DAML build job that writes the DAR to `daml-dist/` | n/a |
| `daml-upload` | One-shot DAR upload job for all four Canton participants | n/a |
| `json-api-banka` | DAML JSON API for BankA | `http://localhost:7575` |
| `json-api-bankb` | DAML JSON API for BankB | `http://localhost:7585` |
| `json-api-bankc` | DAML JSON API for BankC | `http://localhost:7595` |
| `fraudshield-backend` | Spring Boot backend with Canton enabled | `http://localhost:8080` |
| `fraudshield-frontend` | Built React app served by Nginx | `http://localhost:3000` |

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

## Verify the deployment

Wait until the one-shot `daml-build` and `daml-upload` jobs have completed successfully and the long-running services are healthy or running:

```bash
docker compose ps
```

Then check the backend probes:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/ready
```

`/ready` should report MongoDB as available and should include Canton readiness information when `CANTON_ENABLED=true`.

You can also confirm that the BankA DAML JSON API is responding:

```bash
curl -X POST http://localhost:7575/v1/query \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer BankA_Party' \
  -d '{}'
```

## Important environment variables

The default Docker Compose configuration enables Canton-backed submission for the backend. Override these variables only when needed:

```bash
CANTON_ENABLED=true \
CANTON_REAL_SUBMISSION_ENABLED=true \
CANTON_JSON_API_DEFAULT_PARTICIPANT=banka \
CORTEX_API_KEY="your-key" \
docker compose up --build -d
```

Common overrides:

- `CANTON_IMAGE` - Canton Docker image, default `digitalasset/canton-open-source:latest`.
- `DAML_SDK_IMAGE` - DAML SDK Docker image, default `digitalasset/daml-sdk:3.1.0`.
- `CORTEX_API_KEY` - optional Cortex API key for AI anomaly review.
- `CANTON_REAL_SUBMISSION_ENABLED` - set to `false` to keep Canton connectivity configured but disable real DAML JSON API submissions.

## Follow logs

View logs for all services:

```bash
docker compose logs -f
```

View specific logs while diagnosing startup:

```bash
docker compose logs -f canton
docker compose logs -f daml-build daml-upload
docker compose logs -f fraudshield-backend
```

## Restart or rebuild

Restart the existing deployment:

```bash
docker compose restart
```

Rebuild application images and restart:

```bash
docker compose up --build -d
```

Rebuild from scratch without using build cache:

```bash
docker compose build --no-cache
docker compose up -d
```

## Stop the stack

Stop containers while preserving MongoDB data:

```bash
docker compose down
```

Stop containers and delete the local MongoDB volume:

```bash
docker compose down -v
```

## Troubleshooting

### DAML upload did not complete

Check the build and upload job logs:

```bash
docker compose logs daml-build daml-upload
```

If the DAR was not generated, rebuild the DAML project:

```bash
docker compose run --rm daml-build
```

Then rerun the upload job:

```bash
docker compose run --rm daml-upload
```

### Backend readiness is not ready

Check MongoDB, Canton, JSON API, and backend status:

```bash
docker compose ps
docker compose logs fraudshield-backend canton json-api-banka
curl http://localhost:8080/ready
```

The backend container connects to Canton by service name (`canton`) and to the BankA JSON API at `http://json-api-banka:7575` inside the Docker network.

### Reset everything

Use this when local state is inconsistent and you want a clean deployment:

```bash
docker compose down -v
docker compose up --build -d
```
