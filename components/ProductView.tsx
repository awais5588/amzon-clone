"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatPrice, deliveryPromises, type DeliveryPromise } from "@/lib/format";
import { addToCart, getCartState } from "@/app/_actions/cart";
import { setCartSummary, subscribeCartSummary } from "@/lib/cart-client";

export interface ProductVariantView {
  label: string;
  sku: string;
  priceCents: number;
  listPriceCents?: number;
  stock: number;
  images: string[];
}

export interface ProductViewData {
  productId: string;
  slug: string;
  title: string;
  brand: string;
  isAmazonBrand: boolean;
  description: string;
  bullets: string[];
  images: string[];
  ratingAvg: number;
  ratingCount: number;
  boughtInPastMonth: number;
  bestsellerRank?: string;
  primeEligible: boolean;
  freeReturns: boolean;
  carbonImpact: string;
  seller: string;
  variants: ProductVariantView[];
}

export function ProductView({
  product,
  initialQtyBySku,
  deliveryDate,
}: {
  product: ProductViewData;
  initialQtyBySku: Record<string, number>;
  deliveryDate?: DeliveryPromise;
}) {
  const router = useRouter();
  const [sku, setSku] = useState(product.variants[0]?.sku ?? "");
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [pending, setPending] = useState<null | "add" | "buy">(null);
  const [feedback, setFeedback] = useState<"added" | "error" | null>(null);
  const [inCart, setInCart] = useState(initialQtyBySku[product.variants[0]?.sku ?? ""] ?? 0);
  const [promise] = useState<DeliveryPromise>(() => deliveryDate ?? deliveryPromises());

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeCartSummary((state) => {
      if (!active) return;
      const item = state.items?.find((line) => line.variantSku === sku);
      setInCart(item?.qty ?? 0);
    });
    void getCartState().then((state) => {
      if (!active) return;
      const item = state.items.find((line) => line.variantSku === sku);
      setInCart(item?.qty ?? 0);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [sku]);

  const variant = useMemo(() => product.variants.find((item) => item.sku === sku) ?? product.variants[0], [product.variants, sku]);
  const images = useMemo(() => {
    const list = variant?.images?.length ? variant.images : product.images;
    return list.length ? list : ["/images/placeholder.png"];
  }, [variant, product.images]);

  const selectVariant = useCallback((nextSku: string) => {
    setSku(nextSku);
    setImageIndex(0);
    setQty(1);
    setFeedback(null);
  }, []);

  const run = useCallback(async (mode: "add" | "buy") => {
    if (!variant) return;
    setPending(mode);
    setFeedback(null);
    try {
      const result = await addToCart({ productId: product.productId, variantSku: variant.sku, qty });
      setCartSummary(result);
      setFeedback("added");
      if (mode === "buy") router.push("/cart");
    } catch {
      setFeedback("error");
    } finally {
      setPending(null);
    }
  }, [product.productId, variant, qty, router]);

  const outOfStock = !variant || variant.stock <= 0;
  const maxQty = variant ? Math.max(1, Math.min(variant.stock, 10)) : 1;
  const hasDiscount = Boolean(variant?.listPriceCents && variant.listPriceCents > variant.priceCents);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:gap-10">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-[0_18px_46px_rgba(0,0,0,0.24)] sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(167,139,250,0.12),transparent_52%)]" />
          <Image
            src={images[imageIndex]}
            alt={product.title}
            fill
            className="relative object-contain p-6"
            sizes="(min-width:1024px) 55vw, 92vw"
            priority
          />
          {product.bestsellerRank && <span className="absolute left-5 top-5 rounded-full border border-accent/30 bg-surface-raised/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent backdrop-blur">{product.bestsellerRank}</span>}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2" role="list" aria-label="Product images">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setImageIndex(index)}
                aria-label={`View image ${index + 1}`}
                aria-pressed={index === imageIndex}
                className={`h-16 w-16 overflow-hidden rounded-xl border bg-surface-raised p-1 transition-colors ${index === imageIndex ? "border-accent ring-1 ring-accent" : "border-border hover:border-accent"}`}
              >
                <Image src={image} alt="" width={64} height={64} className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-[0_18px_46px_rgba(0,0,0,0.18)] sm:p-7">
        {product.bestsellerRank && <p className="morrow-eyebrow">A Morrow favorite</p>}
        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          <span className="text-4xl font-extrabold tracking-[-0.055em] text-headline">{formatPrice(variant?.priceCents ?? 0)}</span>
          {hasDiscount && <del className="text-sm text-text-muted">{formatPrice(variant!.listPriceCents!)}</del>}
        </div>
        {hasDiscount && <p className="mt-1 text-sm font-semibold text-success">Save {formatPrice(variant!.listPriceCents! - variant!.priceCents)}</p>}

        <div className="mt-5 space-y-2 border-y border-border py-4 text-sm">
          {product.freeReturns && <p className="text-text-secondary"><span className="font-bold text-headline">Free returns</span> · Returnable within 30 days</p>}
          {product.primeEligible && <p className="flex items-center gap-1.5 text-text-secondary"><span className="font-bold text-headline">Carbon impact</span> {product.carbonImpact}</p>}
          <p className="text-text-secondary"><span className="font-bold text-headline">Delivery</span> {promise.members}</p>
          <p className="text-text-muted">{promise.nonMembers}</p>
        </div>

        <p className="mt-4 text-xs text-text-muted">Ships from the Morrow catalog network</p>

        <p className={`mt-4 text-sm font-bold ${outOfStock ? "text-danger" : "text-success"}`}>
          {outOfStock ? "Currently unavailable" : "In stock · Ready to ship"}
          {!outOfStock && variant && variant.stock <= 10 && <span className="ml-1 font-medium text-danger">Only {variant.stock} left.</span>}
        </p>

        {product.variants.length > 1 && (
          <fieldset className="mt-5">
            <legend className="text-sm font-bold text-headline">Choose an option</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.variants.map((item) => {
                const active = item.sku === variant?.sku;
                return (
                  <button key={item.sku} type="button" onClick={() => selectVariant(item.sku)} aria-pressed={active} className={`min-w-24 rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,transform] hover:-translate-y-0.5 ${active ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-border bg-surface-raised hover:border-accent"} ${item.stock <= 0 ? "opacity-50" : ""}`}>
                    <span className="block text-sm font-semibold text-headline">{item.label}</span>
                    <span className="mt-1 block text-xs text-text-secondary">{formatPrice(item.priceCents)}</span>
                    {item.stock <= 0 && <span className="mt-1 block text-[11px] text-danger">Unavailable</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {!outOfStock && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label htmlFor="buy-qty" className="text-sm font-semibold text-headline">Quantity</label>
            <select id="buy-qty" value={qty} onChange={(event) => setQty(Number(event.target.value))} className="morrow-input w-24 py-2 text-sm">
              {Array.from({ length: maxQty }, (_, index) => index + 1).map((number) => <option key={number} value={number}>{number}</option>)}
            </select>
            {inCart > 0 && <span className="text-sm text-success">{inCart} already in your bag</span>}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button type="button" disabled={outOfStock || pending !== null} onClick={() => void run("add")} className="morrow-button w-full disabled:cursor-not-allowed disabled:opacity-50">{pending === "add" ? "Adding…" : "Add to bag"}</button>
          <button type="button" disabled={outOfStock || pending !== null} onClick={() => void run("buy")} className="morrow-button-secondary w-full disabled:cursor-not-allowed disabled:opacity-50">{pending === "buy" ? "Opening bag…" : "Buy now"}</button>
          {feedback === "added" && <p className="text-sm font-semibold text-success">Added to your bag.</p>}
          {feedback === "error" && <p className="text-sm font-semibold text-danger">Something went wrong. Please try again.</p>}
        </div>
      </div>
    </div>
  );
}
