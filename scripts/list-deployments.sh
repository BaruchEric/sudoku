#!/usr/bin/env bash
# List recent Cloudflare Pages deployments for games-portal.
set -euo pipefail

ENV_FILE="${ENV_FILE:-/Users/ericbaruch/Arik/dev/.env}"
PROJECT_NAME="games-portal"
ACCOUNT_ID="4aaa700a51c34ad0f4e6b7b0eac98e89"
EMAIL="ericbaruch@gmail.com"

[[ -f "$ENV_FILE" ]] || { echo "env file missing: $ENV_FILE" >&2; exit 1; }
CF_KEY="$(grep -i '^cloudflare Global API Key' "$ENV_FILE" | head -1 | sed -E 's/^[^:]+:[[:space:]]*//')"
[[ -n "$CF_KEY" ]] || { echo "Cloudflare Global API Key not found in $ENV_FILE" >&2; exit 1; }

export CLOUDFLARE_EMAIL="$EMAIL"
export CLOUDFLARE_API_KEY="$CF_KEY"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"

bunx wrangler pages deployment list --project-name="$PROJECT_NAME"
