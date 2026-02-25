#!/bin/bash
# Run a tsx script with .env.local loaded from the main repo root.
#
# tsx doesn't load .env.local automatically, and worktrees don't have
# their own copy.  This helper finds .env.local in the main repo root
# and sources it before executing the script.
#
# Usage:
#   bash scripts/with-staging-env.sh scripts/seed-translations.ts --apply
#   bash scripts/with-staging-env.sh scripts/seed-reference-data.ts

set -euo pipefail

# Find the main repo root (works from worktrees too)
REPO_ROOT="$(git worktree list --porcelain 2>/dev/null | head -1 | sed 's/^worktree //')"
if [ -z "$REPO_ROOT" ]; then
  REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
fi

ENV_FILE="$REPO_ROOT/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ No .env.local found at $ENV_FILE"
  echo "   Run from the main repo root:"
  echo "   npx vercel env pull .env.local --environment preview"
  exit 1
fi

if [ $# -eq 0 ]; then
  echo "Usage: bash scripts/with-staging-env.sh scripts/<script>.ts [args...]"
  echo ""
  echo "Examples:"
  echo "  bash scripts/with-staging-env.sh scripts/seed-translations.ts --apply"
  echo "  bash scripts/with-staging-env.sh scripts/seed-reference-data.ts"
  exit 1
fi

# Source env vars (set -a exports all vars, set +a stops exporting)
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "✅ Loaded env from $ENV_FILE"
exec npx tsx "$@"
