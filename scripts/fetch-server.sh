#!/usr/bin/env bash
# Downloads the Dulo server JAR that the image bundles into dist/server/, and checks that the
# server repository's release workflow built it. Needs the GitHub CLI, signed in (gh auth login,
# or GH_TOKEN in CI).
#
#   scripts/fetch-server.sh           # the version the Dockerfile pins (ARG SERVER_VERSION)
#   scripts/fetch-server.sh 0.4.0     # another version; build with --build-arg SERVER_VERSION=0.4.0
set -euo pipefail

cd "$(dirname "$0")/.."

readonly repo=dulo-family/dulo-server
version="${1:-$(sed -n 's/^ARG SERVER_VERSION=//p' Dockerfile)}"
if [[ -z "$version" ]]; then
  echo "No server version: pass one, or set ARG SERVER_VERSION in the Dockerfile." >&2
  exit 1
fi
jar="dulo-server-${version}.jar"
dir=dist/server

mkdir -p "$dir"
gh release download "v${version}" --repo "$repo" --pattern "$jar" --dir "$dir" --clobber
# Fails unless the server's release workflow built this exact file.
gh attestation verify "$dir/$jar" --repo "$repo" \
  --signer-workflow "$repo/.github/workflows/release.yml"
echo "Verified $dir/$jar"
