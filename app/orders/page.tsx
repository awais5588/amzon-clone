import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { fetchOwnedOrders } from "@/lib/order-view";
import { formatPrice, formatDate, etaDate, orderDisplayNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Orders" };

export default async function OrdersPage() {
  const user = await requireUser("/orders");
  const orders = await fetchOwnedOrders(user._id);

  if (orders.length === 0) {
    return <div className="morrow-container min-h-screen py-8 sm:py-12"><header className="border-b border-border pb-7"><p className="morrow-eyebrow">Your history</p><h1 className="mt-2 font-display text-4xl text-headline">Your orders</h1></header><section className="morrow-panel mt-6 p-10 text-center sm:p-14"><p className="morrow-eyebrow">Nothing ordered yet</p><h2 className="mt-3 font-display text-3xl text-headline">Your first good find is out there.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-secondary">When you place an order, it will appear here with its latest status and delivery details.</p><Link href="/search" className="morrow-button mt-7">Explore the catalog <span aria-hidden="true">↗</span></Link></section></div>;
  }

  return (
    <div className="morrow-container min-h-screen py-8 sm:py-12">
      <header className="border-b border-border pb-7"><p className="morrow-eyebrow">Your history</p><h1 className="mt-2 font-display text-4xl text-headline sm:text-5xl">Your orders</h1><p className="mt-3 text-sm text-text-secondary">A record of what you&apos;ve chosen and what comes next.</p></header>
      <div className="mt-6 space-y-4">{orders.map((order) => { const orderNumber = orderDisplayNumber(String(order.orderKey)); const first = order.items[0]; return <article key={String(order._id)} className="morrow-panel overflow-hidden"><div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-border bg-surface px-4 py-3 text-xs text-text-muted sm:px-5"><span>Placed <strong className="ml-1 font-semibold text-headline">{formatDate(order.createdAt)}</strong></span><span>Total <strong className="ml-1 font-semibold text-headline">{formatPrice(order.totals.totalCents)}</strong></span><span>Ships to <strong className="ml-1 font-semibold text-headline">{order.shippingAddress.fullName}</strong></span><span className="ml-auto">Order <strong className="ml-1 font-semibold text-headline">#{orderNumber}</strong></span></div><div className="flex flex-wrap items-center gap-4 p-4 sm:p-5"><div className="flex -space-x-2">{order.items.slice(0, 3).map((item) => <div key={item.variantSku} className="h-12 w-12 overflow-hidden rounded-full border-2 border-surface-raised bg-surface"><Image src={item.image} alt={item.title} width={48} height={48} className="h-full w-full object-contain p-1" /></div>)}</div><div className="min-w-0 flex-1"><h2 className="line-clamp-1 text-sm font-bold text-headline">{first?.title}{order.items.length > 1 ? ` +${order.items.length - 1} more` : ""}</h2><p className="mt-1 text-xs text-text-secondary">Status: <span className="font-semibold text-success">{order.status}</span></p><p className="mt-1 text-xs text-text-muted">Arriving {etaDate(order.createdAt, order.shippingMethod.etaDays)}</p></div><div className="flex shrink-0 flex-col gap-2"><Link href={`/orders/${String(order._id)}`} className="morrow-button-secondary px-3 py-2 text-xs">View order</Link><Link href={`/order-confirmation/${String(order._id)}`} className="morrow-link text-center text-xs">View confirmation</Link></div></div></article>; })}</div>
    </div>
  );
}
