import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { fetchOwnedOrder } from "@/lib/order-view";
import { formatPrice, formatDate, etaDate, orderDisplayNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order Confirmation" };

const timelineSteps: Array<{ label: string; sub: string }> = [
  { label: "Order placed", sub: "We have it" },
  { label: "Preparing", sub: "Getting things ready" },
  { label: "On the way", sub: "With the carrier" },
  { label: "Delivered", sub: "At your door" },
];

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("/account");
  const order = await fetchOwnedOrder(id, user._id);
  if (!order) notFound();
  const orderNumber = orderDisplayNumber(String(order.orderKey));
  const total = order.totals.totalCents;

  return (
    <div className="morrow-container min-h-screen py-8 sm:py-12">
      <section className="morrow-panel border-success/30 bg-success-soft p-6 sm:p-8"><p className="morrow-eyebrow !text-success">Order placed</p><h1 className="mt-3 font-display text-4xl text-headline">Thank you, {user.name}.</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">Your order <span className="font-bold text-headline">#{orderNumber}</span> is confirmed. A summary has been sent to <span className="font-semibold text-headline">{user.email}</span>.</p></section>
      <section className="morrow-panel mt-5 p-5 sm:p-6"><p className="morrow-eyebrow">Delivery outlook</p><h2 className="mt-2 font-display text-3xl text-headline">Arriving {etaDate(order.createdAt, order.shippingMethod.etaDays)}</h2>{showTimeline(order.status) && <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{timelineSteps.map((step) => { const done = stepDone(order.status, step); return <li key={step.label} className={`rounded-xl border p-3 text-center text-xs ${done ? "border-success/30 bg-success-soft text-success" : "border-border bg-surface text-text-muted"}`}><span className="block text-[10px] font-bold uppercase tracking-[0.12em]">{step.label}</span><span className="mt-1 block text-[11px]">{step.sub}</span></li>; })}</ol>}</section>
      <section className="morrow-panel mt-5 p-5 sm:p-6"><h2 className="font-display text-2xl text-headline">Order details</h2><ul className="mt-3 divide-y divide-border">{order.items.map((item) => <li key={item.variantSku} className="flex gap-3 py-4"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-raised"><Image src={item.image} alt={item.title} width={64} height={64} className="h-full w-full object-contain p-1" /></div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold text-headline">{item.title}</p><p className="mt-1 text-xs text-text-muted">Option: {item.variantSku} · Quantity: {item.qty}</p></div><div className="shrink-0 text-right text-sm font-bold text-headline">{formatPrice(item.unitPriceCents * item.qty)}</div></li>)}</ul><div className="mt-4 flex justify-end border-t border-border pt-4"><div className="w-full max-w-xs space-y-2 text-sm"><div className="flex justify-between"><span className="text-text-secondary">Subtotal</span><span className="font-semibold text-headline">{formatPrice(order.totals.subtotalCents)}</span></div><div className="flex justify-between"><span className="text-text-secondary">Delivery</span><span className="font-semibold text-success">{order.totals.shippingCents === 0 ? "Complimentary" : formatPrice(order.totals.shippingCents)}</span></div><div className="flex justify-between"><span className="text-text-secondary">Estimated tax</span><span className="font-semibold text-headline">{formatPrice(order.totals.taxCents)}</span></div><div className="flex justify-between border-t border-border pt-2 text-base"><span className="font-bold text-headline">Total</span><span className="font-extrabold text-headline">{formatPrice(total)}</span></div></div></div></section>
      <div className="mt-5 grid gap-5 sm:grid-cols-2"><section className="morrow-panel p-5"><h2 className="text-sm font-bold text-headline">Shipping address</h2><p className="mt-2 text-sm leading-relaxed text-text-secondary">{order.shippingAddress.fullName}<br />{order.shippingAddress.line1}{order.shippingAddress.line2 ? <>, {order.shippingAddress.line2}</> : null}<br />{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}{order.shippingAddress.phone ? <><br />Phone: {order.shippingAddress.phone}</> : null}</p></section><section className="morrow-panel p-5"><h2 className="text-sm font-bold text-headline">Payment method</h2><p className="mt-2 text-sm text-text-secondary">{order.payment.brand} ending in {order.payment.last4}</p><p className="mt-1 text-xs text-text-muted">Placed on {formatDate(order.createdAt)}</p></section></div>
      <div className="mt-6 flex flex-wrap gap-4"><Link href="/orders" className="morrow-button-secondary">View all orders</Link><Link href="/search" className="morrow-link self-center text-sm">Continue browsing <span aria-hidden="true">↗</span></Link></div>
    </div>
  );
}

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
