#!/usr/bin/env bash
set -euo pipefail

DAR_PATH="${DAR_PATH:-/daml-dist/fraudshield-canton-contracts-1.0.0.dar}"
MAX_ATTEMPTS="${DAR_UPLOAD_MAX_ATTEMPTS:-12}"
RETRY_DELAY_SECONDS="${DAR_UPLOAD_RETRY_DELAY_SECONDS:-5}"

if [ ! -f "$DAR_PATH" ]; then
  echo "DAR not found at $DAR_PATH"
  exit 1
fi

upload_dar() {
  local host="$1"
  local port="$2"
  local attempt

  for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    echo "Uploading $DAR_PATH to ${host}:${port} (attempt ${attempt}/${MAX_ATTEMPTS})"
    if daml ledger upload-dar --host "$host" --port "$port" "$DAR_PATH"; then
      return 0
    fi

    if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
      echo "Upload to ${host}:${port} failed; retrying in ${RETRY_DELAY_SECONDS}s..."
      sleep "$RETRY_DELAY_SECONDS"
    fi
  done

  echo "Upload to ${host}:${port} failed after ${MAX_ATTEMPTS} attempts"
  return 1
}

echo "Uploading DAR to participants..."
upload_dar canton 5001
upload_dar canton 5011
upload_dar canton 5021
upload_dar canton 5031

echo "DAR upload completed"
