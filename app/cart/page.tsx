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
export const metadata = { title: "Your Bag" };

async function youMightAlsoLike() {
  await connectDB();
  const documents = (await ProductModel.find({}).sort({ boughtInPastMonth: -1 }).limit(4).lean().exec()) as unknown as Product[];
  return documents.map((document) => productToCard(document));
}

export default async function CartPage() {
  const [cart, sessionUser] = await Promise.all([getCartState(), getSessionUser()]);
  const productIds = [...new Set(cart.items.map((item) => item.productId))];
  const productsById = productIds.length > 0 ? await fetchProductsByIds(productIds) : {};
  const skuInfo: Record<string, SkuInfo> = {};
  for (const product of Object.values(productsById)) {
    for (const variant of product.variants) {
      skuInfo[variant.sku] = { label: variant.label, stock: variant.stock, slug: product.slug };
    }
  }
  const related = await youMightAlsoLike();

  return (
    <div className="morrow-container min-h-screen py-8 sm:py-10 lg:py-12">
      <header className="mb-8 flex flex-col gap-3 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="morrow-eyebrow">Your selections</p>
          <h1 className="mt-2 font-display text-4xl text-headline sm:text-5xl">Your bag</h1>
          <p className="mt-2 text-sm text-text-secondary">Keep the good things close, then finish when you&apos;re ready.</p>
        </div>
        {sessionUser && <p className="text-sm text-text-secondary">Signed in as <span className="font-semibold text-accent">{sessionUser.name}</span></p>}
      </header>
      <CartView
        skuInfo={skuInfo}
        initialItems={{ totalQty: cart.totalQty, subtotalCents: cart.subtotalCents, qualifiesForFreeDelivery: cart.subtotalCents > 0, items: cart.items, saved: cart.saved, isGift: cart.isGift }}
        deliveryDate={freeDeliveryDate()}
      />
      {related.length > 0 && <div className="mt-10"><Shelf title="You might also like" note="A few more considered picks from the catalog." cards={related} /></div>}
    </div>
  );
}
