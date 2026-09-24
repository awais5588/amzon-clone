import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { fetchOwnedOrder } from "@/lib/order-view";
import { formatPrice, formatDate, etaDate, orderDisplayNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Order Details" };

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser("/orders");
  const order = await fetchOwnedOrder(id, user._id);
  if (!order) notFound();

  const orderNumber = orderDisplayNumber(String(order.orderKey));

  return (
    <div className="max-w-[1000px] mx-auto px-3 py-8">
      <h1 className="text-3xl font-semibold text-headline">Order Details</h1>
      <p className="mt-1 text-[13px] text-muted">
        Order # {orderNumber} · Placed on {formatDate(order.createdAt)}
      </p>

      <div className="mt-4 bg-card rounded-sm shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-headline">Status: {order.status}</h2>
            <p className="mt-1 text-[13px] text-muted">
              {order.status === "Pending"
                ? "We are working to prepare your shipment."
                : `Arriving ${etaDate(order.createdAt, order.shippingMethod.etaDays)} via ${
                    order.shippingMethod.name
                  }`}
            </p>
          </div>
          <span className="text-sm text-headline font-medium">
            Total: {formatPrice(order.totals.totalCents)}
          </span>
        </div>
      </div>

      <div className="mt-4 bg-card rounded-sm shadow-sm p-5">
        <h2 className="text-lg font-medium text-headline mb-3">Items in this order</h2>
        <ul className="divide-y divide-border">
          {order.items.map((i) => (
            <li key={i.variantSku} className="py-3 flex gap-3">
              <div className="shrink-0 w-16 h-16 bg-[#f7fafa] rounded-sm overflow-hidden">
                <Image
                  src={i.image}
                  alt={i.title}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-headline leading-snug line-clamp-2">{i.title}</p>
                <p className="text-[12px] text-muted mt-0.5">
                  Configuration: {i.variantSku} · Qty: {i.qty}
                </p>
              </div>
              <div className="shrink-0 text-right text-[14px] font-medium text-headline">
                {formatPrice(i.unitPriceCents * i.qty)}
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-border pt-3 flex justify-end">
          <div className="space-y-1 text-[14px]">
            <div className="flex justify-between gap-6">
              <span className="text-muted">Subtotal</span>
              <span className="font-medium">{formatPrice(order.totals.subtotalCents)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-muted">Shipping &amp; handling</span>
              <span className="font-medium text-[#007600]">
                {order.totals.shippingCents === 0 ? "FREE" : formatPrice(order.totals.shippingCents)}
              </span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-muted">Tax collected</span>
              <span className="font-medium">{formatPrice(order.totals.taxCents)}</span>
            </div>
            <div className="flex justify-between gap-6 text-base font-semibold text-headline pt-1">
              <span>Order total</span>
              <span>{formatPrice(order.totals.totalCents)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-sm shadow-sm p-5">
          <h3 className="font-semibold text-headline text-sm">Shipping address</h3>
          <p className="mt-1 text-[13px] text-muted leading-relaxed">
            {order.shippingAddress.fullName}
            <br />
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? <>, {order.shippingAddress.line2}</> : null}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
            {order.shippingAddress.phone ? (
              <>
                <br />
                Phone: {order.shippingAddress.phone}
              </>
            ) : null}
          </p>
        </div>
        <div className="bg-card rounded-sm shadow-sm p-5">
          <h3 className="font-semibold text-headline text-sm">Payment method</h3>
          <p className="mt-1 text-[13px] text-muted">
            {order.payment.brand} ending in {order.payment.last4}
          </p>
        </div>
      </div>

      <p className="mt-6 text-[13px]">
        <Link href="/orders" className="text-link hover:underline">
          ← Back to your orders
        </Link>
      </p>
    </div>
  );
}