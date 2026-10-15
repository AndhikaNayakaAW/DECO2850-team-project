#!/usr/bin/env bash
set -euo pipefail

mode="publish"
if [[ "${1:-}" == "--dry-run" && "$#" -eq 1 ]]; then
  mode="preview"
elif [[ "$#" -ne 0 ]]; then
  echo "Usage: bash scripts/publish-wiki.sh [--dry-run]" >&2
  exit 2
fi

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
wiki_remote="https://github.com/AndhikaNayakaAW/DECO2850-team-project.wiki.git"
wiki_checkout="$(mktemp -d "${TMPDIR:-/tmp}/offshift-wiki.XXXXXX")"
trap 'rm -rf "$wiki_checkout"' EXIT

if ! git clone --quiet "$wiki_remote" "$wiki_checkout"; then
  echo "Create and save the initial Home page on GitHub, then run this again:" >&2
  echo "https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/_new" >&2
  exit 1
fi

for page in Home Getting-Started Design-and-Research Architecture Testing-and-TDD Deployment Watch-and-Reflection Weekly-Contribution _Sidebar _Footer; do
  cp "$project_root/docs/wiki/$page.md" "$wiki_checkout/$page.md"
done

git -C "$wiki_checkout" add -- '*.md'
if git -C "$wiki_checkout" diff --cached --quiet; then
  echo "Wiki is already up to date."
  exit 0
fi

git -C "$wiki_checkout" diff --cached --stat
if [[ "$mode" == "preview" ]]; then
  git -C "$wiki_checkout" diff --cached
  exit 0
fi

# Carry the source repository's configured identity into the separate wiki repo.
git -C "$wiki_checkout" config user.name "$(git -C "$project_root" config user.name)"
git -C "$wiki_checkout" config user.email "$(git -C "$project_root" config user.email)"
git -C "$wiki_checkout" commit -m "docs: publish the Offshift project handbook"
git -C "$wiki_checkout" push origin HEAD
