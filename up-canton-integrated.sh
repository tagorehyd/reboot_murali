#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Starting FraudShield + Canton + DAML contracts stack..."
docker compose pull
docker compose up --build -d

echo "Stack started. Service status:"
docker compose ps

echo "Backend health endpoint: http://localhost:8080/api/health"
echo "Frontend: http://localhost:3000"
echo "JSON API (BankA): http://localhost:7575/v1/query"
