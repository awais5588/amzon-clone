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
      if (active) {
        setTotalQty(s.totalQty);
        if (getCartSummaryState().totalQty !== s.totalQty) {
          import("@/lib/cart-client").then((m) => m.setCartSummary(s));
        }
      }
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  return (
    <span className="absolute -top-1 left-2.5 text-orange-400 text-xs font-bold">
      {totalQty}
    </span>
  );
}