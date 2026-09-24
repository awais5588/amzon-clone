"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import {
  setCartSummary,
  subscribeCartSummary,
  type CartLineState,
  type CartSummaryState,
} from "@/lib/cart-client";
import {
  moveToCart,
  removeSaved,
  saveForLater,
  setCartGift,
  setCartItemQty,
} from "@/app/_actions/cart";

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

  useEffect(() => {
    const unsub = subscribeCartSummary((s) => setState(s));
    void import("@/app/_actions/cart").then((m) =>
      m.getCartState().then((s) => {
        setCartSummary(s);
        setState(s);
      })
    );
    return unsub;
  }, []);

  const lines = useMemo(() => state.items ?? [], [state.items]);
  const saved = useMemo(() => state.saved ?? [], [state.saved]);

  const isSelected = useCallback((sku: string) => selected[sku] !== false, [selected]);

  const toggle = useCallback((sku: string) => {
    setSelected((prev) => ({ ...prev, [sku]: prev[sku] === false }));
  }, []);

  const selectedLines = useMemo(
    () => lines.filter((l) => isSelected(l.variantSku)),
    [lines, isSelected]
  );
  const selectedCount = selectedLines.reduce((n, l) => n + l.qty, 0);
  const selectedSubtotal = selectedLines.reduce((n, l) => n + l.qty * l.priceCents, 0);
  const allSelected = lines.length > 0 && lines.every((l) => isSelected(l.variantSku));

  const toggleAll = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const l of lines) next[l.variantSku] = !allSelected;
    setSelected(next);
  }, [lines, allSelected]);

  const run = useCallback(
    async (sku: string, fn: () => Promise<CartSummaryState>) => {
      setPendingSku(sku);
      try {
        const res = await fn();
        setCartSummary(res);
        setState(res);
        setSelected((prev) => {
          const next = { ...prev };
          next[sku] = res.items?.some((i) => i.variantSku === sku) ?? false;
          return next;
        });
      } catch {
        // Swallow: the pending flag resets and quantities are left unchanged.
      } finally {
        setPendingSku(null);
      }
    },
    []
  );

  const changeQty = useCallback(
    (productId: string, sku: string, qty: number) =>
      run(sku, () => setCartItemQty({ productId, variantSku: sku, qty })),
    [run]
  );

  const remove = useCallback(
    (productId: string, sku: string) =>
      run(sku, () => setCartItemQty({ productId, variantSku: sku, qty: 0 })),
    [run]
  );

  const doSaveForLater = useCallback(
    (line: CartLineState) => run(line.variantSku, () => saveForLater(line.variantSku)),
    [run]
  );

  const doMoveToCart = useCallback(
    (line: CartLineState) => run(line.variantSku, () => moveToCart(line.variantSku)),
    [run]
  );

  const doRemoveSaved = useCallback(
    (line: CartLineState) => run(line.variantSku, () => removeSaved(line.variantSku)),
    [run]
  );

  const doToggleGift = useCallback(async () => {
    setSavingGift(true);
    try {
      const res = await setCartGift(!(state.isGift ?? false));
      setCartSummary(res);
      setState(res);
    } finally {
      setSavingGift(false);
    }
  }, [state.isGift]);

  const checkout = useCallback(() => {
    if (selectedCount === 0) return;
    const full = selectedLines.length === lines.length && lines.length > 0;
    if (full || lines.length === 0) {
      router.push("/checkout");
      return;
    }
    const skus = selectedLines.map((l) => l.variantSku).sort();
    router.push(`/checkout?items=${encodeURIComponent(skus.join(","))}`);
  }, [router, selectedCount, selectedLines, lines]);

  if (lines.length === 0 && saved.length === 0) {
    return (
      <div className="bg-card rounded-sm shadow-sm p-8 text-center">
        <h1 className="text-2xl font-medium text-headline">Your Amazon Cart is empty</h1>
        <p className="text-sm text-muted mt-2">
          Your shopping cart is waiting. Give it purpose — fill it with deals.
        </p>
        <Link
          href="/"
          className="inline-block mt-4 bg-cta hover:bg-[#e6c200] border border-cta-border text-headline rounded-[8px] px-5 py-2 text-sm font-medium shadow-sm"
        >
          Shop today&apos;s deals
        </Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
      {/* Left: cart lines */}
      <div className="bg-card rounded-sm shadow-sm p-4">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-2">
          <div>
            <h1 className="text-2xl font-medium text-headline">Shopping Cart</h1>
            {lines.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-[13px] text-link hover:text-link-hover hover:underline"
              >
                {allSelected ? "Deselect all items" : "Select all items"}
              </button>
            )}
          </div>
          <span className="text-[13px] text-muted sm:w-24 sm:text-right">Price</span>
        </div>

        {lines.length === 0 ? (
          <p className="text-sm text-muted py-6">No items in your cart.</p>
        ) : (
          <ul className="divide-y divide-border">
            {lines.map((line) => {
              const info = skuInfo[line.variantSku];
              const stock = info?.stock ?? 0;
              const out = stock <= 0;
              const busy = pendingSku === line.variantSku;
              const maxOption = Math.max(10, stock, line.qty);
              return (
                <li key={line.variantSku} className="py-4 flex flex-col sm:flex-row sm:gap-3">
                  <div className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected(line.variantSku)}
                      onChange={() => toggle(line.variantSku)}
                      aria-label={`Select ${line.title}`}
                      className="mt-1 w-4 h-4 accent-[#007185] cursor-pointer shrink-0"
                    />

                    <a
                      href={info?.slug ? `/product/${info.slug}` : "#"}
                      className="shrink-0 w-28 h-28 bg-[#f7fafa] rounded-sm overflow-hidden"
                    >
                      <Image src={line.image} alt={line.title} width={112} height={112} className="w-full h-full object-cover" />
                    </a>
                  </div>

                  <div className="flex-1 min-w-0 sm:mt-0 mt-3">
                    <a
                      href={info?.slug ? `/product/${info.slug}` : "#"}
                      className="text-[15px] leading-snug text-link hover:text-link-hover hover:underline line-clamp-2"
                    >
                      {line.title}
                    </a>

                    {out ? (
                      <p className="text-[13px] text-[#b12704] font-medium mt-1">Currently unavailable</p>
                    ) : (
                      <p className="text-[13px] text-[#007600] font-medium mt-1">
                        In Stock
                        {stock <= 10 && (
                          <span className="text-[#b12704] font-normal"> — only {stock} left</span>
                        )}
                      </p>
                    )}

                    <p className="text-[13px] text-muted mt-0.5">
                      <span className="font-semibold text-headline">FREE delivery</span>{" "}
                      {deliveryDate} available at checkout
                    </p>
                    <p className="text-[13px] text-muted">FREE Returns</p>
                    {!out && (
                      <p className="text-[13px] text-muted mt-0.5">
                        <span className="text-link hover:underline cursor-pointer">This is a gift</span>
                        <span className="text-faint"> — Learn more</span>
                      </p>
                    )}

                    {info?.label && (
                      <p className="text-[13px] text-muted mt-0.5">
                        <span className="text-faint">Configuration:</span> {info.label}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(line.productId, line.variantSku)}
                        className="text-link hover:text-link-hover hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                      <span className="text-border">|</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void doSaveForLater(line)}
                        className="text-link hover:text-link-hover hover:underline disabled:opacity-50"
                      >
                        Save for later
                      </button>
                      <span className="text-border">|</span>
                      <span className="text-link cursor-default">Compare with similar items</span>
                      <span className="text-border">|</span>
                      <span className="text-link cursor-default">Share</span>
                    </div>

                    <div className="sm:hidden mt-2 flex items-center justify-between">
                      <p className="text-[15px] font-semibold text-headline">
                        {formatPrice(line.priceCents * line.qty)}
                      </p>
                      {!out && (
                        <select
                          value={line.qty}
                          disabled={busy}
                          onChange={(e) => void changeQty(line.productId, line.variantSku, Number(e.target.value))}
                          className="border border-border rounded-sm px-1.5 py-1 text-[13px] cursor-pointer bg-[#f0f2f2] hover:bg-[#e3e6e6]"
                          aria-label={`Quantity for ${line.title}`}
                        >
                          {Array.from({ length: maxOption }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              Qty: {n}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:block w-24 shrink-0 text-right">
                    <p className="text-lg font-semibold text-headline">
                      {formatPrice(line.priceCents * line.qty)}
                    </p>
                    {!out && (
                      <label className="inline-flex items-center gap-1 mt-2 text-[13px]">
                        <span className="sr-only">Quantity for {line.title}</span>
                        <select
                          value={line.qty}
                          disabled={busy}
                          onChange={(e) => void changeQty(line.productId, line.variantSku, Number(e.target.value))}
                          className="border border-border rounded-sm px-1.5 py-1 text-[13px] cursor-pointer bg-[#f0f2f2] hover:bg-[#e3e6e6]"
                        >
                          {Array.from({ length: maxOption }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              Qty: {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Save for later */}
        {saved.length > 0 && (
          <div className="border-t border-border mt-4 pt-4">
            <h2 className="text-lg font-medium text-headline mb-3">Save for later</h2>
            <ul className="divide-y divide-border">
              {saved.map((line) => {
                const info = skuInfo[line.variantSku];
                const busy = pendingSku === line.variantSku;
                return (
                  <li key={line.variantSku} className="py-3 flex flex-col sm:flex-row sm:gap-3">
                    <a
                      href={info?.slug ? `/product/${info.slug}` : "#"}
                      className="shrink-0 w-20 h-20 bg-[#f7fafa] rounded-sm overflow-hidden"
                    >
                      <Image src={line.image} alt={line.title} width={80} height={80} className="w-full h-full object-cover" />
                    </a>
                    <div className="flex-1 min-w-0 sm:mt-0 mt-2">
                      <p className="text-[14px] leading-snug text-link line-clamp-2">{line.title}</p>
                      <p className="text-[15px] font-semibold text-headline mt-1">
                        {formatPrice(line.priceCents)}
                        <span className="ml-2 text-[13px] font-normal text-muted">FREE delivery</span>
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-[13px]">
                        <button
                          type="button"
                          disabled={busy || (info?.stock ?? 0) <= 0}
                          onClick={() => void doMoveToCart(line)}
                          className="text-link hover:text-link-hover hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {info && info.stock <= 0 ? "Currently unavailable" : "Move to cart"}
                        </button>
                        <span className="text-border">|</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void doRemoveSaved(line)}
                          className="text-link hover:text-link-hover hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Right: summary rail */}
      {lines.length > 0 && (
        <aside className="bg-card rounded-sm shadow-sm p-4 lg:sticky lg:top-3">
          <p className="text-[13px] leading-snug">
            <span className="text-[#007600] font-semibold">Your order qualifies for FREE delivery.</span>{" "}
            <span className="text-muted">Choose this option at checkout.</span>
          </p>

          <p className="text-lg font-medium text-headline mt-3">
            Subtotal ({selectedCount} {selectedCount === 1 ? "item" : "items"}):{" "}
            <span className="font-semibold">{formatPrice(selectedSubtotal)}</span>
          </p>

          <label className="flex items-center gap-2 mt-2 text-[13px] cursor-pointer">
            <input
              type="checkbox"
              checked={state.isGift ?? false}
              disabled={savingGift || selectedCount === 0}
              onChange={() => void doToggleGift()}
              className="w-4 h-4 accent-[#007185]"
            />
            This order contains a gift
          </label>
          {state.isGift && (
            <p className="text-[12px] text-muted mt-1">
              Gift options and a gift message can be added at checkout.
            </p>
          )}

          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={checkout}
            className="w-full mt-3 bg-cta hover:bg-[#e6c200] border border-cta-border text-headline rounded-[8px] px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Proceed to checkout
          </button>

          {/* Prime upsell */}
          <div className="mt-4 border border-border rounded-sm p-3">
            <p className="text-[13px] flex items-center gap-1.5 font-semibold text-headline">
              <span className="text-link">prime</span>
            </p>
            <p className="text-[13px] text-muted mt-1 leading-snug">
              Fast, FREE delivery on eligible items with a 30-day trial for $0
            </p>
            <button
              type="button"
              className="mt-2 w-full border border-border rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-headline hover:bg-row-hover"
            >
              Accept your free trial
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}