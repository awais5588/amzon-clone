/**
 * P8 partial purchase: places an order for ONLY skuA via placeOrderCore({ onlySkus }),
 * verifying order totals == skuA only, order keeps skuB in the cart, and stock
 * decrements only for skuA. Reads a fixture from scripts/p8-prep.ts.
 * Run: npx tsx scripts/checkout-partial.ts <fixture.json>
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { connectDB } from "../lib/mongoose";
import { OrderModel, CartModel, ProductModel } from "../lib/models";
import { placeOrderCore } from "../lib/order-placer";

let failed = 0;
function check(label: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failed += 1;
}

const ADDR = {
  fullName: "P8 Buyer",
  line1: "1 Selection Ave",
  line2: "",
  city: "Seattle",
  state: "WA",
  zip: "98101",
  phone: "206-555-0199",
};
const PAY = { brand: "Visa", last4: "4242" };

interface FixtureDoc {
  userId: string;
  userRawId: string;
  token: string;
  skuA: string;
  skuB: string;
  totalA: number;
  totalB: number;
  stockAOrig: number;
  stockBOrig: number;
  orderKeyPartial: string;
  orderId: string;
  orderNumber: string;
}

async function liveStock(sku: string): Promise<number> {
  const p = (await ProductModel.findOne({ "variants.sku": sku })
    .lean()
    .exec()) as unknown as { variants: Array<{ sku: string; stock: number }> } | null;
  return p?.variants.find((v) => v.sku === sku)?.stock ?? -1;
}

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("usage: checkout-partial.ts <fixture.json>");
  const fix = JSON.parse(readFileSync(path, "utf8")) as FixtureDoc;
  await connectDB();

  const placed = await placeOrderCore({
    userId: fix.userRawId,
    orderKey: fix.orderKeyPartial,
    expectedTotalCents: fix.totalA,
    address: ADDR,
    payment: PAY,
    onlySkus: [fix.skuA],
    isGift: false,
  });

  check("partial order placed", placed.ok === true, JSON.stringify(placed));
  if (!placed.ok) {
    console.log(`\nPARTIAL PURCHASE: ${failed} FAILED`);
    process.exit(1);
  }
  const { orderId, orderNumber } = placed;
  check("order number format", /^113-\d{7}-\d{7}$/.test(orderNumber), orderNumber);

  const order = (await OrderModel.findOne({ orderKey: fix.orderKeyPartial })
    .lean()
    .exec()) as unknown as {
    totals: { subtotalCents: number; totalCents: number };
    items: Array<{ variantSku: string; qty: number }>;
  } | null;
  check("order persisted", Boolean(order));
  if (order) {
    check(
      "order totals == skuA only",
      order.totals.subtotalCents === fix.totalA && order.totals.totalCents === fix.totalA,
      JSON.stringify(order.totals)
    );
    check(
      "order line == skuA qty2 only",
      order.items.length === 1 && order.items[0].variantSku === fix.skuA && order.items[0].qty === 2,
      JSON.stringify(order.items)
    );
  }

  const cart = (await CartModel.findOne({ userId: fix.userId }).lean().exec()) as unknown as {
    items: Array<{ variantSku: string; qty: number }>;
  } | null;
  const skusLeft = (cart?.items ?? []).map((i) => i.variantSku);
  check("cart keeps skuB line", skusLeft.includes(fix.skuB), JSON.stringify(skusLeft));
  check("cart drops skuA line", !skusLeft.includes(fix.skuA), JSON.stringify(skusLeft));

  const nowA = await liveStock(fix.skuA);
  const nowB = await liveStock(fix.skuB);
  check("stockA decremented by 2", nowA === fix.stockAOrig - 2, `now=${nowA} orig=${fix.stockAOrig}`);
  check("stockB unchanged", nowB === fix.stockBOrig, `now=${nowB} orig=${fix.stockBOrig}`);

  fix.orderId = orderId;
  fix.orderNumber = orderNumber;
  writeFileSync(path, JSON.stringify(fix, null, 2));

  console.log(failed === 0 ? "\nPARTIAL PURCHASE: ALL PASS" : `\nPARTIAL PURCHASE: ${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
