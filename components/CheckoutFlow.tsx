"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { setCartSummary } from "@/lib/cart-client";
import { savePaymentMethod, saveShippingAddress, placeOrder } from "@/app/_actions/checkout";

export interface CheckoutLine {
  productId: string;
  variantSku: string;
  slug: string;
  title: string;
  image: string;
  priceCents: number;
  qty: number;
  label: string;
  stock: number;
}

export interface CheckoutAddress {
  id: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export interface CheckoutPaymentMethod {
  id: string;
  cardholderName: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface CheckoutTotals {
  itemsCount: number;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA",
  "RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

function detectBrand(num: string): string {
  const n = num.replace(/[\s-]/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "American Express";
  if (/^6(?:011|5)/.test(n)) return "Discover";
  return "Card";
}

export function CheckoutFlow({
  addresses: initialAddresses,
  paymentMethods: initialMethods,
  lines,
  totals,
  deliveryDate,
}: {
  addresses: CheckoutAddress[];
  paymentMethods: CheckoutPaymentMethod[];
  lines: CheckoutLine[];
  totals: CheckoutTotals;
  deliveryDate: string;
}) {
  const router = useRouter();
  const [orderKey] = useState(() => crypto.randomUUID());
  const [orderError, setOrderError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const [addresses, setAddresses] = useState<CheckoutAddress[]>(initialAddresses);
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(initialAddresses[0]?.id ?? null);
  const [addrFormOpen, setAddrFormOpen] = useState(initialAddresses.length === 0);
  const [addrBusy, setAddrBusy] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
  });

  const [methods, setMethods] = useState<CheckoutPaymentMethod[]>(initialMethods);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(initialMethods[0]?.id ?? null);
  const [payFormOpen, setPayFormOpen] = useState(initialMethods.length === 0);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [card, setCard] = useState({
    cardholderName: "",
    cardNumber: "",
    expMonth: 1,
    expYear: 2026,
    cvv: "",
  });

  const selectedAddress = addresses.find((a) => a.id === selectedAddrId);
  const selectedMethod = methods.find((m) => m.id === selectedMethodId);
  const canPlace = Boolean(selectedAddress && selectedMethod) && lines.length > 0 && !placing;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (addrBusy) return;
    setAddrBusy(true);
    setAddrError(null);
    const res = await saveShippingAddress(form);
    setAddrBusy(false);
    if (!res.ok) {
      setAddrError(res.error);
      return;
    }
    setAddresses(res.addresses);
    setSelectedAddrId(res.addresses[res.addresses.length - 1].id);
    setAddrFormOpen(false);
    setForm({ fullName: "", line1: "", line2: "", city: "", state: "", zip: "", phone: "" });
  }

  async function saveCard(e: React.FormEvent) {
    e.preventDefault();
    if (payBusy) return;
    const number = card.cardNumber.replace(/[\s-]/g, "");
    const last4 = number.slice(-4);
    setPayBusy(true);
    setPayError(null);
    const res = await savePaymentMethod({
      cardholderName: card.cardholderName,
      brand: detectBrand(number),
      last4,
      expMonth: Number(card.expMonth),
      expYear: Number(card.expYear),
    });
    setPayBusy(false);
    if (!res.ok) {
      setPayError(res.error);
      return;
    }
    setMethods(res.paymentMethods);
    setSelectedMethodId(res.paymentMethods[res.paymentMethods.length - 1].id);
    setPayFormOpen(false);
    setCard({ cardholderName: "", cardNumber: "", expMonth: 1, expYear: 2026, cvv: "" });
  }

  async function submitOrder() {
    if (!canPlace) return;
    setPlacing(true);
    setOrderError(null);
    const res = await placeOrder({
      orderKey,
      expectedTotalCents: totals.totalCents,
      address: {
        fullName: selectedAddress!.fullName,
        line1: selectedAddress!.line1,
        line2: selectedAddress!.line2,
        city: selectedAddress!.city,
        state: selectedAddress!.state,
        zip: selectedAddress!.zip,
        phone: selectedAddress!.phone,
      },
      payment: { brand: selectedMethod!.brand, last4: selectedMethod!.last4 },
    });
    if (res.ok) {
      setCartSummary({ totalQty: 0, subtotalCents: 0, qualifiesForFreeDelivery: false, items: [] });
      router.push(`/order-confirmation/${res.orderId}`);
      return;
    }
    setPlacing(false);
    setOrderError(res.error);
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
      {/* Left column */}
      <div className="space-y-4 min-w-0">
        {/* 1. Shipping address */}
        <section className="bg-card rounded-sm shadow-sm p-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#ddd] text-[13px] font-semibold text-headline">
              1
            </span>
            <h2 className="text-lg font-medium text-headline">
              {selectedAddress ? "Shipping address" : "Add delivery address"}
            </h2>
          </div>

          {addresses.length > 0 && (
            <div className="mt-3 space-y-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className="flex items-start gap-2 p-2 rounded-sm border border-border cursor-pointer hover:bg-row-hover"
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddrId === a.id}
                    onChange={() => setSelectedAddrId(a.id)}
                    className="mt-1 w-4 h-4 accent-[#007185]"
                  />
                  <span className="text-[13px] leading-snug text-headline">
                    <span className="font-semibold">{a.fullName}</span>
                    <br />
                    {a.line1}
                    {a.line2 ? <> {a.line2}</> : null}
                    <br />
                    {a.city}, {a.state} {a.zip}
                    <br />
                    <span className="text-muted">Phone: {a.phone || "—"}</span>
                    <span className="block text-[#007600] font-medium text-[12px]">
                      FREE delivery {deliveryDate}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {!addrFormOpen ? (
            <button
              type="button"
              onClick={() => setAddrFormOpen(true)}
              className="mt-3 text-[13px] text-link hover:text-link-hover hover:underline cursor-pointer"
            >
              + Add a new delivery address
            </button>
          ) : (
            <form onSubmit={(e) => void saveAddress(e)} className="mt-3 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-bold text-headline">Full name</label>
                <input
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  required
                  className="mt-1 w-full h-8 rounded-sm border border-border px-2 text-sm outline-none focus:border-[#e77600]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-bold text-headline">Address line 1</label>
                <input
                  value={form.line1}
                  onChange={(e) => set("line1", e.target.value)}
                  required
                  placeholder="Street address, P.O. box, company name, c/o"
                  className="mt-1 w-full h-8 rounded-sm border border-border px-2 text-sm outline-none focus:border-[#e77600]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-bold text-headline">Address line 2</label>
                <input
                  value={form.line2}
                  onChange={(e) => set("line2", e.target.value)}
                  placeholder="Apartment, suite, unit, building, floor, etc."
                  className="mt-1 w-full h-8 rounded-sm border border-border px-2 text-sm outline-none focus:border-[#e77600]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-headline">City</label>
                <input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  required
                  className="mt-1 w-full h-8 rounded-sm border border-border px-2 text-sm outline-none focus:border-[#e77600]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[13px] font-bold text-headline">State</label>
                  <select
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                    required
                    className="mt-1 w-full h-8 rounded-sm border border-border px-1 text-sm outline-none focus:border-[#e77600] bg-white"
                  >
                    <option value="">Select</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-headline">ZIP</label>
                  <input
                    value={form.zip}
                    onChange={(e) => set("zip", e.target.value)}
                    required
                    inputMode="numeric"
                    className="mt-1 w-full h-8 rounded-sm border border-border px-2 text-sm outline-none focus:border-[#e77600]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-headline">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="Optional"
                  className="mt-1 w-full h-8 rounded-sm border border-border px-2 text-sm outline-none focus:border-[#e77600]"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                {addrError && <p className="text-[13px] text-[#c40000]">{addrError}</p>}
                <button
                  type="submit"
                  disabled={addrBusy}
                  className="bg-cta hover:bg-[#e6c200] border border-cta-border text-headline rounded-sm px-4 py-1.5 text-[13px] font-medium shadow-sm disabled:opacity-50"
                >
                  {addrBusy ? "Saving…" : "Use this address"}
                </button>
                <button
                  type="button"
                  onClick={() => setAddrFormOpen(false)}
                  className="text-[13px] text-muted hover:text-headline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* 2. Payment method */}
        <section className="bg-card rounded-sm shadow-sm p-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#ddd] text-[13px] font-semibold text-headline">
              2
            </span>
            <h2 className="text-lg font-medium text-headline">Payment method</h2>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted">
            Demo checkout — no real payment is processed. CVV and full card numbers are never stored
            or transmitted; only the brand and last 4 digits are saved.
          </p>

          {methods.length > 0 && (
            <div className="mt-2 space-y-2">
              {methods.map((m) => (
                <label
                  key={m.id}
                  className="flex items-start gap-2 p-2 rounded-sm border border-border cursor-pointer hover:bg-row-hover"
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={selectedMethodId === m.id}
                    onChange={() => setSelectedMethodId(m.id)}
                    className="mt-1 w-4 h-4 accent-[#007185]"
                  />
                  <span className="text-[13px] text-headline">
                    <span className="font-semibold">{m.brand}</span> ending in {m.last4} —{" "}
                    {m.cardholderName}
                    <br />
                    <span className="text-muted">Expires {m.expMonth}/{m.expYear}</span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {!payFormOpen ? (
            <button
              type="button"
              onClick={() => setPayFormOpen(true)}
              className="mt-3 text-[13px] text-link hover:text-link-hover hover:underline cursor-pointer"
            >
              + Add a card
            </button>
          ) : (
            <form onSubmit={(e) => void saveCard(e)} className="mt-3 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-bold text-headline">Cardholder name</label>
                <input
                  value={card.cardholderName}
                  onChange={(e) => setCard((c) => ({ ...c, cardholderName: e.target.value }))}
                  required
                  className="mt-1 w-full h-8 rounded-sm border border-border px-2 text-sm outline-none focus:border-[#e77600]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-headline">Card number</label>
                <input
                  value={card.cardNumber}
                  onChange={(e) => setCard((c) => ({ ...c, cardNumber: e.target.value }))}
                  required
                  inputMode="numeric"
                  placeholder="Demo only — never stored"
                  className="mt-1 w-full h-8 rounded-sm border border-border px-2 text-sm outline-none focus:border-[#e77600]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-headline">Expiration</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <select
                    value={card.expMonth}
                    onChange={(e) => setCard((c) => ({ ...c, expMonth: Number(e.target.value) }))}
                    className="h-8 rounded-sm border border-border px-1 text-sm outline-none bg-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={card.expYear}
                    onChange={(e) => setCard((c) => ({ ...c, expYear: Number(e.target.value) }))}
                    className="h-8 rounded-sm border border-border px-1 text-sm outline-none bg-white"
                  >
                    {Array.from({ length: 11 }, (_, i) => 2026 + i).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-headline">CVV</label>
                <input
                  value={card.cvv}
                  onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value }))}
                  inputMode="numeric"
                  maxLength={4}
                  required
                  placeholder="Demo only — never stored"
                  className="mt-1 w-full h-8 rounded-sm border border-border px-2 text-sm outline-none focus:border-[#e77600]"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                {payError && <p className="text-[13px] text-[#c40000]">{payError}</p>}
                <button
                  type="submit"
                  disabled={payBusy || card.cardNumber.replace(/[\s-]/g, "").length < 13}
                  className="bg-cta hover:bg-[#e6c200] border border-cta-border text-headline rounded-sm px-4 py-1.5 text-[13px] font-medium shadow-sm disabled:opacity-50"
                >
                  {payBusy ? "Saving…" : "Add card"}
                </button>
                <button
                  type="button"
                  onClick={() => setPayFormOpen(false)}
                  className="text-[13px] text-muted hover:text-headline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* 3. Review items and shipping */}
        <section className="bg-card rounded-sm shadow-sm p-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#ddd] text-[13px] font-semibold text-headline">
              3
            </span>
            <h2 className="text-lg font-medium text-headline">Review items and shipping</h2>
          </div>
          <ul className="mt-2 divide-y divide-border">
            {lines.map((l) => (
              <li key={l.variantSku} className="py-3 flex gap-3">
                <a href={`/product/${l.slug}`} className="shrink-0 w-20 h-20 bg-[#f7fafa] rounded-sm overflow-hidden">
                  <Image src={l.image} alt={l.title} width={80} height={80} className="w-full h-full object-cover" />
                </a>
                <div className="flex-1 min-w-0">
                  <a href={`/product/${l.slug}`} className="text-[14px] leading-snug text-link hover:underline line-clamp-2">
                    {l.title}
                  </a>
                  {l.label && (
                    <p className="text-[12px] text-faint mt-0.5">
                      Configuration: {l.label}
                    </p>
                  )}
                  <p className="text-[12px] text-muted">
                    Sold by Amazon clone · Quantity: {l.qty}
                  </p>
                  <p className="text-[12px] text-[#007600] font-medium">
                    In Stock · FREE delivery {deliveryDate}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[14px] font-semibold text-headline">
                    {formatPrice(l.priceCents * l.qty)}
                  </p>
                  <p className="text-[12px] text-faint">{formatPrice(l.priceCents)} each</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Right rail */}
      {lines.length > 0 && (
        <aside className="bg-card rounded-sm shadow-sm p-4 lg:sticky lg:top-3">
          <h2 className="text-lg font-medium text-headline border-b border-border pb-2">
            Order summary
          </h2>
          <dl className="mt-3 space-y-1 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-muted">
                Items ({totals.itemsCount} {totals.itemsCount === 1 ? "item" : "items"}):
              </dt>
              <dd className="font-medium">{formatPrice(totals.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Shipping &amp; handling:</dt>
              <dd className="font-medium text-[#007600]">
                {totals.shippingCents === 0 ? "FREE" : formatPrice(totals.shippingCents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Estimated tax to be collected:</dt>
              <dd className="font-medium">{formatPrice(totals.taxCents)}</dd>
            </div>
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border">
              <dt>Order total:</dt>
              <dd>{formatPrice(totals.totalCents)}</dd>
            </div>
          </dl>

          {orderError && (
            <p className="mt-3 rounded-sm border border-[#c40000] bg-[#fff5f5] px-3 py-2 text-[13px] text-headline">
              {orderError}
            </p>
          )}

          <button
            type="button"
            disabled={!canPlace}
            onClick={() => void submitOrder()}
            className="w-full mt-3 bg-cta hover:bg-[#e6c200] border border-cta-border text-headline rounded-[20px] px-4 py-2 text-[13px] font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {placing ? "Placing your order…" : "Place your order"}
          </button>

          <p className="mt-3 text-[11px] leading-snug text-muted">
            When you click the &ldquo;Place your order&rdquo; button, your contract to purchase is
            complete when we send you an email confirmation of your shipment.
          </p>
        </aside>
      )}
    </div>
  );
}