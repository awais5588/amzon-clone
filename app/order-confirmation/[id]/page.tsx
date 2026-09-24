import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { fetchOwnedOrder } from "@/lib/order-view";
import { formatPrice, formatDate, etaDate, orderDisplayNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Order Confirmation" };

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser("/account");
  const order = await fetchOwnedOrder(id, user._id);
  if (!order) notFound();

  const orderNumber = orderDisplayNumber(String(order.orderKey));
  const total = order.totals.totalCents;

  return (
    <div className="max-w-[1000px] mx-auto px-3 py-6">
      <div className="bg-card rounded-sm shadow-sm p-6">
        <p className="text-[#007600] font-semibold">Thank you, your order has been placed.</p>
        <p className="mt-1 text-sm text-muted">
          Confirmation for order{" "}
          <span className="font-medium text-headline">{orderNumber}</span> was sent to{" "}
          <span className="font-medium text-headline">{user.email}</span>.
        </p>
      </div>

      <div className="mt-4 bg-card rounded-sm shadow-sm p-5">
        <h2 className="text-lg font-medium text-headline">Arriving Thursday, {etaDate(order.createdAt, order.shippingMethod.etaDays)}</h2>
        {showTimeline(order.status) && (
          <ol className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {timelineSteps.map((s) => {
              const past = stepDone(order.status, s);
              return (
                <li
                  key={s.label}
                  className={`px-2 py-2 rounded-sm text-[12px] leading-tight ${
                    past ? "bg-[#eefaf7] text-[#0b7a5b]" : "bg-row-hover text-muted"
                  }`}
                >
                  <span className="block font-semibold text-[11px] uppercase tracking-wide">
                    {s.label}
                  </span>
                  {s.sub}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="mt-4 bg-card rounded-sm shadow-sm p-5">
        <h2 className="text-lg font-medium text-headline">Order details</h2>
        <ul className="mt-2 divide-y divide-border">
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
              <span className="text-muted">Estimated tax to be collected</span>
              <span className="font-medium">{formatPrice(order.totals.taxCents)}</span>
            </div>
            <div className="flex justify-between gap-6 text-base font-semibold text-headline pt-1">
              <span>Total for this order:</span>
              <span>{formatPrice(total)}</span>
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
          <p className="mt-2 text-[13px] text-muted">Placed on {formatDate(order.createdAt)}</p>
        </div>
      </div>

      <p className="mt-6 text-[13px]">
        <Link href="/orders" className="text-link hover:underline">
          ← View all orders
        </Link>
      </p>
    </div>
  );
}

const timelineSteps: Array<{ label: string; sub: string }> = [
  { label: "Order placed", sub: "We've received it" },
  { label: "Preparing shipment", sub: "Arriving Thursday" },
  { label: "Dispatched", sub: "" },
  { label: "Delivered", sub: "" },
];

function stepDone(status: string, step: { label: string }): boolean {
  if (status === "Cancelled") return false;
  if (step.label === "Order placed") return true;
  if (status === "Delivered") return true;
  if (status === "Shipped" || status === "Processing") return step.label !== "Delivered";
  return false;
}

function showTimeline(status: string): boolean {
  return status !== "Cancelled";
}