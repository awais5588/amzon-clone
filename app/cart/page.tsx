import type { Product } from "@/lib/models";
import { ProductModel } from "@/lib/models";
import { connectDB } from "@/lib/mongoose";
import { getCartState } from "@/lib/cart";
import { getSessionUser } from "@/lib/auth/session";
import { fetchProductsByIds, productToCard } from "@/lib/products";
import { freeDeliveryDate } from "@/lib/format";
import { CartView, type SkuInfo } from "@/components/CartView";
import { Shelf } from "@/components/Shelf";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your Cart" };

async function youMightAlsoLike() {
  await connectDB();
  const docs = (await ProductModel.find({})
    .sort({ boughtInPastMonth: -1 })
    .limit(4)
    .lean()
    .exec()) as unknown as Product[];
  return docs.map((d) => productToCard(d));
}

export default async function CartPage() {
  const [cart, sessionUser] = await Promise.all([getCartState(), getSessionUser()]);
  const items = cart.items;
  const totalQty = cart.totalQty;
  const subtotalCents = cart.subtotalCents;

  const productIds = [...new Set(items.map((i) => i.productId))];
  const productsById = productIds.length > 0 ? await fetchProductsByIds(productIds) : {};

  const skuInfo: Record<string, SkuInfo> = {};
  for (const p of Object.values(productsById)) {
    for (const v of p.variants) {
      skuInfo[v.sku] = {
        label: v.label,
        stock: v.stock,
        slug: p.slug,
      };
    }
  }

  const related = await youMightAlsoLike();

  return (
    <div className="min-h-screen">
      {/* Visa promo banner */}
      <div className="bg-[#f0f2f2]">
        <div className="max-w-[1100px] mx-auto px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <p>
            <span className="font-semibold text-headline">
              {sessionUser?.name ?? "Sign in for"}
            </span>
            {sessionUser ? ", get a" : " a"}{" "}
            <span className="font-semibold text-headline">$50 Amazon Gift Card</span> upon approval for
            Amazon Visa. <span className="text-link">Find out how</span>
          </p>
          <p className="text-faint">
            Apply and pay only{" "}
            <span className="font-semibold text-headline">$84.99-$34.99</span> for this order
          </p>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-3 py-4">
        <p className="text-sm text-muted mb-3">
          <span className="text-link hover:underline cursor-pointer">
            Add protection for eligible items.
          </span>
        </p>

        <CartView
          skuInfo={skuInfo}
          initialItems={{
            totalQty,
            subtotalCents,
            qualifiesForFreeDelivery: subtotalCents > 0,
            items,
            saved: cart.saved,
            isGift: cart.isGift,
          }}
          deliveryDate={freeDeliveryDate()}
        />

        {related.length > 0 && (
          <div className="mt-4">
            <Shelf title="You might also like" cards={related} />
          </div>
        )}
      </div>
    </div>
  );
}