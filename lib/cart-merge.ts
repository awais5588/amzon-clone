import { connectDB } from "@/lib/mongoose";
import { CartModel, ProductModel } from "@/lib/models";
import type { Product, Variant } from "@/lib/models";

export interface CartMergeResult {
  merged: boolean;
  guestLineCount: number;
}

interface RawCartItemRow {
  product: unknown;
  variantSku: string;
  title: string;
  image: string;
  priceCents: number;
  qty: number;
}

interface RawCartRow {
  userId: string;
  items: RawCartItemRow[];
  saved: RawCartItemRow[];
  isGift?: boolean;
  save(): Promise<unknown>;
}

async function findCartRaw(userId: string): Promise<RawCartRow | null> {
  await connectDB();
  return (await CartModel.findOne({ userId })) as unknown as RawCartRow | null;
}

async function ensureUserCart(targetUserId: string): Promise<RawCartRow | null> {
  let userCart = await findCartRaw(targetUserId);
  if (!userCart) {
    await (CartModel.create({ userId: targetUserId, items: [], saved: [], isGift: false } as never) as Promise<unknown>);
    userCart = await findCartRaw(targetUserId);
  }
  return userCart;
}

/**
 * Merges a stored guest cart into an authenticated user's cart (keyed by variant sku).
 * Line snapshots are re-resolved against the live catalog (title/image/price/qty capped
 * at current stock); out-of-stock guest lines are dropped entirely. Saved-for-later lines
 * are merged too. The guest cart document is removed on success.
 */
export async function mergeGuestCartCore(
  targetUserId: string,
  guestToken: string
): Promise<CartMergeResult> {
  await connectDB();

  const guestCart = await findCartRaw(`guest:${guestToken}`);
  if (!guestCart || (guestCart.items.length === 0 && guestCart.saved.length === 0)) {
    await (CartModel.deleteOne({ userId: `guest:${guestToken}` }) as unknown as Promise<unknown>);
    return { merged: false, guestLineCount: 0 };
  }

  const userCart = await ensureUserCart(targetUserId);
  if (!userCart) return { merged: false, guestLineCount: 0 };

  const allSkus = [...new Set([...guestCart.items, ...guestCart.saved].map((i) => i.variantSku))];
  void allSkus;
  const productIds = [
    ...new Set([...guestCart.items, ...guestCart.saved].map((i) => String(i.product))),
  ];
  const products =
    productIds.length > 0
      ? ((await ProductModel.find({ _id: { $in: productIds } })
          .lean()
          .exec()) as unknown as Array<Product & { _id: unknown }>)
      : [];
  const liveBySku = new Map<string, { productId: string; title: string; image: string; priceCents: number; stock: number }>();
  for (const p of products) {
    for (const v of p.variants as Variant[]) {
      liveBySku.set(v.sku, {
        productId: String(p._id),
        title: p.title,
        image: v.images?.[0] ?? p.images?.[0] ?? "",
        priceCents: v.priceCents,
        stock: v.stock,
      });
    }
  }

  const mergeOne = (row: RawCartItemRow): void => {
    const live = liveBySku.get(row.variantSku);
    if (!live) return;
    const itemIndex = userCart.items.findIndex((i) => i.variantSku === row.variantSku);
    const snap = {
      product: live.productId,
      variantSku: row.variantSku,
      title: live.title,
      image: live.image,
      priceCents: live.priceCents,
    };
    if (itemIndex !== -1) {
      userCart.items[itemIndex].title = live.title;
      userCart.items[itemIndex].image = live.image;
      userCart.items[itemIndex].priceCents = live.priceCents;
      if (live.stock > 0) {
        userCart.items[itemIndex].qty = Math.min(userCart.items[itemIndex].qty + row.qty, live.stock);
      }
      return;
    }
    if (live.stock <= 0) return;
    userCart.items.push({ ...snap, qty: Math.min(row.qty, live.stock) });
  };

  for (const g of guestCart.items) mergeOne(g);

  const savedIndex = new Set(userCart.saved.map((s) => s.variantSku));
  for (const g of guestCart.saved) {
    if (savedIndex.has(g.variantSku)) continue;
    const live = liveBySku.get(g.variantSku);
    if (!live) continue;
    userCart.saved.push({
      product: live.productId,
      variantSku: g.variantSku,
      title: live.title,
      image: live.image,
      priceCents: live.priceCents,
      qty: g.qty,
    });
  }
  if (guestCart.saved.length > 0 || (guestCart.isGift || false)) {
    userCart.isGift = (userCart.isGift || false) || (guestCart.isGift || false);
  }

  const guestLineCount = guestCart.items.length;
  await userCart.save();
  await (CartModel.deleteOne({ userId: `guest:${guestToken}` }) as unknown as Promise<unknown>);
  return { merged: guestLineCount > 0, guestLineCount };
}