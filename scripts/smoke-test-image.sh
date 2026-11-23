#!/usr/bin/env bash
# Starts the image without any configuration and checks that nginx serves the web client, passes
# the server's paths on, and that the container stops cleanly.
#
#   scripts/smoke-test-image.sh dulo:dev [port]
set -euo pipefail

image="${1:?Usage: scripts/smoke-test-image.sh <image> [port]}"
port="${2:-18080}"
base="http://localhost:${port}"
name="dulo-smoke-$$"

fail() {
  echo "❌ $*" >&2
  docker logs "$name" 2>&1 | tail -n 40 >&2 || true
  docker rm -f "$name" >/dev/null 2>&1 || true
  exit 1
}

check() {
  local description="$1"
  shift
  if "$@"; then echo "✅ $description"; else fail "$description"; fi
}

# True when no line of the text matches the pattern (case-insensitive).
lacks() {
  ! grep -qi "$1" <<<"$2"
}

# The status code, then the headers, of a request that doesn't follow redirects.
head_of() {
  curl -sS -o /dev/null -D - "$@"
}

docker run -d --name "$name" -p "${port}:8080" -e DULO_PUBLIC_URL="$base" "$image" >/dev/null

for _ in $(seq 1 90); do
  [[ "$(docker inspect -f '{{.State.Health.Status}}' "$name")" == healthy ]] && break
  [[ "$(docker inspect -f '{{.State.Running}}' "$name")" == true ]] || fail "The container stopped"
  sleep 1
done
check "the container is healthy" \
  test "$(docker inspect -f '{{.State.Health.Status}}' "$name")" == healthy

index="$(head_of "$base/")"
check "/ serves the web client" grep -q '^HTTP/1.1 200' <<<"$index"
check "index.html is not cached" grep -qi '^cache-control: no-cache' <<<"$index"
check "index.html has a CSP with a script hash" \
  grep -qiE "^content-security-policy: .*script-src 'self' 'sha256-" <<<"$index"
check "app routes get index.html" \
  grep -q '<dulo-root>' <<<"$(curl -sS "$base/sign-in")"
check "a missing file is a 404" \
  grep -q '^HTTP/1.1 404' <<<"$(head_of "$base/missing.js")"
script="$(curl -sS "$base/" | grep -o 'main-[A-Za-z0-9]*\.js' | head -n 1)"
check "hashed files are cached for good" \
  grep -qi '^cache-control: max-age=' <<<"$(head_of "$base/$script")"

check "the API answers through nginx" \
  grep -q '"pending":true' <<<"$(curl -sS "$base/api/v1/setup/status")"
check "API responses don't get the web client's CSP" \
  lacks '^content-security-policy' "$(head_of "$base/api/v1/setup/status")"
check "the issuer is the public URL" \
  grep -q "\"issuer\":\"$base\"" <<<"$(curl -sS "$base/.well-known/openid-configuration")"
authorize="$base/oauth2/authorize?response_type=code&client_id=dulo-web"
authorize+="&redirect_uri=$base/auth/callback&scope=openid&code_challenge_method=S256"
authorize+="&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSBAAAAA"
check "the web client is registered without configuration" \
  grep -qi "^location: $base/sign-in" <<<"$(head_of "$authorize")"

started="$(date +%s)"
docker stop -t 30 "$name" >/dev/null
check "the container stops within 30 seconds" test $(($(date +%s) - started)) -lt 30
check "the server shut down gracefully" \
  grep -q 'Graceful shutdown complete' <<<"$(docker logs "$name" 2>&1)"
docker rm "$name" >/dev/null

# When the server dies, the container must stop too, so Docker can restart it.
docker run -d --name "$name" "$image" >/dev/null
for _ in $(seq 1 90); do
  [[ "$(docker inspect -f '{{.State.Health.Status}}' "$name")" == healthy ]] && break
  sleep 1
done
docker exec "$name" pkill -KILL -x java
for _ in $(seq 1 10); do
  [[ "$(docker inspect -f '{{.State.Running}}' "$name")" == false ]] && break
  sleep 1
done
check "the container stops when the server dies" \
  test "$(docker inspect -f '{{.State.Running}}' "$name")" == false
docker rm -f "$name" >/dev/null
echo "All checks passed."
