#!/usr/bin/env bash
# Deploy deploy/ to Cloudflare Pages → games.beric.ca
#
# Usage:
#   ./scripts/deploy.sh                # production (branch=main)
#   ./scripts/deploy.sh preview        # preview branch
#   ENV_FILE=/path/to/.env ./scripts/deploy.sh
set -euo pipefail

ENV_FILE="${ENV_FILE:-/Users/ericbaruch/Arik/dev/.env}"
PROJECT_NAME="games-portal"
ACCOUNT_ID="4aaa700a51c34ad0f4e6b7b0eac98e89"
EMAIL="ericbaruch@gmail.com"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="$ROOT/deploy"
BRANCH="${1:-main}"

[[ -d "$DEPLOY_DIR" ]] || { echo "deploy dir missing: $DEPLOY_DIR" >&2; exit 1; }
[[ -f "$ENV_FILE"   ]] || { echo "env file missing: $ENV_FILE"   >&2; exit 1; }

CF_KEY="$(grep -i '^cloudflare Global API Key' "$ENV_FILE" | head -1 | sed -E 's/^[^:]+:[[:space:]]*//')"
[[ -n "$CF_KEY" ]] || { echo "Cloudflare Global API Key not found in $ENV_FILE" >&2; exit 1; }

export CLOUDFLARE_EMAIL="$EMAIL"
export CLOUDFLARE_API_KEY="$CF_KEY"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"

echo "→ Deploying $DEPLOY_DIR to Pages project '$PROJECT_NAME' (branch: $BRANCH)"
bunx wrangler pages deploy "$DEPLOY_DIR" \
  --project-name="$PROJECT_NAME" \
  --branch="$BRANCH" \
  --commit-dirty=true
