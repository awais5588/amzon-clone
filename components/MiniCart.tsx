"use client";

import { useEffect, useState } from "react";
import {
  getCartSummaryState,
  subscribeCartSummary,
  type CartSummaryState,
} from "@/lib/cart-client";
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

  if (summary.totalQty === 0) {
    return <div className="hidden" />;
  }

  return (
    <aside className="bg-card rounded-sm shadow-md border border-border p-4 w-64">
      <p className="text-xs text-muted mb-0.5">Subtotal</p>
      <p className="text-2xl font-semibold text-headline mb-2">{formatPrice(summary.subtotalCents)}</p>
      <p className="text-[13px] text-muted leading-snug">
        Your order qualifies for <span className="text-headline font-semibold">FREE delivery</span>.
        Choose this option <span className="font-semibold">at checkout.</span>
      </p>
      <a
        href="/cart"
        className="block text-center bg-cta hover:bg-[#e6c200] border border-cta-border text-headline rounded-[6px] px-3 py-2 text-[13px] font-medium shadow-sm mt-3"
      >
        Go to Cart
      </a>
    </aside>
  );
}