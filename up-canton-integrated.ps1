$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot

Write-Host "Starting FraudShield + Canton + DAML contracts stack..."
docker compose pull
docker compose up --build -d

Write-Host "Stack started. Service status:" -ForegroundColor Green
docker compose ps

Write-Host "Backend health endpoint:" -ForegroundColor Cyan
Write-Host "  http://localhost:8080/api/health"
Write-Host "Frontend:" -ForegroundColor Cyan
Write-Host "  http://localhost:3000"
Write-Host "JSON API (BankA):" -ForegroundColor Cyan
Write-Host "  http://localhost:7575/v1/query"
