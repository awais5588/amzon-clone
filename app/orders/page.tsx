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
    return (
      <div className="max-w-[1000px] mx-auto px-3 py-8">
        <h1 className="text-3xl font-semibold text-headline">Your Orders</h1>
        <div className="mt-4 bg-card rounded-sm shadow-sm p-10 text-center">
          <h2 className="text-lg text-headline">Looks like you haven’t placed an order yet</h2>
          <p className="mt-1 text-[13px] text-muted">
            When you place an order, it will show up here.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 bg-cta hover:bg-[#e6c200] border border-cta-border text-headline rounded-sm px-4 py-1.5 text-[13px] font-medium shadow-sm"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-3 py-8">
      <h1 className="text-3xl font-semibold text-headline">Your Orders</h1>
      <div className="mt-4 space-y-4">
        {orders.map((o) => {
          const orderNumber = orderDisplayNumber(String(o.orderKey));
          const first = o.items[0];
          return (
            <div key={String(o._id)} className="bg-card rounded-sm shadow-sm border border-border">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 border-b border-border bg-row-hover text-[12px] text-muted rounded-t-sm">
                <span>
                  ORDER PLACED <br />
                  <span className="text-headline font-medium">{formatDate(o.createdAt)}</span>
                </span>
                <span>
                  TOTAL <br />
                  <span className="text-headline font-medium">{formatPrice(o.totals.totalCents)}</span>
                </span>
                <span>
                  SHIP TO <br />
                  <span className="text-headline font-medium">{o.shippingAddress.fullName}</span>
                </span>
                <span className="ml-auto text-right">
                  ORDER # <span className="text-headline font-medium">{orderNumber}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex -space-x-2">
                  {o.items.slice(0, 3).map((i) => (
                    <div
                      key={i.variantSku}
                      className="w-12 h-12 bg-[#f7fafa] rounded-full border-2 border-white overflow-hidden"
                    >
                      <Image src={i.image} alt={i.title} width={48} height={48} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[14px] text-headline font-medium leading-snug line-clamp-1">
                    {first?.title}
                    {o.items.length > 1 ? ` +${o.items.length - 1} more` : ""}
                  </h2>
                  <p className="text-[12px] text-muted">
                    Status: <span className="text-[#007600] font-medium">{o.status}</span>
                  </p>
                  <p className="text-[12px] text-muted">
                    Arriving {etaDate(o.createdAt, o.shippingMethod.etaDays)}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col gap-2">
                  <Link
                    href={`/orders/${String(o._id)}`}
                    className="bg-white hover:bg-row-hover border border-border text-headline rounded-sm px-3 py-1.5 text-[12px] font-medium whitespace-nowrap text-center"
                  >
                    View order
                  </Link>
                  <Link
                    href={`/order-confirmation/${String(o._id)}`}
                    className="bg-white hover:bg-row-hover border border-border text-headline rounded-sm px-3 py-1.5 text-[12px] font-medium whitespace-nowrap text-center"
                  >
                    Details
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}