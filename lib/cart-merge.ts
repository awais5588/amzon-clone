import { connectDB } from "@/lib/mongoose";
import { CartModel, ProductModel } from "@/lib/models";
import type { Product, Variant } from "@/lib/models";

export interface CartMergeResult {
  merged: boolean;
  guestLineCount: number;
}

interface RawCartItemCore {
  product: unknown;
  variantSku: string;
  title: string;
  image: string;
  priceCents: number;
  qty: number;
}

interface RawCartCore {
  userId: string;
  items: RawCartItemCore[];
  save(): Promise<unknown>;
}

async function findCartRaw(userId: string): Promise<RawCartCore | null> {
  await connectDB();
  return (await CartModel.findOne({ userId })) as unknown as RawCartCore | null;
}

/**
 * Merges a stored guest cart into an authenticated user's cart (keyed by variant sku),
 * capping quantities at live variant stock. The guest cart document is removed on success.
 * Core logic only — no cookies; callers resolve the guest token.
 */
export async function mergeGuestCartCore(
  targetUserId: string,
  guestToken: string
): Promise<CartMergeResult> {
  await connectDB();

  const guestCart = await findCartRaw(`guest:${guestToken}`);
  if (!guestCart || guestCart.items.length === 0) {
    await (CartModel.deleteOne({ userId: `guest:${guestToken}` }) as unknown as Promise<unknown>);
    return { merged: false, guestLineCount: 0 };
  }

  let userCart = await findCartRaw(targetUserId);
  if (!userCart) {
    await (CartModel.create({ userId: targetUserId, items: [] } as never) as Promise<unknown>);
    userCart = await findCartRaw(targetUserId);
    if (!userCart) return { merged: false, guestLineCount: 0 };
  }

  const productIds = [...new Set(guestCart.items.map((i) => String(i.product)))];
  const products =
    productIds.length > 0
      ? ((await ProductModel.find({ _id: { $in: productIds } })
          .lean()
          .exec()) as unknown as Array<Product & { _id: unknown }>)
      : [];
  const stockBySku = new Map<string, number>();
  for (const p of products) {
    for (const v of p.variants as Variant[]) stockBySku.set(v.sku, v.stock);
  }

  const indexBySku = new Map<string, number>();
  userCart.items.forEach((item, index) => indexBySku.set(item.variantSku, index));
  const guestLineCount = guestCart.items.length;

  for (const g of guestCart.items) {
    const stock = stockBySku.get(g.variantSku) ?? 0;
    const existing = indexBySku.get(g.variantSku);
    if (existing !== undefined) {
      const snap = userCart.items[existing];
      const cap = stock > 0 ? stock : snap.qty + g.qty;
      snap.qty = Math.min(snap.qty + g.qty, cap);
    } else {
      userCart.items.push({
        product: g.product,
        variantSku: g.variantSku,
        title: g.title,
        image: g.image,
        priceCents: g.priceCents,
        qty: stock > 0 ? Math.min(g.qty, stock) : g.qty,
      });
    }
  }

  await userCart.save();
  await (CartModel.deleteOne({ userId: `guest:${guestToken}` }) as unknown as Promise<unknown>);
  return { merged: guestLineCount > 0, guestLineCount };
}