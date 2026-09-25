"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCartSummaryState, subscribeCartSummary, type CartSummaryState } from "@/lib/cart-client";
import { getCartState } from "@/app/_actions/cart";
import { formatPrice } from "@/lib/format";

export function MiniCart() {
  const [summary, setSummary] = useState<CartSummaryState>(getCartSummaryState);

  useEffect(() => {
    let active = true;
    const unsub = subscribeCartSummary((s) => {
      if (active) setSummary(s);
    });
    void getCartState().then((s) => {
      if (active) setSummary(s);
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  if (summary.totalQty === 0) return null;

  return (
    <aside className="sticky top-24 w-64 rounded-2xl border border-border bg-surface-raised p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <p className="morrow-eyebrow">Your bag</p>
      <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-headline">{formatPrice(summary.subtotalCents)}</p>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        Your order qualifies for complimentary delivery. Choose the option at checkout.
      </p>
      <Link href="/cart" className="morrow-button mt-5 w-full">
        Review bag
        <span aria-hidden="true">→</span>
      </Link>
    </aside>
  );
}
