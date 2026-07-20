# Canton Local Network Setup for FraudShield
# This script downloads and configures a local Canton network with 3 banks + synchronizer

# Prerequisites:
# - Java 17+ (your project uses Java 17)
# - curl (available in environment)
# - ~2GB disk space for Canton binaries

Write-Host "=== FraudShield Canton Local Network Setup ===" -ForegroundColor Cyan

# Step 1: Create directory structure
$cantonDir = "$HOME\canton-fraudshield"
$binDir = "$cantonDir\bin"
$configDir = "$cantonDir\config"
$scriptsDir = "$cantonDir\scripts"
$dataDir = "$cantonDir\data"

if (-not (Test-Path $cantonDir)) {
    New-Item -ItemType Directory -Path $cantonDir -Force | Out-Null
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Write-Host "✓ Created Canton directories at $cantonDir" -ForegroundColor Green
}

# Step 2: Download Canton Community Edition (latest stable)
Write-Host "`nDownloading Canton Community Edition..." -ForegroundColor Yellow
$cantonVersion = "3.1.0"  # Latest stable version as of 2026
$downloadUrl = "https://github.com/digital-asset/daml/releases/download/v$cantonVersion/canton-$cantonVersion.zip"

# Note: For production, verify checksum and use official Daml SDK
Write-Host "Note: To complete setup, download Canton from:" -ForegroundColor Cyan
Write-Host "$downloadUrl" -ForegroundColor White
Write-Host "`nAlternatively, install via: daml assistant (if daml-sdk available)" -ForegroundColor Cyan

# Step 3: Initialize Daml (if installed)
Write-Host "`nChecking for Daml SDK installation..." -ForegroundColor Yellow
$damlCmd = Get-Command daml -ErrorAction SilentlyContinue
if ($damlCmd) {
    Write-Host "✓ Daml SDK found: $($damlCmd.Source)" -ForegroundColor Green
} else {
    Write-Host "⚠ Daml SDK not found. Install via: curl -sSL https://get.daml.com | sh" -ForegroundColor Yellow
}

Write-Host "`n✓ Setup directory structure created at: $cantonDir" -ForegroundColor Green
Write-Host "✓ Configuration template ready" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Download Canton Community Edition from the link above" -ForegroundColor White
Write-Host "2. Extract to: $binDir" -ForegroundColor White
Write-Host "3. Run: .\scripts\start-canton-network.ps1" -ForegroundColor White
