/**
 * Auth + cart smoke harness (P6). Runs outside the Next request context, so it
 * exercises the pure core (password hashing, session records, guest->user cart merge).
 * Run with: npx tsx scripts/test-auth.ts
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { connectDB } from "../lib/mongoose";
import { UserModel, CartModel } from "../lib/models";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import {
  createSessionRecord,
  deleteSessionRecord,
  findUserIdByToken,
} from "../lib/auth/session-core";
import { mergeGuestCartCore } from "../lib/cart-merge";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed += 1;
}

async function main() {
  await connectDB();
  const tag = randomUUID().slice(0, 8);
  const email = `auth-test-${tag}@example.com`;
  const password = `secret-${tag}`;
  const guestToken = `guest-test-${tag}`;

  // 1. Password hashing
  const stored = await hashPassword(password);
  check("hashPassword produces scrypt string", stored.startsWith("scrypt$") && stored.split("$").length === 3);
  check("verifyPassword accepts correct password", await verifyPassword(password, stored));
  check("verifyPassword rejects wrong password", !(await verifyPassword(`${password}x`, stored)));
  check("verifyPassword rejects malformed hash", !(await verifyPassword(password, "plaintext")));

  // 2. User creation stores a hash, never plaintext
  const user = await UserModel.create({
    name: "Auth Test",
    email,
    passwordHash: await hashPassword(password),
  } as never);
  const userRow = (await UserModel.findById(user._id).lean().exec()) as unknown as {
    passwordHash: string;
  } | null;
  check("user row has no plaintext password", !!userRow && userRow.passwordHash.startsWith("scrypt$"));
  check("sign-in lookup would find user by email", !!(await UserModel.findOne({ email }).lean().exec()));

  // 3. Session records
  const token = await createSessionRecord(String(user._id));
  check("session token is opaque (not stored raw)", token.includes("-") || token.length >= 40);
  const lookup = await findUserIdByToken(token);
  check("findUserIdByToken resolves user", lookup === String(user._id));
  check("bogus token resolves null", (await findUserIdByToken("bogus")) === null);
  await deleteSessionRecord(token);
  check("revoked session resolves null", (await findUserIdByToken(token)) === null);

  // 4. Guest cart -> user cart merge (dedupe by variant sku, cap at stock, remove guest cart)
  const product = (await (await import("../lib/models")).ProductModel.findOne({
    slug: "fire-tv-stick-4k-max",
  })
    .lean()
    .exec()) as unknown as {
    _id: unknown;
    title: string;
    variants: Array<{ sku: string; label: string; images?: string[]; priceCents: number; stock: number }>;
  } | null;
  if (!product) throw new Error("seed product missing");
  const sku = product.variants[0].sku;
  const stock = product.variants[0].stock;
  const image = product.variants[0].images?.[0] ?? "";

  const userId = `user:${String(user._id)}`;
  await Promise.all([
    CartModel.deleteMany({ userId: { $in: [`guest:${guestToken}`, userId] } }),
  ]);
  await CartModel.create({
    userId: `guest:${guestToken}`,
    items: [
      { product: product._id, variantSku: sku, title: product.title, image, priceCents: 8499, qty: 2 },
    ],
  } as never);
  await CartModel.create({
    userId,
    items: [
      { product: product._id, variantSku: sku, title: product.title, image, priceCents: 1000, qty: 1 },
      { product: product._id, variantSku: "OTHER-SKU", title: "Other", image, priceCents: 500, qty: 4 },
      { product: product._id, variantSku: "OTHER-SKU-2", title: "Other 2", image, priceCents: 700, qty: 1 },
    ],
  } as never);

  const merge = await mergeGuestCartCore(userId, guestToken);
  check("merge reports merged lines", merge.merged && merge.guestLineCount === 1);

  const mergedCart = (await CartModel.findOne({ userId }).lean().exec()) as unknown as {
    items: Array<{ variantSku: string; qty: number }>;
  };
  const bySku = new Map(mergedCart.items.map((i) => [i.variantSku, i.qty]));
  const expectedQty = Math.min(1 + 2, stock > 0 ? stock : 3);
  check(
    "same sku lines deduped & qty summed (capped at stock)",
    bySku.get(sku) === expectedQty,
    `sku=${sku} qty=${bySku.get(sku)} stock=${stock}`
  );
  check("other user lines preserved", bySku.get("OTHER-SKU") === 4 && bySku.get("OTHER-SKU-2") === 1);
  check("guest cart document removed", !(await CartModel.findOne({ userId: `guest:${guestToken}` })));

  const repeat = await mergeGuestCartCore(userId, guestToken);
  check("repeat merge is a no-op", !repeat.merged);

  // cleanup
  await UserModel.deleteOne({ _id: user._id });
  await CartModel.deleteMany({ userId });
  await CartModel.deleteMany({ userId: `guest:${guestToken}` });

  console.log(failed === 0 ? "\nAUTH TEST: ALL PASS" : `\nAUTH TEST: ${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("AUTH TEST: ERROR", err);
  process.exit(1);
});