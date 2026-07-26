param(
    [string]$DarPath = "/daml-dist/fraudshield-canton-contracts-1.0.0.dar",
    [string]$CantonUploadConfig = "/canton/upload/canton-upload.conf",
    [string]$CantonUploadScript = "/canton/upload/upload-dar.canton"
)

if (-not (Test-Path $DarPath)) {
    Write-Error "DAR not found at $DarPath"
    exit 1
}

canton run $CantonUploadScript -c $CantonUploadConfig
exit $LASTEXITCODE
