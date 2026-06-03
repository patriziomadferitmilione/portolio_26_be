#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -n "$(git status --porcelain -- package-lock.json)" ]]; then
  echo "Resetting server-local package-lock.json drift before pulling."
  git restore package-lock.json
fi

remaining_changes="$(git status --porcelain)"
if [[ -n "$remaining_changes" ]]; then
  echo "Refusing to deploy because the working tree has local changes:"
  echo "$remaining_changes"
  exit 1
fi

git pull --ff-only
npm ci
