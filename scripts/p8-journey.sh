#!/usr/bin/env bash
# P8 selection-checkout SSR journey (prod server).
#   A) /checkout?items=<skuA> SSR renders ONLY the skuA line (title + total).
#   B) /checkout (no items) still renders BOTH lines  -> regression guard.
#   C) scripts/checkout-partial.ts places a PARTIAL order for skuA only (core passes).
#   D) /cart SSR keeps skuB line, drops skuA line.
#   E) /order-confirmation + /orders render the partial order number.
set -euo pipefail

PORT=3208
BASE="http://127.0.0.1:$PORT"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FIX="/tmp/p8-journey-$RANDOM.json"
FIXHTML="/tmp/p8-journey-$RANDOM.html"
COOKIE=""
PASS=0
FAIL=0
SERVER_PID=""

trap 'kill $SERVER_PID 2>/dev/null || true; rm -f "$FIX" "$FIXHTML"' EXIT

note() { printf '\n== %s ==\n' "$*"; }
ok()   { PASS=$((PASS+1)); printf '  PASS  %s\n' "$*"; }
bad()  { FAIL=$((FAIL+1)); printf '  FAIL  %s\n' "$*"; }

fetch_html() {
  local url="$1" cookie="${2:-}"
  if [ -n "$cookie" ]; then
    curl -s -L -b "$cookie" "$BASE$url"
  else
    curl -s -L "$BASE$url"
  fi
}

ssr_has() {
  local label="$1" needle="$2" url="$3"
  local html
  html=$(fetch_html "$url" "$COOKIE")
  html=$(printf '%s' "$html" | python3 -c 'import sys,html,re; print(html.unescape(re.sub(r"<!--.*?-->","",sys.stdin.read(),flags=re.S)))')
  if printf '%s' "$html" | grep -qF "$needle"; then ok "$label"; else bad "$label (missing: $needle)"; fi
}

ssr_lacks() {
  local label="$1" needle="$2" url="$3"
  local html
  html=$(fetch_html "$url" "$COOKIE")
  html=$(printf '%s' "$html" | python3 -c 'import sys,html,re; print(html.unescape(re.sub(r"<!--.*?-->","",sys.stdin.read(),flags=re.S)))')
  if printf '%s' "$html" | grep -qF "$needle"; then bad "$label (present: $needle)"; else ok "$label"; fi
}

assert_status() {
  local label="$1" expect="$2" url="$3"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE" "$BASE$url")
  if [ "$code" = "$expect" ]; then ok "$label (HTTP $code)"; else bad "$label (got $code, want $expect)"; fi
}

note "building fixture"
FIX_JSON=$(npx tsx scripts/p8-prep.ts "$FIX")
echo "$FIX_JSON"
COOKIE="amz_sid=$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.token)' "$FIX")"
SKUA=$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.skuA)' "$FIX")
SKUB=$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.skuB)' "$FIX")
TITLEA=$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.titleALive)' "$FIX")
TITLEB=$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.titleBLive)' "$FIX")
TOTALA=$(node -e 'const j=require(process.argv[1]);process.stdout.write(String(j.totalA))' "$FIX")

note "starting prod server on :$PORT"
npm run start -- --port $PORT &> /tmp/p8-journey.log &
SERVER_PID=$!
for i in $(seq 1 90); do
  if curl -s -o /dev/null -b "$COOKIE" "$BASE/"; then break; fi
  if [ "$i" = 90 ]; then note "server did not start"; cat /tmp/p8-journey.log; exit 1; fi
  sleep 1
done

note "== A. selection checkout SSR =="
assert_status "checked selected checkout 200" 200 "/checkout?items=$SKUA"
ssr_has   "selected line title"       "$TITLEA"   "/checkout?items=$SKUA"
ssr_lacks "unselected line excluded"   "$TITLEB"   "/checkout?items=$SKUA"

note "== B. full checkout SSR (regression) =="
assert_status "full checkout 200" 200 "/checkout"
ssr_has "full checkout has skuA" "$TITLEA" "/checkout"
ssr_has "full checkout has skuB" "$TITLEB" "/checkout"

note "== C. partial purchase (core) =="
PARTIAL=$(npx tsx scripts/checkout-partial.ts "$FIX")
echo "$PARTIAL"
printf '%s' "$PARTIAL" | grep -q "ALL PASS" || { bad "partial core"; exit 1; }
ORDERID=$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.orderId||"")' "$FIX")

note "== D. cart after partial =="
ssr_has   "cart keeps skuB"  "(P8-KEEP)"   "/cart"
ssr_lacks "cart drops skuA"  "(P8-SEL)"    "/cart"

note "== E. confirmation + orders =="
assert_status "confirmation 200" 200 "/order-confirmation/$ORDERID"
ssr_has "orders list has skuA title" "$TITLEA" "/order-confirmation/$ORDERID"
assert_status "orders page 200" 200 "/orders"
ssr_has "orders shows skuA title" "$TITLEA" "/orders"

printf '\nP8 journey: %d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
