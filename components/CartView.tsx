"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { setCartSummary, subscribeCartSummary, type CartLineState, type CartSummaryState } from "@/lib/cart-client";
import { moveToCart, removeSaved, saveForLater, setCartGift, setCartItemQty } from "@/app/_actions/cart";

export interface SkuInfo {
  label: string;
  stock: number;
  slug: string;
}

export function CartView({
  skuInfo,
  initialItems,
  deliveryDate,
}: {
  skuInfo: Record<string, SkuInfo>;
  initialItems: CartSummaryState;
  deliveryDate: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<CartSummaryState>(initialItems);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [pendingSku, setPendingSku] = useState<string | null>(null);
  const [savingGift, setSavingGift] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeCartSummary((next) => setState(next));
    void import("@/app/_actions/cart")
      .then((module) =>
        module.getCartState().then((next) => {
          setCartSummary(next);
          setState(next);
        })
      )
      .catch(() => setActionError("We couldn't load your bag. Please try again."));
    return unsubscribe;
  }, []);

  const lines = useMemo(() => state.items ?? [], [state.items]);
  const saved = useMemo(() => state.saved ?? [], [state.saved]);
  const isSelected = useCallback((sku: string) => selected[sku] !== false, [selected]);
  const toggle = useCallback((sku: string) => setSelected((previous) => ({ ...previous, [sku]: previous[sku] === false })), []);
  const selectedLines = useMemo(() => lines.filter((line) => isSelected(line.variantSku)), [lines, isSelected]);
  const selectedCount = selectedLines.reduce((sum, line) => sum + line.qty, 0);
  const selectedSubtotal = selectedLines.reduce((sum, line) => sum + line.qty * line.priceCents, 0);
  const allSelected = lines.length > 0 && lines.every((line) => isSelected(line.variantSku));
  const toggleAll = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const line of lines) next[line.variantSku] = !allSelected;
    setSelected(next);
  }, [lines, allSelected]);

  const run = useCallback(async (sku: string, action: () => Promise<CartSummaryState>) => {
    setPendingSku(sku);
    setActionError(null);
    try {
      const result = await action();
      setCartSummary(result);
      setState(result);
      setSelected((previous) => ({ ...previous, [sku]: result.items?.some((item) => item.variantSku === sku) ?? false }));
    } catch {
      setActionError("We couldn't update your bag. Please try again.");
    } finally {
      setPendingSku(null);
    }
  }, []);

  const changeQty = useCallback((productId: string, sku: string, qty: number) => run(sku, () => setCartItemQty({ productId, variantSku: sku, qty })), [run]);
  const remove = useCallback((productId: string, sku: string) => run(sku, () => setCartItemQty({ productId, variantSku: sku, qty: 0 })), [run]);
  const doSaveForLater = useCallback((line: CartLineState) => run(line.variantSku, () => saveForLater(line.variantSku)), [run]);
  const doMoveToCart = useCallback((line: CartLineState) => run(line.variantSku, () => moveToCart(line.variantSku)), [run]);
  const doRemoveSaved = useCallback((line: CartLineState) => run(line.variantSku, () => removeSaved(line.variantSku)), [run]);
  const doToggleGift = useCallback(async () => {
    setSavingGift(true);
    setActionError(null);
    try {
      const result = await setCartGift(!(state.isGift ?? false));
      setCartSummary(result);
      setState(result);
    } catch {
      setActionError("We couldn't update your gift preference. Please try again.");
    } finally {
      setSavingGift(false);
    }
  }, [state.isGift]);

  const checkout = useCallback(() => {
    if (selectedCount === 0) return;
    const all = selectedLines.length === lines.length && lines.length > 0;
    if (all || lines.length === 0) {
      router.push("/checkout");
      return;
    }
    const skus = selectedLines.map((line) => line.variantSku).sort();
    router.push(`/checkout?items=${encodeURIComponent(skus.join(","))}`);
  }, [router, selectedCount, selectedLines, lines.length]);

  if (lines.length === 0 && saved.length === 0) {
    return (
      <section className="morrow-panel p-8 text-center sm:p-14">
        <p className="morrow-eyebrow">A blank canvas</p>
        <h1 className="mt-3 font-display text-4xl text-headline">Your bag is waiting.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-secondary">Find something worth keeping, or come back when you&apos;re ready to browse.</p>
        <Link href="/search" className="morrow-button mt-7">Explore the catalog <span aria-hidden="true">↗</span></Link>
      </section>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="morrow-panel p-4 sm:p-6">
        {actionError && <p role="alert" className="mb-5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{actionError}</p>}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
          <div>
            <p className="morrow-eyebrow">Selected for you</p>
            <h2 className="mt-2 font-display text-3xl text-headline">Your bag</h2>
            {lines.length > 0 && <button type="button" onClick={toggleAll} className="morrow-link mt-2 text-sm">{allSelected ? "Deselect all" : "Select all"}</button>}
          </div>
          <span className="text-sm text-text-muted">{lines.length} {lines.length === 1 ? "selection" : "selections"}</span>
        </div>

        {lines.length === 0 ? (
          <p className="py-8 text-sm text-text-secondary">No items in your bag. Your saved items are below.</p>
        ) : (
          <ul className="divide-y divide-border">
            {lines.map((line) => {
              const info = skuInfo[line.variantSku];
              const stock = info?.stock ?? 0;
              const out = stock <= 0;
              const busy = pendingSku === line.variantSku;
              const maxOption = Math.max(10, stock, line.qty);
              return (
                <li key={line.variantSku} className="flex gap-3 py-5 sm:gap-5">
                  <input type="checkbox" checked={isSelected(line.variantSku)} onChange={() => toggle(line.variantSku)} aria-label={`Select ${line.title}`} className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#A78BFA]" />
                  <Link href={info?.slug ? `/product/${info.slug}` : "#"} className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-raised sm:h-36 sm:w-36">
                    <Image src={line.image || "/images/placeholder.png"} alt={line.title} width={144} height={144} className="h-full w-full object-contain p-2" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={info?.slug ? `/product/${info.slug}` : "#"} className="line-clamp-2 text-sm font-bold leading-snug text-headline transition-colors hover:text-accent sm:text-base">{line.title}</Link>
                    <p className={`mt-1.5 text-xs font-bold ${out ? "text-danger" : "text-success"}`}>{out ? "Currently unavailable" : stock <= 10 ? `In stock · Only ${stock} left` : "In stock · Ready to ship"}</p>
                    <p className="mt-1 text-xs text-text-secondary">Delivery estimate: {deliveryDate}</p>
                    {info?.label && <p className="mt-1 text-xs text-text-muted">Option: {info.label}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      <button type="button" disabled={busy} onClick={() => void remove(line.productId, line.variantSku)} className="morrow-link disabled:opacity-50">Remove</button>
                      <span className="text-border-strong">·</span>
                      <button type="button" disabled={busy} onClick={() => void doSaveForLater(line)} className="morrow-link disabled:opacity-50">Save for later</button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-lg font-extrabold tracking-[-0.04em] text-headline">{formatPrice(line.priceCents * line.qty)}</p>
                      {!out && <label className="flex items-center gap-2 text-xs text-text-secondary"><span>Quantity</span><select value={line.qty} disabled={busy} onChange={(event) => void changeQty(line.productId, line.variantSku, Number(event.target.value))} className="morrow-input w-20 py-1.5 text-xs">{Array.from({ length: maxOption }, (_, index) => index + 1).map((number) => <option key={number} value={number}>{number}</option>)}</select></label>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {saved.length > 0 && (
          <div className="mt-4 border-t border-border pt-6">
            <div className="flex items-center justify-between gap-3"><h3 className="font-display text-2xl text-headline">Saved for later</h3><span className="text-xs text-text-muted">{saved.length} saved</span></div>
            <ul className="mt-4 divide-y divide-border">
              {saved.map((line) => {
                const info = skuInfo[line.variantSku];
                const busy = pendingSku === line.variantSku;
                return (
                  <li key={line.variantSku} className="flex gap-3 py-4">
                    <Link href={info?.slug ? `/product/${info.slug}` : "#"} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-raised"><Image src={line.image || "/images/placeholder.png"} alt={line.title} width={80} height={80} className="h-full w-full object-contain p-1" /></Link>
                    <div className="min-w-0 flex-1"><Link href={info?.slug ? `/product/${info.slug}` : "#"} className="line-clamp-2 text-sm font-semibold text-headline hover:text-accent">{line.title}</Link><p className="mt-1 text-sm font-bold text-headline">{formatPrice(line.priceCents)}</p><div className="mt-2 flex items-center gap-3 text-xs"><button type="button" disabled={busy || (info?.stock ?? 0) <= 0} onClick={() => void doMoveToCart(line)} className="morrow-link disabled:cursor-not-allowed disabled:opacity-50">{info && info.stock <= 0 ? "Unavailable" : "Move to bag"}</button><span className="text-border-strong">·</span><button type="button" disabled={busy} onClick={() => void doRemoveSaved(line)} className="morrow-link disabled:opacity-50">Remove</button></div></div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {lines.length > 0 && (
        <aside className="morrow-panel p-5 lg:sticky lg:top-24">
          <p className="morrow-eyebrow">Ready when you are</p>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">{state.qualifiesForFreeDelivery ? "Your order qualifies for complimentary delivery." : "Delivery options are chosen at checkout."}</p>
          <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-border pt-5"><span className="text-sm text-text-secondary">Subtotal ({selectedCount} {selectedCount === 1 ? "item" : "items"})</span><span className="text-2xl font-extrabold tracking-[-0.05em] text-headline">{formatPrice(selectedSubtotal)}</span></div>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={state.isGift ?? false} disabled={savingGift || selectedCount === 0} onChange={() => void doToggleGift()} className="h-4 w-4 accent-[#A78BFA]" />This order contains a gift</label>
          {state.isGift && <p className="mt-2 text-xs leading-relaxed text-text-muted">Gift options and a message can be added at checkout.</p>}
          <button type="button" disabled={selectedCount === 0} onClick={checkout} className="morrow-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50">Proceed to checkout <span aria-hidden="true">→</span></button>
          <p className="mt-3 text-center text-xs text-text-muted">No payment is taken until you place the order.</p>
        </aside>
      )}
    </div>
  );
}
