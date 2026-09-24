import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongoose";
import { CartModel, UserModel } from "@/lib/models";
import { requireUser } from "@/lib/auth/session";
import { fetchProductsByIds } from "@/lib/products";
import { freeDeliveryDate } from "@/lib/format";
import { CheckoutFlow, type CheckoutLine, type CheckoutTotals } from "@/components/CheckoutFlow";

export const dynamic = "force-dynamic";

export const metadata = { title: "Checkout" };

type CartRow = {
  items: Array<{
    product: string;
    variantSku: string;
    qty: number;
  }>;
};

type UserRow = {
  addresses?: Array<{
    _id: unknown;
    fullName: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
  }>;
  paymentMethods?: Array<{
    _id: unknown;
    cardholderName: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  }>;
};

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");

  await connectDB();
  const [cart, userDoc] = await Promise.all([
    CartModel.findOne({ userId: `user:${user._id}` }).lean().exec(),
    UserModel.findById(user._id).lean().exec(),
  ]);

  const cartRow = cart as unknown as CartRow | null;
  const userRow = userDoc as unknown as UserRow | null;
  const cartItems = cartRow?.items ?? [];

  if (cartItems.length === 0) {
    redirect("/cart");
  }

  const productIds = Array.from(new Set(cartItems.map((i) => String(i.product))));
  const productById = await fetchProductsByIds(productIds);

  const lines: CheckoutLine[] = [];
  for (const item of cartItems) {
    const product = productById[String(item.product)];
    if (!product) continue;
    const variant = product.variants.find((v) => v.sku === item.variantSku);
    if (!variant) continue;
    lines.push({
      productId: String(item.product),
      variantSku: item.variantSku,
      slug: product.slug,
      title: product.title,
      image: product.images[0] ?? "/images/placeholder.png",
      priceCents: variant.priceCents,
      qty: item.qty,
      label: variant?.label ?? "",
      stock: variant?.stock ?? 0,
    });
  }

  const totals: CheckoutTotals = {
    itemsCount: lines.reduce((n, l) => n + l.qty, 0),
    subtotalCents: lines.reduce((s, l) => s + l.priceCents * l.qty, 0),
    shippingCents: 0,
    taxCents: 0,
    totalCents: lines.reduce((s, l) => s + l.priceCents * l.qty, 0),
  };

  const addresses = (userRow?.addresses ?? []).map((a) => ({
    id: String(a._id),
    fullName: a.fullName,
    line1: a.line1,
    line2: a.line2 ?? "",
    city: a.city,
    state: a.state,
    zip: a.zip,
    phone: a.phone ?? "",
  }));

  const paymentMethods = (userRow?.paymentMethods ?? []).map((m) => ({
    id: String(m._id),
    cardholderName: m.cardholderName,
    brand: m.brand,
    last4: m.last4,
    expMonth: m.expMonth,
    expYear: m.expYear,
  }));

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-white">
        <div className="max-w-[1100px] mx-auto px-3 py-2 text-[13px] text-faint">
          Amazon {`>`} <span className="font-semibold text-muted line-through">Your Cart</span>{" "}
          {`>`} <span className="font-semibold text-headline">Secure Checkout</span>
        </div>
      </div>
      <div className="max-w-[1100px] mx-auto px-3 py-4">
        <h1 className="text-2xl font-medium text-headline mb-1">Checkout</h1>
        <p className="text-[13px] text-muted mb-4">
          <a href="/cart" className="text-link hover:underline">
            Back to cart
          </a>
        </p>
        <CheckoutFlow
          addresses={addresses}
          paymentMethods={paymentMethods}
          lines={lines}
          totals={totals}
          deliveryDate={freeDeliveryDate()}
        />
      </div>
    </div>
  );
}