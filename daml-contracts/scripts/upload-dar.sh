#!/usr/bin/env bash
set -euo pipefail

DAR_PATH="${DAR_PATH:-/daml-dist/fraudshield-canton-contracts-1.0.0.dar}"
CANTON_UPLOAD_CONFIG="${CANTON_UPLOAD_CONFIG:-/canton/upload/canton-upload.conf}"
CANTON_UPLOAD_SCRIPT="${CANTON_UPLOAD_SCRIPT:-/canton/upload/upload-dar.canton}"

if [ ! -f "$DAR_PATH" ]; then
  echo "DAR not found at $DAR_PATH"
  exit 1
fi

exec canton run "$CANTON_UPLOAD_SCRIPT" -c "$CANTON_UPLOAD_CONFIG"