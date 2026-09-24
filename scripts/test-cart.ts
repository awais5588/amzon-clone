/**
 * Cart core smoke (P8): exercises cart mutations + save-for-later + gift + stock caps
 * directly against the DB. Run: npx tsx scripts/test-cart.ts
 */
import "dotenv/config";
import { connectDB } from "../lib/mongoose";
import { CartModel, ProductModel } from "../lib/models";
import {
  addToCartCore,
  getCartStateCore,
  moveToCartCore,
  removeSavedCore,
  saveForLaterCore,
  setCartGiftCore,
  setCartItemQtyCore,
  deleteCartCore,
  CartError,
} from "../lib/cart-core";
import { mergeGuestCartCore } from "../lib/cart-merge";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed += 1;
}

async function main() {
  await connectDB();
  const uid = `cart-test-${Date.now().toString(36)}`;
  const userId = `guest:${uid}`;

  const product = (await ProductModel.findOne({ slug: "fire-tv-stick-4k-max" })
    .lean()
    .exec()) as unknown as {
    _id: unknown;
    title: string;
    variants: Array<{ sku: string; label: string; priceCents: number; stock: number; images?: string[] }>;
  } | null;
  if (!product) throw new Error("seed product missing");
  const v = product.variants.find((x) => x.stock >= 3) ?? product.variants[0];
  const sku = v.sku;
  const stock = v.stock;
  const productId = String(product._id);
  const price = v.priceCents;

  try {
    // 1. Add new line, capped at stock on first add
    let s = await addToCartCore({ userId, productId, variantSku: sku, qty: 999 });
    check("new line capped at stock", s.totalQty === Math.min(999, stock), `qty=${s.totalQty} stock=${stock}`);

    // 2. Adding again accumulates but never exceeds stock
    s = await addToCartCore({ userId, productId, variantSku: sku, qty: 1 });
    check("accumulated qty capped at stock", s.totalQty === stock, `qty=${s.totalQty}`);

    // 3. Adding an out-of-stock variant throws
    const oos = product.variants.find((x) => x.stock <= 0);
    if (oos) {
      let threw = false;
      try {
        await addToCartCore({ userId, productId, variantSku: oos.sku, qty: 1 });
      } catch (e) {
        threw = e instanceof CartError;
      }
      check("out-of-stock variant rejected (CartError)", threw);
    } else {
      console.log("SKIP  out-of-stock variant test (no OOS variant in seed)");
    }

    // 4. set qty raised above stock is clamped
    s = await setCartItemQtyCore({ userId, productId, variantSku: sku, qty: 99999 });
    check("qty clamped to stock", s.totalQty === stock, `qty=${s.totalQty}`);

    // 5. qty zero removes the line
    s = await setCartItemQtyCore({ userId, productId, variantSku: sku, qty: 0 });
    check("qty 0 removes line", s.totalQty === 0 && s.items.length === 0);

    // 6. Save for later moves line out of items into saved (persisted)
    await addToCartCore({ userId, productId, variantSku: sku, qty: 2 });
    s = await saveForLaterCore({ userId, variantSku: sku });
    check("save-for-later empties items", s.items.length === 0 && s.saved.length === 1, JSON.stringify({ items: s.items.length, saved: s.saved.length }));
    const reloaded = await getCartStateCore(userId);
    check("saved line persisted to DB", reloaded.saved.some((i) => i.variantSku === sku));
    check("saved line snapshot has live price", reloaded.saved[0]?.priceCents === price);

    // 7. Move back to cart
    s = await moveToCartCore({ userId, variantSku: sku });
    check("move-to-cart restores line", s.items.some((i) => i.variantSku === sku) && s.saved.length === 0);
    check("moved qty preserved", s.items.find((i) => i.variantSku === sku)?.qty === Math.min(2, stock));

    // 8. Remove saved
    await saveForLaterCore({ userId, variantSku: sku });
    s = await removeSavedCore({ userId, variantSku: sku });
    check("remove-saved clears line", s.saved.length === 0);

    // 9. Gift flag
    s = await setCartGiftCore({ userId, isGift: true });
    check("gift flag set", s.isGift === true);
    const g = await getCartStateCore(userId);
    check("gift flag persisted", g.isGift === true);
    await setCartGiftCore({ userId, isGift: false });

    // 10. Merge UX: guest saved + gift carry into user cart
    const userCartId = `user:${userId.replace("guest:", "merge-")}`;
    await CartModel.create({
      userId: userCartId,
      items: [],
      saved: [],
      isGift: false,
    } as never);
    await addToCartCore({ userId, productId, variantSku: sku, qty: 1 });
    await saveForLaterCore({ userId, variantSku: sku });
    await addToCartCore({ userId, productId, variantSku: sku, qty: 1 });
    await setCartGiftCore({ userId, isGift: true });
    const merged = await mergeGuestCartCore(userCartId, uid);
    check("merge carries guest lines", merged.merged);
    const userState = await getCartStateCore(userCartId);
    check("guest saved merged into user saved", userState.saved.some((i) => i.variantSku === sku));
    check("guest gift merged", userState.isGift === true);
  } finally {
    await CartModel.deleteMany({ userId: { $in: [userId, `user:${userId.replace("guest:", "merge-")}`] } });
    await deleteCartCore(userId);
  }

  console.log(failed === 0 ? "\nCART TEST: ALL PASS" : `\nCART TEST: ${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("CART TEST: ERROR", err);
  process.exit(1);
});