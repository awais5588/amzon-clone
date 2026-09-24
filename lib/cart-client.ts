export interface CartSummaryState {
  totalQty: number;
  subtotalCents: number;
  qualifiesForFreeDelivery: boolean;
}

let current: CartSummaryState = { totalQty: 0, subtotalCents: 0, qualifiesForFreeDelivery: false };
const listeners = new Set<(s: CartSummaryState) => void>();

export function getCartSummaryState(): CartSummaryState {
  return current;
}

export function setCartSummary(s: CartSummaryState): void {
  current = s;
  for (const l of listeners) l(s);
}

export function subscribeCartSummary(fn: (s: CartSummaryState) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}