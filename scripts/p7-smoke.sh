#!/usr/bin/env bash
set -euo pipefail

PORT=3119
BASE="http://127.0.0.1:$PORT"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FIX="/tmp/p7-smoke-$RANDOM.json"
PASS=0
FAIL=0

trap 'kill $SERVER_PID 2>/dev/null || true; rm -f "$FIX"' EXIT

note() { printf '  %s\n' "$*"; }
ok()   { PASS=$((PASS+1)); printf '  PASS  %s\n' "$*"; }
bad()  { FAIL=$((FAIL+1)); printf '  FAIL  %s\n' "$*"; }

assert_status() {
  local label="$1" expect="$2" what="$3" cookie="${4:-}"
  local code
  if [ -n "$cookie" ]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' -b "$cookie" "$BASE$what")
  else
    code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$what")
  fi
  if [ "$code" = "$expect" ]; then ok "$label (HTTP $code)"; else bad "$label (got $code, want $expect)"; fi
}

assert_redirect() {
  local label="$1" expect="$2" what="$3" cookie="${4:-}"
  local loc
  if [ -n "$cookie" ]; then
    loc=$(curl -s -o /dev/null -w '%{redirect_url}' -b "$cookie" "$BASE$what")
  else
    loc=$(curl -s -o /dev/null -w '%{redirect_url}' "$BASE$what")
  fi
  loc=${loc#"$BASE"}
  if [ "$loc" = "$expect" ]; then ok "$label (-> $loc)"; else bad "$label (redirect $loc, want $expect)"; fi
}

body_contains() {
  local label="$1" needle="$2" what="$3" cookie="${4:-}"
  local html
  if [ -n "$cookie" ]; then
    html=$(curl -s -L -b "$cookie" "$BASE$what")
  else
    html=$(curl -s -L "$BASE$what")
  fi
  # strip SSR comment nodes
  html=$(printf '%s' "$html" | python3 -c 'import sys,re; print(re.sub(r"<!--.*?-->","",sys.stdin.read(),flags=re.S))')
  if printf '%s' "$html" | grep -qF "$needle"; then ok "$label"; else bad "$label (missing: $needle)"; fi
}

note "building fixture"
FIX_JSON=$(npx tsx scripts/gen-order-fixture.ts)
printf '%s' "$FIX_JSON" > "$FIX"
OWNER_TOKEN=$(printf '%s' "$FIX_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);process.stdout.write(j.ownerToken)})')
OTHER_TOKEN=$(printf '%s' "$FIX_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);process.stdout.write(j.otherToken)})')

note "starting prod server on :$PORT"
npm run start -- --port $PORT &> /tmp/p7-ssr.log &
SERVER_PID=$!

for i in $(seq 1 60); do
  if curl -s -o /dev/null "$BASE/"; then break; fi
  if [ "$i" = 60 ]; then note "server did not start"; cat /tmp/p7-ssr.log; exit 1; fi
  sleep 1
done

note "== logged-out guards =="
assert_redirect "logged-out /checkout -> signin" "/signin?next=%2Fcheckout" "/checkout"
assert_redirect "logged-out /orders -> signin" "/signin?next=%2Forders" "/orders"
assert_redirect "logged-out /orders/:id -> signin" "/signin?next=%2Forders" "/orders/deadbeef"

note "== logged-in checkout page =="
COOKIE_OWN="amz_sid=$OWNER_TOKEN"
COOKIE_OTH="amz_sid=$OTHER_TOKEN"
assert_status "logged-in /checkout renders" 200 "/checkout" "$COOKIE_OWN"
body_contains "checkout has order total" "Order total" "/checkout" "$COOKIE_OWN"
body_contains "checkout has place button" "Place your order" "/checkout" "$COOKIE_OWN"
body_contains "checkout has review heading" "Review items and shipping" "/checkout" "$COOKIE_OWN"
body_contains "checkout shows cart line" "Fire TV Stick 4K Max" "/checkout" "$COOKIE_OWN"

note "== placing order =="
PLACED=$(npx tsx scripts/checkout-place.ts "$FIX")
note "$PLACED"
ORDER_ID=$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.orderId||"")' "$FIX")
ORDER_NUM=$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.orderNumber||"")' "$FIX")
if [ -z "$ORDER_ID" ]; then bad "order was placed"; exit 1; else ok "order was placed"; fi

note "== confirmation page =="
assert_status "owner confirmation 200" 200 "/order-confirmation/$ORDER_ID" "$COOKIE_OWN"
body_contains "confirmation thanks" "your order has been placed" "/order-confirmation/$ORDER_ID" "$COOKIE_OWN"
body_contains "confirmation number" "$ORDER_NUM" "/order-confirmation/$ORDER_ID" "$COOKIE_OWN"
assert_status "non-owner confirmation 404" 404 "/order-confirmation/$ORDER_ID" "$COOKIE_OTH"
assert_redirect "logged-out confirmation -> signin" "/signin?next=%2Faccount" "/order-confirmation/$ORDER_ID"

note "== orders list =="
assert_status "owner orders 200" 200 "/orders" "$COOKIE_OWN"
body_contains "orders heading" "Your Orders" "/orders" "$COOKIE_OWN"
body_contains "orders shows number" "$ORDER_NUM" "/orders" "$COOKIE_OWN"
assert_status "non-owner orders list 200 (empty)" 200 "/orders" "$COOKIE_OTH"

note "== order detail =="
assert_status "owner detail 200" 200 "/orders/$ORDER_ID" "$COOKIE_OWN"
body_contains "detail heading" "Order Details" "/orders/$ORDER_ID" "$COOKIE_OWN"
body_contains "detail address" "Austin" "/orders/$ORDER_ID" "$COOKIE_OWN"
body_contains "detail status" "Status:" "/orders/$ORDER_ID" "$COOKIE_OWN"
assert_status "non-owner detail 404" 404 "/orders/$ORDER_ID" "$COOKIE_OTH"
assert_status "missing order 404" 404 "/orders/deadbeef" "$COOKIE_OWN"

note "== account Orders link =="
body_contains "account links to orders" "View your orders" "/account" "$COOKIE_OWN"

note "== restoring fixture stock =="
npx tsx scripts/restore-fixture-stock.ts "$FIX" >/dev/null
ok "stock restored for smoke fixture skus"

printf '\n%d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] || exit 1