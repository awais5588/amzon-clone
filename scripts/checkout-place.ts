import { readFileSync, writeFileSync } from "node:fs";
import { placeOrderCore } from "@/lib/order-placer";
import type { PlaceOrderParams } from "@/lib/order-placer";

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("usage: checkout-place.ts <fixture.json>");
  const fix = JSON.parse(readFileSync(path, "utf8"));

  const res = await placeOrderCore({
    userId: fix.ownerId,
    orderKey: fix.orderKey,
    expectedTotalCents: fix.expectedTotalCents,
    address: fix.address,
    payment: fix.payment,
  } satisfies PlaceOrderParams);

  if (!res.ok) {
    console.error("place failed", res);
    process.exit(1);
  }
  fix.orderId = res.orderId;
  fix.orderNumber = res.orderNumber;
  writeFileSync(path, JSON.stringify(fix, null, 2));
  console.log(`placed ${res.orderId} ${res.orderNumber}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});