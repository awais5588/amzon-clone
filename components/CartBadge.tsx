"use client";

import { useEffect, useState } from "react";
import { getCartSummaryState, subscribeCartSummary } from "@/lib/cart-client";
import { getCartState } from "@/app/_actions/cart";

export function CartBadge() {
  const [totalQty, setTotalQty] = useState<number>(() => getCartSummaryState().totalQty);

  useEffect(() => {
    let active = true;
    const unsub = subscribeCartSummary((s) => {
      if (active) setTotalQty(s.totalQty);
    });
    void getCartState().then((s) => {
      if (!active) return;
      setTotalQty(s.totalQty);
      if (getCartSummaryState().totalQty !== s.totalQty) {
        import("@/lib/cart-client").then((m) => m.setCartSummary(s));
      }
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  if (totalQty === 0) return null;

  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-extrabold text-accent-ink shadow-[0_0_0_3px_var(--surface)]">
      {totalQty}
    </span>
  );
}
