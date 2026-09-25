import Link from "next/link";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongoose";
import { CartModel, UserModel } from "@/lib/models";
import { requireUser } from "@/lib/auth/session";
import { fetchProductsByIds } from "@/lib/products";
import { freeDeliveryDate } from "@/lib/format";
import { CheckoutFlow, type CheckoutLine, type CheckoutTotals } from "@/components/CheckoutFlow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

type CartRow = { items: Array<{ product: string; variantSku: string; qty: number }> };
type UserRow = { addresses?: Array<{ _id: unknown; fullName: string; line1: string; line2: string; city: string; state: string; zip: string; phone: string }>; paymentMethods?: Array<{ _id: unknown; cardholderName: string; brand: string; last4: string; expMonth: number; expYear: number }> };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const rawItems = Array.isArray(sp.items) ? sp.items[0] ?? "" : sp.items ?? "";
  const onlySkus = rawItems.split(",").map((value) => value.trim()).filter(Boolean);
  const user = await requireUser("/checkout");

  await connectDB();
  const [cart, userDocument] = await Promise.all([CartModel.findOne({ userId: `user:${user._id}` }).lean().exec(), UserModel.findById(user._id).lean().exec()]);
  const cartRow = cart as unknown as (CartRow & { isGift?: boolean }) | null;
  const userRow = userDocument as unknown as UserRow | null;
  const cartItems = cartRow?.items ?? [];
  const selected = onlySkus.length > 0 ? new Set(onlySkus) : null;
  const scopedItems = selected ? cartItems.filter((item) => selected.has(item.variantSku)) : cartItems;
  if (scopedItems.length === 0) redirect("/cart");

  const productIds = Array.from(new Set(scopedItems.map((item) => String(item.product))));
  const productsById = await fetchProductsByIds(productIds);
  const lines: CheckoutLine[] = [];
  for (const item of scopedItems) {
    const product = productsById[String(item.product)];
    if (!product) continue;
    const variant = product.variants.find((candidate) => candidate.sku === item.variantSku);
    if (!variant || variant.stock <= 0) continue;
    lines.push({ productId: String(item.product), variantSku: item.variantSku, slug: product.slug, title: product.title, image: variant.images?.[0] ?? product.images[0] ?? "/images/placeholder.png", priceCents: variant.priceCents, qty: Math.min(item.qty, variant.stock), label: variant.label ?? "", stock: variant.stock });
  }
  if (lines.length === 0) redirect("/cart");

  const totals: CheckoutTotals = { itemsCount: lines.reduce((sum, line) => sum + line.qty, 0), subtotalCents: lines.reduce((sum, line) => sum + line.priceCents * line.qty, 0), shippingCents: 0, taxCents: 0, totalCents: lines.reduce((sum, line) => sum + line.priceCents * line.qty, 0) };
  const addresses = (userRow?.addresses ?? []).map((address) => ({ id: String(address._id), fullName: address.fullName, line1: address.line1, line2: address.line2 ?? "", city: address.city, state: address.state, zip: address.zip, phone: address.phone ?? "" }));
  const paymentMethods = (userRow?.paymentMethods ?? []).map((method) => ({ id: String(method._id), cardholderName: method.cardholderName, brand: method.brand, last4: method.last4, expMonth: method.expMonth, expYear: method.expYear }));

  return (
    <div className="morrow-container min-h-screen py-7 sm:py-10 lg:py-12">
      <nav className="flex items-center gap-2 text-xs text-text-muted" aria-label="Breadcrumb"><Link href="/" className="hover:text-accent">Home</Link><span aria-hidden="true">/</span><Link href="/cart" className="hover:text-accent">Bag</Link><span aria-hidden="true">/</span><span className="text-text-secondary">Checkout</span></nav>
      <header className="mt-7 flex flex-col gap-2 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="morrow-eyebrow">The final step</p><h1 className="mt-2 font-display text-4xl text-headline sm:text-5xl">Checkout</h1><p className="mt-2 text-sm text-text-secondary">Review your details, then place the order when you&apos;re ready.</p></div><Link href="/cart" className="morrow-link text-sm">← Back to bag</Link></header>
      <CheckoutFlow addresses={addresses} paymentMethods={paymentMethods} lines={lines} totals={totals} deliveryDate={freeDeliveryDate()} onlySkus={onlySkus} isGift={!!cartRow?.isGift} />
    </div>
  );
}
