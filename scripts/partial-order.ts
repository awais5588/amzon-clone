/**
 * P8 partial-purchase helper: places an order for a subset of the user's cart lines.
 * Builds/stamps the user + 2-line cart, then placeOrderCore({onlySkus:[skuA]}).
 * Writes a fixture used by scripts/p8-journey.sh.
 * Run: npx tsx scripts/partial-order.ts <out-fixture-path>
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { connectDB } from "../lib/mongoose";
import { UserModel, CartModel, ProductModel } from "../lib/models";
import { hashPassword } from "../lib/auth/password";
import { createSessionRecord } from "../lib/auth/session-core";
import { placeOrderCore } from "../lib/order-placer";

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error("usage: partial-order.ts <out.json>");

  await connectDB();
  const stamp = Date.now().toString(36) + randomUUID().slice(0, 6);
  const email = `p8-partial-${stamp}@example.com`;

  const user = await UserModel.create({
    name: "Partial Order Smoke",
    email,
    passwordHash: await hashPassword("pw-smoke-456"),
  } as never);
  const ownerToken = await createSessionRecord(String(user._id));

  const skuA = "ECHO-DOT5-CHAR";
  const skuB = "FTV-4KMAX-PRO";
  const [rowA, rowB] = (await ProductModel.find({
    "variants.sku": { $in: [skuA, skuB] },
  })
    .lean()
    .exec()) as unknown as Array<{ _id: unknown; title: string; variants: Array<{ sku: string; priceCents: number; stock: number }> }>;
  const av = rowA.variants.find((v) => v.sku === skuA)!;
  const bv = rowB.variants.find((v) => v.sku === skuB)!;

  await CartModel.deleteMany({ userId: `user:${user._id}` });
  await CartModel.create({
    userId: `user:${user._id}`,
    items: [
      { product: String(rowA._id), variantSku: skuA, title: "Echo Dot (Selected)", image: "", priceCents: av.priceCents, qty: 1 },
      { product: String(rowB._id), variantSku: skuB, title: "Fire TV Stick (Kept)", image: "", priceCents: bv.priceCents, qty: 2 },
    ],
  } as never);

  const orderKey = `p8-partial-${stamp}`;
  const placed = await placeOrderCore({
    userId: `user:${user._id}`,
    orderKey,
    expectedTotalCents: av.priceCents,
    address: {
      fullName: "Partial Buyer",
      line1: "99 Selection St",
      line2: "",
      city: "Portland",
      state: "OR",
      zip: "97201",
      phone: "503-555-0144",
    },
    payment: { brand: "Visa", last4: "4242" },
    onlySkus: [skuA],
  });
  if (!placed.ok) throw new Error(`partial place failed: ${JSON.stringify(placed)}`);

  writeFileSync(
    out,
    JSON.stringify(
      {
        stamp,
        ownerId: String(user._id),
        ownerToken,
        skuA,
        skuB,
        orderKey,
        orderId: placed.orderId,
        orderNumber: placed.orderNumber,
        selectTotalCents: av.priceCents,
        keptTotalCents: bv.priceCents,
        keptQty: 2,
        address: { line1: "99 Selection St", city: "Portland", state: "OR", zip: "97201" },
      },
      null,
      2
    )
  );
  console.log(`fixture written: ${out}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
