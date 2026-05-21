#!/usr/bin/env bash
set -euo pipefail

echo "==> Staging all changes"
git add .

echo "==> Resetting index to drop files now covered by .gitignore"
git rm -r --cached . || true

echo "==> Re-staging tracked files (respecting .gitignore)"
git add .

COMMIT_MSG="wired up resend auth flow and cleaned auth UI wiring"

echo "==> Creating commit"
git commit -m "$COMMIT_MSG"

echo "==> Pushing to origin on current branch"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git push origin "$CURRENT_BRANCH"

echo "==> Done"
