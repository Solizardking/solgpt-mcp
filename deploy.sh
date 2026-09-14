#!/usr/bin/env bash
# Always use the repository root as the Docker build context.
# Bare `fly deploy` from this directory sends mcp-server/ as context, so
# COPY mcp-server/package.json and COPY docs fail with "not found".
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
exec fly deploy \
  --config mcp-server/fly.toml \
  --dockerfile mcp-server/Dockerfile \
  --ignorefile mcp-server/Dockerfile.dockerignore \
  --ha=false \
  "$@"
