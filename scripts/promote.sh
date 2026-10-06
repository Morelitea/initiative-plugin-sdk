#!/usr/bin/env bash
# Cut a release: bump the package's version, stamp the changelog if there is
# one, and open a release pull request from release/vX.Y.Z to main. Merging it
# publishes the version (.github/workflows/publish.yml).
#
# The Promote workflow runs this as the release app; it mirrors the other
# repositories' promote.sh. Requires `gh` authenticated for the repository.

set -euo pipefail

usage() {
  cat <<USAGE
Usage: $0 [--patch | --minor | --major] [--dry-run]

Bumps the version in package.json and package-lock.json, moves the
[Unreleased] block of CHANGELOG.md (if the repository keeps one) under a
[X.Y.Z] heading, and opens a release pull request against main.
USAGE
}

bump=""
dry_run=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --patch|--minor|--major) bump="${1#--}" ; shift ;;
    --dry-run) dry_run=true ; shift ;;
    -h|--help) usage ; exit 0 ;;
    *) echo "unknown option: $1" >&2 ; usage ; exit 2 ;;
  esac
done

if [[ -z "$bump" ]]; then
  echo "error: pick one of --patch / --minor / --major" >&2
  usage
  exit 2
fi

# A release is cut from a clean, current main, so the release branch holds
# exactly what is integrated there.
if ! $dry_run; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "error: working tree is dirty; commit or stash first" >&2
    exit 1
  fi
fi
git fetch origin --prune --tags --quiet
if ! $dry_run; then
  git switch --quiet main
  git merge --ff-only --quiet origin/main
fi

current="$(node -p "require('./package.json').version")"
if [[ ! "$current" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  echo "error: package.json version $current is not X.Y.Z" >&2
  exit 1
fi
major="${BASH_REMATCH[1]}" minor="${BASH_REMATCH[2]}" patch="${BASH_REMATCH[3]}"
case "$bump" in
  patch) patch=$((patch + 1)) ;;
  minor) minor=$((minor + 1)) ; patch=0 ;;
  major) major=$((major + 1)) ; minor=0 ; patch=0 ;;
esac
new="${major}.${minor}.${patch}"
today="$(date -u +%Y-%m-%d)"

echo "current: $current"
echo "new:     $new"

# main's own version should already be released. When it is not, a merge
# bumped it by hand and its release is pending (or failed): cutting another on
# top would skip it.
if ! git rev-parse -q --verify "refs/tags/v$current" >/dev/null; then
  echo "error: main is at $current, which has no tag v$current yet." >&2
  echo "       Let its release finish (Actions → Publish) before cutting another." >&2
  exit 1
fi
if git rev-parse -q --verify "refs/tags/v$new" >/dev/null; then
  echo "error: tag v$new already exists" >&2
  exit 1
fi
# A release that is cut and still open leaves no tag; refuse rather than fail
# at the push.
if git rev-parse -q --verify "refs/remotes/origin/release/v$new" >/dev/null; then
  echo "error: release/v$new already exists — v$new is already cut." >&2
  echo "       Merge its pull request, or delete the branch to redo it." >&2
  exit 1
fi

if $dry_run; then
  echo "dry-run: no changes written"
  exit 0
fi

npm version "$new" --no-git-tag-version --ignore-scripts >/dev/null
files=(package.json package-lock.json)

if [[ -f CHANGELOG.md ]]; then
  if ! grep -q '^## \[Unreleased\]' CHANGELOG.md; then
    echo "error: [Unreleased] section missing from CHANGELOG.md" >&2
    exit 1
  fi
  stamped="$(mktemp)"
  awk -v ver="$new" -v date="$today" '
    !done && /^## \[Unreleased\]/ {
      print
      print ""
      print "## [" ver "] - " date
      done = 1
      next
    }
    { print }
  ' CHANGELOG.md > "$stamped"
  mv "$stamped" CHANGELOG.md
  files+=(CHANGELOG.md)
fi

branch="release/v$new"
git switch -c "$branch"
git add "${files[@]}"
git commit -m "Release v$new"
git push -u origin "$branch"

gh pr create \
  --base main \
  --head "$branch" \
  --title "Release v$new" \
  --body "Automated release pull request. Merging it tags v$new, cuts its GitHub Release and publishes initiative-plugin-sdk@$new to npm, once the \`npm\` environment approves."
