#!/usr/bin/env bash
set -euo pipefail

DAR_PATH="${DAR_PATH:-/workspace/daml-dist/fraudshield-canton-contracts-1.0.0.dar}"

if [ ! -f "$DAR_PATH" ]; then
  echo "DAR not found at $DAR_PATH"
  exit 1
fi

echo "Uploading DAR to participants..."
daml ledger upload-dar --host canton --port 5001 "$DAR_PATH"
daml ledger upload-dar --host canton --port 5011 "$DAR_PATH"
daml ledger upload-dar --host canton --port 5021 "$DAR_PATH"
daml ledger upload-dar --host canton --port 5031 "$DAR_PATH"

echo "DAR upload completed"
