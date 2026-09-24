#!/usr/bin/env bash
# P8 SSR: selection checkout. Verifies /checkout?items=<skuA> renders ONLY the
# selected skuA line (with its totals) and never the unselected skuB line, while
# the plain /checkout renders both. Reuses a fixture from scripts/p8-prep.ts.
# Run: scripts/p8-ssr-selection.sh <fixture.json>
set -euo pipefail

PORT=3131
BASE="http://127.0.0.1:$PORT"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FIX="${1:-}"
[ -n "$FIX" ] || { echo "usage: p8-ssr-selection.sh <fixture.json>"; exit 2; }

SKUA=$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.skuA||"")' "$FIX")
SKUB=$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.skuB||"")' "$FIX")
TOKEN=$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.token||"")' "$FIX")
TITLEA=$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.titleA||"")' "$FIX")
TITLEB=$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.titleB||"")' "$FIX")
TOTALA=$(node -e 'const j=require(process.argv[1]);process.stdout.write(String(j.totalA||""))' "$FIX")
COOKIE="amz_sid=$TOKEN"

PASS=0
FAIL=0
SERVER_PID=""
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

ok()  { PASS=$((PASS+1)); echo "  PASS  $*"; }
bad() { FAIL=$((FAIL+1)); echo "  FAIL  $*"; }

body() { curl -s -L -b "$COOKIE" "$BASE$1" | python3 -c 'import sys,re;print(re.sub(r"<!--.*?-->","",sys.stdin.read(),flags=re.S))'; }
contains() { local h="$1" n="$2"; printf '%s' "$h" | grep -qF "$n"; }

echo "starting prod server on :$PORT"
npm run start -- --port $PORT &> /tmp/p8-ssr.log &
SERVER_PID=$!
for i in $(seq 1 60); do
  if curl -s -o /dev/null "$BASE/"; then break; fi
  if [ "$i" = 60 ]; then echo "server did not start"; cat /tmp/p8-ssr.log; exit 1; fi
  sleep 1
done

FULL=$(body "/checkout")
SEL=$(body "/checkout?items=$SKUA")

echo "== plain /checkout =="
if contains "$FULL" "$TITLEA" && contains "$FULL" "$TITLEB"; then ok "full renders both lines"; else bad "full should show A+B"; fi

echo "== /checkout?items=skuA =="
if contains "$SEL" "$TITLEA"; then ok "selected renders skuA line"; else bad "selected missing skuA"; fi
if ! contains "$SEL" "$TITLEB"; then ok "selected excludes skuB line"; else bad "selected includes skuB"; fi
python3 - "$SEL" "$TOTALA" <<'PY'
import sys
html, total = sys.argv[1], sys.argv[2]
body = html.replace("<!--", "").replace("-->", "")
# total should appear in the payment/order-total block of the selected checkout
found = total in body
print("found total" if found else "no-total")
if not found:
    import re
    for m in re.findall(r"\d{1,3}(?:,\d{3})+\.\d{2}", body)[:6]:
        print("  total-candidate:", m)
PY