$ErrorActionPreference = 'Stop'

$darPath = if ($env:DAR_PATH) { $env:DAR_PATH } else { '.\daml-dist\fraudshield-canton-contracts-1.0.0.dar' }

if (-not (Test-Path $darPath)) {
    throw "DAR not found at $darPath"
}

Write-Host "Uploading DAR to participants..."
daml ledger upload-dar --host localhost --port 5001 $darPath
daml ledger upload-dar --host localhost --port 5011 $darPath
daml ledger upload-dar --host localhost --port 5021 $darPath
daml ledger upload-dar --host localhost --port 5031 $darPath
Write-Host "DAR upload completed"
