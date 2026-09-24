import { connectDB } from "@/lib/mongoose";
import { CartModel, OrderModel, ProductModel, UserModel } from "@/lib/models";
import { placeOrderCore } from "@/lib/order-placer";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionRecord, findUserIdByToken } from "@/lib/auth/session-core";
import { orderDisplayNumber } from "@/lib/format";

let passed = 0;
let failed = 0;
const failures: string[] = [];

interface VariantRow {
  sku: string;
  priceCents: number;
  stock: number;
}

interface OrderTestDoc {
  orderKey: string;
  user: unknown;
  status: string;
  items: Array<{
    product: unknown;
    variantSku: string;
    title: string;
    image: string;
    qty: number;
    unitPriceCents: number;
  }>;
  shippingAddress: { line1: string; line2: string; city: string; state: string; zip: string };
  shippingMethod: { name: string; etaDays: number };
  payment: { brand: string; last4: string };
  totals: { subtotalCents: number; shippingCents: number; taxCents: number; totalCents: number };
}

interface StockDoc {
  _id: unknown;
  variants: VariantRow[];
}

function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
  }
}

const now = new Date();
const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
  now.getDate()
).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(
  2,
  "0"
)}${String(now.getSeconds()).padStart(2, "0")}${Math.floor(Math.random() * 1000)
  .toString()
  .padStart(3, "0")}`;

const cleanup = process.argv.includes("--cleanup");

async function createTestUser(email: string): Promise<string> {
  const existing = await UserModel.findOne({ email });
  if (existing) await UserModel.deleteOne({ _id: existing._id });
  const doc = await UserModel.create({
    name: "Order Test",
    email,
    passwordHash: await hashPassword("pw-test-123"),
  } as never);
  return String(doc._id);
}

async function resetStockForSku(sku: string, restoreTo: number) {
  await ProductModel.updateOne(
    { variants: { $elemMatch: { sku } } },
    { $set: { "variants.$.stock": restoreTo } }
  );
}

async function currentStock(sku: string): Promise<number | null> {
  const doc = (await ProductModel.findOne({ variants: { $elemMatch: { sku } } })
    .lean()
    .exec()) as unknown as StockDoc | null;
  const v = (doc?.variants ?? []).find((x) => x.sku === sku);
  return v ? v.stock : null;
}

async function hasOrder(orderKey: string): Promise<boolean> {
  const o = await OrderModel.findOne({ orderKey });
  return Boolean(o);
}

async function readOrder(orderKey: string): Promise<OrderTestDoc | null> {
  return (await OrderModel.findOne({ orderKey })
    .lean()
    .exec()) as unknown as OrderTestDoc | null;
}

const ADDR = {
  fullName: "Order Test",
  line1: "123 Demo St",
  line2: "Apt 4",
  city: "Seattle",
  state: "WA",
  zip: "98101",
  phone: "206-555-0100",
};
const PAY = { brand: "Visa", last4: "4242" };

async function main() {
  await connectDB();

  if (cleanup) {
    const staleUsers = (await UserModel.find({ email: { $regex: /^(order-test|smoke-order)-/ } })
      .select("_id")
      .lean()
      .exec()) as unknown as Array<{ _id: unknown }>;
    const ids = staleUsers.map((u) => String(u._id));
    if (ids.length > 0) {
      await OrderModel.deleteMany({ user: { $in: ids } });
      await CartModel.deleteMany({ userId: { $in: ids.map((id) => `user:${id}`) } });
      await UserModel.deleteMany({ _id: { $in: ids } });
    }
    console.log(`  cleanup removed ${ids.length} order-test users (+ their orders/carts)`);
    process.exit(0);
  }

  console.log(`order test @ ${stamp}`);

  const email = `order-test-${stamp}@example.com`;
  const userId = await createTestUser(email);

  const skus = ["ECHO-DOT5-CHAR", "FTV-4KMAX-PRO"];
  const [skuA, skuB] = skus;
  const stockOrigA = (await currentStock(skuA)) ?? 0;
  const stockOrigB = (await currentStock(skuB)) ?? 0;

  const productRow = (await ProductModel.findOne({ "variants.sku": skuA }).lean().exec()) as unknown as StockDoc;
  const productId = String(productRow._id);
  const priceA = productRow.variants.find((v) => v.sku === skuA)!.priceCents;
  const priceBRow = (await ProductModel.findOne({ "variants.sku": skuB }).lean().exec()) as unknown as StockDoc;
  const priceB = priceBRow.variants.find((v) => v.sku === skuB)!.priceCents;

  await resetStockForSku(skuA, stockOrigA);
  await resetStockForSku(skuB, stockOrigB);
  await CartModel.deleteMany({ userId: `user:${userId}` });
  await OrderModel.deleteMany({ user: userId });

  const sessionToken = await createSessionRecord(userId);
  check("session record for user", (await findUserIdByToken(sessionToken)) === userId);
  const sessionUser = await findUserIdByToken(sessionToken);
  check("session resolves to user id", sessionUser === userId);

  // 1. Empty cart
  const cartEmpty = await placeOrderCore({
    userId,
    orderKey: `order-test-${stamp}-empty`,
    expectedTotalCents: 1,
    address: ADDR,
    payment: PAY,
  });
  check("empty cart rejected", cartEmpty.ok === false && cartEmpty.code === "CART_EMPTY", cartEmpty);

  // 2. Build cart with two different products (line1 = skuA qty1, line2 = skuB qty2)
  const subtotal = priceA * 1 + priceB * 2;
  await CartModel.create({
    userId: `user:${userId}`,
    items: [
      {
        product: productId,
        variantSku: skuA,
        title: "Echo Dot Test Item",
        image: "",
        priceCents: priceA,
        qty: 1,
      },
      {
        product: String(priceBRow._id),
        variantSku: skuB,
        title: "Echo Show Test Item",
        image: "",
        priceCents: priceB,
        qty: 2,
      },
    ],
  } as never);

  // 3. Total mismatch
  const mismatch = await placeOrderCore({
    userId,
    orderKey: `order-test-${stamp}-mismatch`,
    expectedTotalCents: subtotal + 100,
    address: ADDR,
    payment: PAY,
  });
  check("total mismatch rejected", mismatch.ok === false && mismatch.code === "TOTAL_MISMATCH", mismatch);
  check("no order created on mismatch", !(await hasOrder(`order-test-${stamp}-mismatch`)));
  check("stock unchanged after mismatch", (await currentStock(skuA)) === stockOrigA && (await currentStock(skuB)) === stockOrigB);

  // 4. Invalid address / payment
  const badAddr = await placeOrderCore({
    userId,
    orderKey: `order-test-${stamp}-bada`,
    expectedTotalCents: subtotal,
    address: { ...ADDR, zip: "no" },
    payment: PAY,
  });
  check("bad zip rejected", badAddr.ok === false && badAddr.code === "VALIDATION", badAddr);
  const badPay = await placeOrderCore({
    userId,
    orderKey: `order-test-${stamp}-badp`,
    expectedTotalCents: subtotal,
    address: ADDR,
    payment: { ...PAY, last4: "12" },
  });
  check("bad payment rejected", badPay.ok === false && badPay.code === "VALIDATION", badPay);

  // 5. Successful placement
  const orderKey = `order-test-${stamp}-ok`;
  const placed = await placeOrderCore({
    userId,
    orderKey,
    expectedTotalCents: subtotal,
    address: ADDR,
    payment: PAY,
  });
  check("order placed", placed.ok === true, placed);
  const orderNumber = placed.ok ? placed.orderNumber : "";
  check("order number format", /^113-\d{7}-\d{7}$/.test(orderNumber), orderNumber);
  if (placed.ok) {
    check("display number deterministic", orderDisplayNumber(orderKey) === orderNumber);
  }

  const orderDoc = await readOrder(orderKey);
  check("order persisted", Boolean(orderDoc));
  if (orderDoc) {
    check("order status Pending", orderDoc.status === "Pending");
    check("order totals recorded", orderDoc.totals.subtotalCents === subtotal && orderDoc.totals.totalCents === subtotal);
    check("order item snapshot qty", orderDoc.items.some((i) => i.variantSku === skuB && i.qty === 2));
    check("address snapshot", orderDoc.shippingAddress.city === "Seattle" && orderDoc.shippingAddress.line2 === "Apt 4");
    check("no cvv / full number stored", Object.keys(orderDoc.payment).includes("brand") && orderDoc.payment.last4 === "4242");
    check("no secret keys stored", !JSON.stringify(orderDoc).toLowerCase().includes("cvv"));
  }

  // 6. Idempotent re-submit: same key returns same order, stock NOT double-decremented
  const stockAfter = (await currentStock(skuA)) ?? 0;
  const stockAfterB = (await currentStock(skuB)) ?? 0;
  check("stock decremented (line qty)", stockAfter === stockOrigA - 1 && stockAfterB === stockOrigB - 2, { stockAfter, stockOrigA });

  const repeat = await placeOrderCore({
    userId,
    orderKey,
    expectedTotalCents: subtotal,
    address: ADDR,
    payment: PAY,
  });
  check("repeat with same key ok", repeat.ok === true, repeat);
  if (placed.ok && repeat.ok) check("same order as first", repeat.orderId === placed.orderId);
  const ordersForKey = await OrderModel.countDocuments({ orderKey });
  check("only one order per key", ordersForKey === 1);
  const stockAfterRepeat = (await currentStock(skuA)) ?? 0;
  check("no double decrement on repeat", stockAfterRepeat === stockOrigA - 1, { stockAfterRepeat });

  // 7. Racing two submissions with same key
  await CartModel.create({
    userId: `user:${userId}`,
    items: [
      {
        product: productId,
        variantSku: skuA,
        title: "Echo Dot Test Item",
        image: "",
        priceCents: priceA,
        qty: 1,
      },
      {
        product: String(priceBRow._id),
        variantSku: skuB,
        title: "Echo Show Test Item",
        image: "",
        priceCents: priceB,
        qty: 2,
      },
    ],
  } as never);
  const raceKey = `order-test-${stamp}-race`;
  const [r1, r2] = await Promise.all([
    placeOrderCore({ userId, orderKey: raceKey, expectedTotalCents: subtotal, address: ADDR, payment: PAY }),
    placeOrderCore({ userId, orderKey: raceKey, expectedTotalCents: subtotal, address: ADDR, payment: PAY }),
  ]);
  check("race: at least one succeeded", r1.ok || r2.ok, { r1, r2 });
  check("race: both report success (idempotent)", r1.ok && r2.ok, { r1, r2 });
  check("race: same order returned", (r1.ok && r2.ok && r1.orderId === r2.orderId) || (!r1.ok && r2.ok), { r1, r2 });
  const races = await OrderModel.countDocuments({ orderKey: raceKey });
  check("race: single order persisted", races === 1, races);
  const stockAfterRace = (await currentStock(skuA)) ?? 0;
  check("race: stock decremented exactly once for skuA (qty1 x new order)", stockAfterRace === stockOrigA - 2, { stockAfterRace, stockOrigA });

  // 8. Cart cleared after placement
  const cartAfter = (await CartModel.findOne({ userId: `user:${userId}` })
    .lean()
    .exec()) as unknown as { items: unknown[] } | null;
  check("cart cleared after order", !cartAfter || (cartAfter.items ?? []).length === 0, cartAfter);

  // 9. A different user cannot reuse the key
  const otherEmail = `order-test-other-${stamp}@example.com`;
  const otherUserId = await createTestUser(otherEmail);
  const other = await placeOrderCore({
    userId: otherUserId,
    orderKey,
    expectedTotalCents: subtotal,
    address: ADDR,
    payment: PAY,
  });
  check("other user rejected for same key", other.ok === false && other.code === "VALIDATION", other);

  // 10. Out-of-stock rejection: set skuB stock to 0, place a new order
  await CartModel.create({
    userId: `user:${userId}`,
    items: [
      {
        product: String(priceBRow._id),
        variantSku: skuB,
        title: "Echo Show Test Item",
        image: "",
        priceCents: priceB,
        qty: 1,
      },
    ],
  } as never);
  await resetStockForSku(skuB, 0);
  const oosKey = `order-test-${stamp}-oos`;
  const oos = await placeOrderCore({
    userId,
    orderKey: oosKey,
    expectedTotalCents: priceB,
    address: ADDR,
    payment: PAY,
  });
  check("out-of-stock rejected", oos.ok === false && oos.code === "OUT_OF_STOCK", oos);
  check("no order created when out of stock", !(await hasOrder(oosKey)));

  // 11. password hash round-trip sanity
  const pwh = await hashPassword("pw-test-123");
  check("password verify ok", await verifyPassword("pw-test-123", pwh));
  check("password verify wrong", !(await verifyPassword("wrong", pwh)));

  // Cleanup
  await OrderModel.deleteMany({ user: userId });
  await OrderModel.deleteMany({ user: otherUserId });
  await CartModel.deleteMany({ userId: `user:${userId}` });
  await UserModel.deleteMany({ _id: { $in: [userId, otherUserId] } });
  await resetStockForSku(skuA, stockOrigA);
  await resetStockForSku(skuB, stockOrigB);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("Failures:", failures.join(" | "));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});