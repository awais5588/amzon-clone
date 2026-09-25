import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { fetchOwnedOrder } from "@/lib/order-view";
import { formatPrice, formatDate, etaDate, orderDisplayNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order Details" };

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("/orders");
  const order = await fetchOwnedOrder(id, user._id);
  if (!order) notFound();
  const orderNumber = orderDisplayNumber(String(order.orderKey));

  return (
    <div className="morrow-container min-h-screen py-8 sm:py-12">
      <nav className="text-xs text-text-muted"><Link href="/orders" className="hover:text-accent">Orders</Link><span className="mx-2">/</span><span className="text-text-secondary">#{orderNumber}</span></nav>
      <header className="mt-5 flex flex-col gap-3 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="morrow-eyebrow">Order details</p><h1 className="mt-2 font-display text-4xl text-headline">#{orderNumber}</h1><p className="mt-2 text-sm text-text-muted">Placed on {formatDate(order.createdAt)}</p></div><p className="text-2xl font-extrabold text-headline">{formatPrice(order.totals.totalCents)}</p></header>
      <section className="morrow-panel mt-6 p-5 sm:p-6"><p className="morrow-eyebrow">Current status</p><h2 className="mt-2 text-xl font-bold text-headline">{order.status}</h2><p className="mt-1 text-sm text-text-secondary">{order.status === "Pending" ? "We are preparing your shipment." : `Arriving ${etaDate(order.createdAt, order.shippingMethod.etaDays)} via ${order.shippingMethod.name}`}</p></section>
      <section className="morrow-panel mt-5 p-5 sm:p-6"><h2 className="font-display text-2xl text-headline">Items in this order</h2><ul className="mt-3 divide-y divide-border">{order.items.map((item) => <li key={item.variantSku} className="flex gap-3 py-4"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-raised"><Image src={item.image} alt={item.title} width={64} height={64} className="h-full w-full object-contain p-1" /></div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold text-headline">{item.title}</p><p className="mt-1 text-xs text-text-muted">Option: {item.variantSku} · Quantity: {item.qty}</p></div><div className="shrink-0 text-right text-sm font-bold text-headline">{formatPrice(item.unitPriceCents * item.qty)}</div></li>)}</ul><div className="mt-4 flex justify-end border-t border-border pt-4"><div className="w-full max-w-xs space-y-2 text-sm"><div className="flex justify-between"><span className="text-text-secondary">Subtotal</span><span className="font-semibold text-headline">{formatPrice(order.totals.subtotalCents)}</span></div><div className="flex justify-between"><span className="text-text-secondary">Delivery</span><span className="font-semibold text-success">{order.totals.shippingCents === 0 ? "Complimentary" : formatPrice(order.totals.shippingCents)}</span></div><div className="flex justify-between"><span className="text-text-secondary">Tax collected</span><span className="font-semibold text-headline">{formatPrice(order.totals.taxCents)}</span></div><div className="flex justify-between border-t border-border pt-2 text-base"><span className="font-bold text-headline">Order total</span><span className="font-extrabold text-headline">{formatPrice(order.totals.totalCents)}</span></div></div></div></section>
      <div className="mt-5 grid gap-5 sm:grid-cols-2"><section className="morrow-panel p-5"><h2 className="text-sm font-bold text-headline">Shipping address</h2><p className="mt-2 text-sm leading-relaxed text-text-secondary">{order.shippingAddress.fullName}<br />{order.shippingAddress.line1}{order.shippingAddress.line2 ? <>, {order.shippingAddress.line2}</> : null}<br />{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}{order.shippingAddress.phone ? <><br />Phone: {order.shippingAddress.phone}</> : null}</p></section><section className="morrow-panel p-5"><h2 className="text-sm font-bold text-headline">Payment method</h2><p className="mt-2 text-sm text-text-secondary">{order.payment.brand} ending in {order.payment.last4}</p></section></div>
      <Link href="/orders" className="morrow-link mt-6 inline-flex text-sm">← Back to your orders</Link>
    </div>
  );
}
