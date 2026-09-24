export interface CartLineState {
  variantSku: string;
  qty: number;
  priceCents: number;
  productId: string;
  title: string;
  image: string;
}

export interface CartSummaryState {
  totalQty: number;
  subtotalCents: number;
  qualifiesForFreeDelivery: boolean;
  items?: CartLineState[];
}
let current: CartSummaryState = {
  totalQty: 0,
  subtotalCents: 0,
  qualifiesForFreeDelivery: false,
  items: [],
};
const listeners = new Set<(s: CartSummaryState) => void>();

export function getCartSummaryState(): CartSummaryState {
  return current;
}

export function setCartSummary(s: CartSummaryState): void {
  current = { ...s, items: s.items ?? current.items };
  for (const l of listeners) l(current);
}

export function subscribeCartSummary(fn: (s: CartSummaryState) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}