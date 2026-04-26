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

SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%s)"
BUILD_DIR="$(mktemp -d -t games-portal-build-XXXXXX)"
trap 'rm -rf "$BUILD_DIR"' EXIT
cp -R "$DEPLOY_DIR/." "$BUILD_DIR/"

# Append ?v=<sha> to local css/js refs so browsers fetch fresh assets per deploy.
while IFS= read -r -d '' f; do
  sed -i.bak -E \
    -e "s#(href=\"\\./[^\"?]+\\.css)\"#\\1?v=${SHA}\"#g" \
    -e "s#(src=\"\\./[^\"?]+\\.js)\"#\\1?v=${SHA}\"#g" \
    "$f"
  rm -f "$f.bak"
done < <(find "$BUILD_DIR" -name "*.html" -print0)

# Stamp the service worker cache version so each deploy invalidates the PWA cache.
while IFS= read -r -d '' sw; do
  sed -i.bak "s/__SW_VERSION__/${SHA}/g" "$sw"
  rm -f "$sw.bak"
done < <(find "$BUILD_DIR" -name "service-worker.js" -print0)

echo "→ Deploying $BUILD_DIR (cache-bust v=$SHA) to Pages project '$PROJECT_NAME' (branch: $BRANCH)"
bunx wrangler pages deploy "$BUILD_DIR" \
  --project-name="$PROJECT_NAME" \
  --branch="$BRANCH" \
  --commit-dirty=true
