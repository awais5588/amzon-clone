"use client";

import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import Image from "next/image";
import Link from "next/link";
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

type AddressFormValues = { fullName: string; line1: string; line2: string; city: string; state: string; zip: string; phone: string };
type CardFormValues = { cardholderName: string; cardNumber: string; expMonth: number; expYear: number; cvv: string };

const STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

function detectBrand(number: string): string {
  const normalized = number.replace(/[\s-]/g, "");
  if (/^4/.test(normalized)) return "Visa";
  if (/^5[1-5]/.test(normalized) || /^2[2-7]/.test(normalized)) return "Mastercard";
  if (/^3[47]/.test(normalized)) return "American Express";
  if (/^6(?:011|5)/.test(normalized)) return "Discover";
  return "Card";
}

function StepHeading({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border pb-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-sm font-extrabold text-accent">{number}</span>
      <h2 className="text-lg font-bold text-headline">{title}</h2>
    </div>
  );
}

export function CheckoutFlow({ addresses: initialAddresses, paymentMethods: initialMethods, lines, totals, deliveryDate, onlySkus, isGift }: { addresses: CheckoutAddress[]; paymentMethods: CheckoutPaymentMethod[]; lines: CheckoutLine[]; totals: CheckoutTotals; deliveryDate: string; onlySkus?: string[]; isGift?: boolean }) {
  const router = useRouter();
  const [orderKey] = useState(() => crypto.randomUUID());
  const [orderError, setOrderError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(initialAddresses[0]?.id ?? null);
  const [addrFormOpen, setAddrFormOpen] = useState(initialAddresses.length === 0);
  const [addrBusy, setAddrBusy] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormValues>({ fullName: "", line1: "", line2: "", city: "", state: "", zip: "", phone: "" });
  const [methods, setMethods] = useState(initialMethods);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(initialMethods[0]?.id ?? null);
  const [payFormOpen, setPayFormOpen] = useState(initialMethods.length === 0);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [card, setCard] = useState<CardFormValues>({ cardholderName: "", cardNumber: "", expMonth: 1, expYear: new Date().getFullYear(), cvv: "" });

  const selectedAddress = addresses.find((address) => address.id === selectedAddrId);
  const selectedMethod = methods.find((method) => method.id === selectedMethodId);
  const canPlace = Boolean(selectedAddress && selectedMethod) && lines.length > 0 && !placing;
  const currentYear = new Date().getFullYear();

  function setField<Key extends keyof typeof form>(key: Key, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (addrBusy) return;
    setAddrBusy(true);
    setAddrError(null);
    const result = await saveShippingAddress(form);
    setAddrBusy(false);
    if (!result.ok) {
      setAddrError(result.error);
      return;
    }
    setAddresses(result.addresses);
    setSelectedAddrId(result.addresses[result.addresses.length - 1].id);
    setAddrFormOpen(false);
    setForm({ fullName: "", line1: "", line2: "", city: "", state: "", zip: "", phone: "" });
  }

  async function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (payBusy) return;
    const number = card.cardNumber.replace(/[\s-]/g, "");
    setPayBusy(true);
    setPayError(null);
    const result = await savePaymentMethod({ cardholderName: card.cardholderName, brand: detectBrand(number), last4: number.slice(-4), expMonth: Number(card.expMonth), expYear: Number(card.expYear) });
    setPayBusy(false);
    if (!result.ok) {
      setPayError(result.error);
      return;
    }
    setMethods(result.paymentMethods);
    setSelectedMethodId(result.paymentMethods[result.paymentMethods.length - 1].id);
    setPayFormOpen(false);
    setCard({ cardholderName: "", cardNumber: "", expMonth: 1, expYear: currentYear, cvv: "" });
  }

  async function submitOrder() {
    if (!canPlace) return;
    setPlacing(true);
    setOrderError(null);
    const result = await placeOrder({ orderKey, expectedTotalCents: totals.totalCents, address: { fullName: selectedAddress!.fullName, line1: selectedAddress!.line1, line2: selectedAddress!.line2, city: selectedAddress!.city, state: selectedAddress!.state, zip: selectedAddress!.zip, phone: selectedAddress!.phone }, payment: { brand: selectedMethod!.brand, last4: selectedMethod!.last4 }, onlySkus, isGift });
    if (result.ok) {
      const state = await (await import("@/app/_actions/cart")).getCartState();
      setCartSummary(state);
      router.push(`/order-confirmation/${result.orderId}`);
      return;
    }
    setPlacing(false);
    setOrderError(result.error);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        <section className="morrow-panel p-5 sm:p-6">
          <StepHeading number={1} title={selectedAddress ? "Delivery address" : "Add a delivery address"} />
          {addresses.length > 0 && <div className="mt-4 space-y-2">{addresses.map((address) => <label key={address.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${selectedAddrId === address.id ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent"}`}><input type="radio" name="address" checked={selectedAddrId === address.id} onChange={() => setSelectedAddrId(address.id)} className="mt-1 h-4 w-4 accent-[#A78BFA]" /><span className="text-sm leading-relaxed text-text-secondary"><span className="font-bold text-headline">{address.fullName}</span><br />{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}, {address.state} {address.zip}<br /><span className="text-text-muted">Phone: {address.phone || "—"}</span><span className="mt-1 block text-xs font-semibold text-success">Complimentary delivery · {deliveryDate}</span></span></label>)}</div>}
          {!addrFormOpen ? <button type="button" onClick={() => setAddrFormOpen(true)} className="morrow-link mt-4 text-sm">+ Add a new address</button> : <AddressForm form={form} error={addrError} busy={addrBusy} states={STATES} onField={setField} onSubmit={saveAddress} onCancel={() => setAddrFormOpen(false)} />}
        </section>

        <section className="morrow-panel p-5 sm:p-6">
          <StepHeading number={2} title="Payment method" />
          <p className="mt-4 rounded-xl border border-border bg-surface p-3 text-xs leading-relaxed text-text-muted">Demo checkout — no real payment is processed. Full card numbers and CVV are never stored or transmitted; only the brand and last four digits are saved.</p>
          {methods.length > 0 && <div className="mt-4 space-y-2">{methods.map((method) => <label key={method.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${selectedMethodId === method.id ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent"}`}><input type="radio" name="payment" checked={selectedMethodId === method.id} onChange={() => setSelectedMethodId(method.id)} className="mt-1 h-4 w-4 accent-[#A78BFA]" /><span className="text-sm text-text-secondary"><span className="font-bold text-headline">{method.brand}</span> ending in {method.last4} · {method.cardholderName}<br /><span className="text-text-muted">Expires {method.expMonth}/{method.expYear}</span></span></label>)}</div>}
          {!payFormOpen ? <button type="button" onClick={() => setPayFormOpen(true)} className="morrow-link mt-4 text-sm">+ Add a card</button> : <CardForm card={card} error={payError} busy={payBusy} currentYear={currentYear} onChange={setCard} onSubmit={saveCard} onCancel={() => setPayFormOpen(false)} />}
        </section>

        <section className="morrow-panel p-5 sm:p-6">
          <StepHeading number={3} title="Review items and delivery" />
          <ul className="mt-2 divide-y divide-border">{lines.map((line) => <li key={line.variantSku} className="flex gap-3 py-4"><Link href={`/product/${line.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-raised"><Image src={line.image} alt={line.title} width={80} height={80} className="h-full w-full object-contain p-1" /></Link><div className="min-w-0 flex-1"><Link href={`/product/${line.slug}`} className="line-clamp-2 text-sm font-bold text-headline hover:text-accent">{line.title}</Link>{line.label && <p className="mt-1 text-xs text-text-muted">Option: {line.label}</p>}<p className="mt-1 text-xs text-text-secondary">Quantity: {line.qty} · {line.stock <= 0 ? <span className="text-danger">Currently unavailable</span> : <span className="text-success">In stock · Complimentary delivery {deliveryDate}</span>}</p></div><div className="shrink-0 text-right text-sm font-bold text-headline">{formatPrice(line.priceCents * line.qty)}<p className="mt-1 text-xs font-normal text-text-muted">{formatPrice(line.priceCents)} each</p></div></li>)}</ul>
        </section>
      </div>

      <aside className="morrow-panel p-5 lg:sticky lg:top-24">
        <p className="morrow-eyebrow">One last look</p>
        <h2 className="mt-2 font-display text-3xl text-headline">Order summary</h2>
        <dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-text-secondary">Items ({totals.itemsCount})</dt><dd className="font-semibold text-headline">{formatPrice(totals.subtotalCents)}</dd></div><div className="flex justify-between gap-3"><dt className="text-text-secondary">Delivery</dt><dd className="font-semibold text-success">{totals.shippingCents === 0 ? "Complimentary" : formatPrice(totals.shippingCents)}</dd></div><div className="flex justify-between gap-3"><dt className="text-text-secondary">Estimated tax</dt><dd className="font-semibold text-headline">{formatPrice(totals.taxCents)}</dd></div><div className="flex justify-between gap-3 border-t border-border pt-3 text-lg"><dt className="font-bold text-headline">Total</dt><dd className="font-extrabold text-headline">{formatPrice(totals.totalCents)}</dd></div></dl>
        {isGift && <p className="mt-4 rounded-xl border border-accent/25 bg-accent-soft p-3 text-xs leading-relaxed text-text-secondary">This order is marked as a gift. Add the message during confirmation if needed.</p>}
        {orderError && <p className="mt-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{orderError}</p>}
        <button type="button" disabled={!canPlace} onClick={() => void submitOrder()} className="morrow-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50">{placing ? "Placing your order…" : "Place your order"}</button>
        <p className="mt-3 text-center text-xs leading-relaxed text-text-muted">Your order is only placed when you confirm here.</p>
      </aside>
    </div>
  );
}

function AddressForm({ form, error, busy, states, onField, onSubmit, onCancel }: { form: AddressFormValues; error: string | null; busy: boolean; states: string[]; onField: <Key extends keyof AddressFormValues>(key: Key, value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>; onCancel: () => void }) {
  return <form onSubmit={(event) => void onSubmit(event)} className="mt-4 grid gap-3 sm:grid-cols-2"><div><label className="morrow-label" htmlFor="address-name">Full name</label><input id="address-name" value={form.fullName} onChange={(event) => onField("fullName", event.target.value)} required className="morrow-input mt-1" /></div><div><label className="morrow-label" htmlFor="address-line1">Address line 1</label><input id="address-line1" value={form.line1} onChange={(event) => onField("line1", event.target.value)} required className="morrow-input mt-1" /></div><div className="sm:col-span-2"><label className="morrow-label" htmlFor="address-line2">Address line 2 <span className="font-normal text-text-muted">optional</span></label><input id="address-line2" value={form.line2} onChange={(event) => onField("line2", event.target.value)} className="morrow-input mt-1" /></div><div><label className="morrow-label" htmlFor="address-city">City</label><input id="address-city" value={form.city} onChange={(event) => onField("city", event.target.value)} required className="morrow-input mt-1" /></div><div className="grid grid-cols-2 gap-3"><div><label className="morrow-label" htmlFor="address-state">State</label><select id="address-state" value={form.state} onChange={(event) => onField("state", event.target.value)} required className="morrow-input mt-1"><option value="">Select</option>{states.map((state) => <option key={state} value={state}>{state}</option>)}</select></div><div><label className="morrow-label" htmlFor="address-zip">ZIP</label><input id="address-zip" value={form.zip} onChange={(event) => onField("zip", event.target.value)} required inputMode="numeric" className="morrow-input mt-1" /></div></div><div><label className="morrow-label" htmlFor="address-phone">Phone <span className="font-normal text-text-muted">optional</span></label><input id="address-phone" value={form.phone} onChange={(event) => onField("phone", event.target.value)} className="morrow-input mt-1" /></div><div className="flex flex-wrap items-center gap-3 sm:col-span-2">{error && <p className="text-sm text-danger">{error}</p>}<button type="submit" disabled={busy} className="morrow-button px-4 py-2 text-sm">{busy ? "Saving…" : "Use this address"}</button><button type="button" onClick={onCancel} className="morrow-link text-sm">Cancel</button></div></form>;
}

function CardForm({ card, error, busy, currentYear, onChange, onSubmit, onCancel }: { card: CardFormValues; error: string | null; busy: boolean; currentYear: number; onChange: Dispatch<SetStateAction<CardFormValues>>; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>; onCancel: () => void }) {
  return <form onSubmit={(event) => void onSubmit(event)} className="mt-4 grid gap-3 sm:grid-cols-2"><div><label className="morrow-label" htmlFor="card-name">Cardholder name</label><input id="card-name" value={card.cardholderName} onChange={(event) => onChange((previous) => ({ ...previous, cardholderName: event.target.value }))} required className="morrow-input mt-1" /></div><div><label className="morrow-label" htmlFor="card-number">Card number</label><input id="card-number" value={card.cardNumber} onChange={(event) => onChange((previous) => ({ ...previous, cardNumber: event.target.value }))} required inputMode="numeric" placeholder="Demo only" className="morrow-input mt-1" /></div><div><label className="morrow-label" htmlFor="card-exp">Expiration</label><div className="mt-1 grid grid-cols-2 gap-2"><select id="card-exp" value={card.expMonth} onChange={(event) => onChange((previous) => ({ ...previous, expMonth: Number(event.target.value) }))} className="morrow-input">{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}</option>)}</select><select aria-label="Expiration year" value={card.expYear} onChange={(event) => onChange((previous) => ({ ...previous, expYear: Number(event.target.value) }))} className="morrow-input">{Array.from({ length: 11 }, (_, index) => currentYear + index).map((year) => <option key={year} value={year}>{year}</option>)}</select></div></div><div><label className="morrow-label" htmlFor="card-cvv">CVV</label><input id="card-cvv" value={card.cvv} onChange={(event) => onChange((previous) => ({ ...previous, cvv: event.target.value }))} inputMode="numeric" maxLength={4} required placeholder="Demo only" className="morrow-input mt-1" /></div><div className="flex flex-wrap items-center gap-3 sm:col-span-2">{error && <p className="text-sm text-danger">{error}</p>}<button type="submit" disabled={busy || card.cardNumber.replace(/[\s-]/g, "").length < 13} className="morrow-button px-4 py-2 text-sm">{busy ? "Saving…" : "Add card"}</button><button type="button" onClick={onCancel} className="morrow-link text-sm">Cancel</button></div></form>;
}
