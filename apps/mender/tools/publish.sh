#!/bin/zsh
# Publish the version at HEAD as a GitHub release, which every installed
# Mender then finds, fetches and swaps itself to. Only ever run on purpose:
# a release is what other machines update to.
#
#   apps/mender/tools/publish.sh          publish
#   DRAFT=1 apps/mender/tools/publish.sh  a draft only Mender run with
#                                         MENDER_UPDATE_DRAFTS=1 will see
#
# Built from a clean export of HEAD, since other sessions' half-finished
# files sit in the shared working tree.
set -euo pipefail
setopt null_glob

REPO=ktesfaye/mender
root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
cd "$root"

v=$(git show HEAD:apps/mender/package.json | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")).version)')
tag="mender-v$v"

if gh release view "$tag" --repo "$REPO" >/dev/null 2>&1; then
  echo "$tag is already published" >&2
  exit 1
fi

prev=$(gh release list --repo "$REPO" --exclude-drafts --limit 1 --json tagName -q '.[0].tagName' || true)
range=${prev:+$prev..}HEAD
notes=$(git log "$range" --format=%s -- apps/mender packages/village \
  | grep -E '^[a-z]+\(mender\)' | sed -E 's/^[a-z]+\(mender\): /- /' || true)

work=$(mktemp -d /tmp/mender-publish.XXXXXX)
trap 'rm -rf "$work"' EXIT
git archive HEAD | tar -x -C "$work"
for nm in node_modules apps/*/node_modules packages/*/node_modules packages/*/*/node_modules; do
  [[ -d "$root/$nm" && -d "$work/${nm:h}" ]] && ln -s "$root/$nm" "$work/$nm"
done
cp "$root"/apps/mender/build/icon.* "$work/apps/mender/build/" 2>/dev/null || true

(cd "$work/apps/mender" && env -u ELECTRON_RUN_AS_NODE pnpm run package)

app="$work/apps/mender/release/mac-arm64/Mender.app"
dmg="$work/apps/mender/release/Mender-$v-arm64.dmg"
[[ -f "$app/Contents/Resources/app.asar.unpacked/out/main/adapters/claude-acp.mjs" ]] \
  || { echo "the build has no agent adapters in it; not publishing" >&2; exit 1; }
[[ -f "$dmg" ]] || { echo "no dmg came out of the build" >&2; exit 1; }
# One name across every release, so "latest" always has the same download.
mv "$dmg" "$work/Mender-arm64.dmg"
dmg="$work/Mender-arm64.dmg"

git rev-parse -q --verify "refs/tags/$tag" >/dev/null || git tag "$tag" HEAD
git push origin "refs/tags/$tag"

body="Download **Mender-arm64.dmg**, drag Mender into Applications, then run \`xattr -dr com.apple.quarantine /Applications/Mender.app\` once since it isn't notarised. Apple Silicon only. An installed Mender from 0.72 on updates itself from here.

$notes"

gh release create "$tag" "$dmg" --repo "$REPO" \
  --title "Mender $v" --notes "$body" --verify-tag ${DRAFT:+--draft}

echo "published $tag"
