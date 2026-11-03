#!/usr/bin/env bash
set -euo pipefail

mkdir -p var/preview
preview_port="${PREVIEW_PORT:-18787}"
PORT="$preview_port" node --env-file-if-exists=.env --import tsx src/server.ts >var/preview-server.log 2>&1 &
rig_pid=$!
trap 'kill "$rig_pid" 2>/dev/null || true; wait "$rig_pid" 2>/dev/null || true' EXIT

if ! curl --fail --silent --show-error --connect-timeout 1 --max-time 5 \
  --retry 10 --retry-delay 1 --retry-connrefused \
  "http://127.0.0.1:$preview_port/digest/2026-10-28" --output var/preview/index.html \
  2>var/preview-fetch.log; then
  cat var/preview-fetch.log >&2
  exit 1
fi
kill -0 "$rig_pid"
echo 'Saved var/preview/index.html. Nothing has been published.'
