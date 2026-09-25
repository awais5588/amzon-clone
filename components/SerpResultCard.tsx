"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Stars } from "./Stars";
import { formatPrice, formatThousands, formatRating, deliveryPromises } from "@/lib/format";
import { addToCart, getCartState, setCartItemQty } from "@/app/_actions/cart";
import { setCartSummary } from "@/lib/cart-client";

export interface SerpResultCardProps {
  productId: string;
  slug: string;
  title: string;
  isAmazonBrand: boolean;
  ratingAvg: number;
  ratingCount: number;
  boughtInPastMonth: number;
  priceCents: number;
  listPriceCents?: number;
  image: string;
  variantSku: string;
  stock: number;
  carbonImpact?: string;
  initialQty: number;
  deliveryDate?: { members: string; nonMembers: string };
}

export function SerpResultCard({
  productId,
  slug,
  title,
  isAmazonBrand,
  ratingAvg,
  ratingCount,
  boughtInPastMonth,
  priceCents,
  listPriceCents,
  image,
  variantSku,
  stock,
  carbonImpact = "Low",
  initialQty,
  deliveryDate,
}: SerpResultCardProps) {
  const [qty, setQty] = useState(initialQty);
  const [pending, setPending] = useState(false);
  const [promise] = useState<{ members: string; nonMembers: string }>(() => deliveryDate ?? deliveryPromises());
  const outOfStock = stock <= 0;
  const hasDiscount = Boolean(listPriceCents && listPriceCents > priceCents);

  const run = useCallback(async (fn: () => Promise<{ totalQty: number; subtotalCents: number; qualifiesForFreeDelivery: boolean }>) => {
    setPending(true);
    try {
      const res = await fn();
      setCartSummary(res);
    } finally {
      setPending(false);
    }
  }, []);

  const handleAdd = useCallback(
    () => run(() => addToCart({ productId, variantSku }).then((s) => {
      const item = s.items.find((i) => i.variantSku === variantSku);
      setQty(item?.qty ?? 1);
      return s;
    })),
    [run, productId, variantSku]
  );

  const handleStep = useCallback(
    (delta: number) => run(() => setCartItemQty({ productId, variantSku, qty: qty + delta }).then((s) => {
      const item = s.items.find((i) => i.variantSku === variantSku);
      setQty(item?.qty ?? 0);
      return s;
    })),
    [run, productId, variantSku, qty]
  );

  useEffect(() => {
    let active = true;
    void getCartState().then((s) => {
      if (!active) return;
      const item = s.items.find((i) => i.variantSku === variantSku);
      setQty(item?.qty ?? initialQty);
    });
    return () => {
      active = false;
    };
  }, [initialQty, variantSku]);

  const canIncrease = !outOfStock && qty < stock;

  return (
    <article className="group flex gap-4 rounded-2xl border border-border bg-surface p-3 shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/70 hover:shadow-[0_18px_38px_rgba(0,0,0,0.24)] sm:gap-5 sm:p-4">
      <Link href={`/product/${slug}`} className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-raised sm:w-48">
        <Image
          src={image || "/images/placeholder.png"}
          alt={title}
          width={300}
          height={300}
          className="h-full w-full object-contain p-3 transition-transform duration-200 group-hover:scale-[1.025]"
          sizes="(min-width:640px) 192px, 112px"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        {isAmazonBrand && (
          <p className="morrow-eyebrow mt-0.5 w-fit rounded-md border border-accent/25 bg-accent-soft px-2 py-1 text-[9px]">Morrow select</p>
        )}

        <h2 className="mt-1.5 line-clamp-2 text-base font-bold leading-snug text-headline transition-colors group-hover:text-accent sm:text-lg">
          <Link href={`/product/${slug}`} className="outline-none focus-visible:text-accent">{title}</Link>
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
          <span className="font-bold text-star">{formatRating(ratingAvg)}</span>
          <Stars rating={ratingAvg} />
          <span>{formatThousands(ratingCount)} ratings</span>
        </div>

        {boughtInPastMonth > 0 && <p className="mt-1.5 text-xs text-text-muted">{formatThousands(boughtInPastMonth)}+ bought in past month</p>}

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-2xl font-extrabold tracking-[-0.04em] text-headline">{formatPrice(priceCents)}</span>
          {hasDiscount && <del className="text-sm text-text-muted">{formatPrice(listPriceCents!)}</del>}
        </div>

        <p className={`mt-1.5 text-xs font-semibold ${outOfStock ? "text-danger" : "text-success"}`}>
          {outOfStock ? "Currently unavailable" : "In stock · Ready to ship"}
        </p>

        <div className="mt-1.5 text-xs leading-relaxed">
          <p className="font-semibold text-text-secondary">{promise.members}</p>
          <p className="text-text-muted">{promise.nonMembers}</p>
        </div>

        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-text-muted">
          Carbon impact <span className="text-text-secondary">{carbonImpact}</span>
        </p>

        <div className="mt-3">
          {outOfStock ? (
            <Link href={`/product/${slug}`} className="morrow-link text-sm">View options <span aria-hidden="true">↗</span></Link>
          ) : qty === 0 ? (
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={pending}
              className="morrow-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Adding…" : "Add to bag"}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2" aria-live="polite">
              <span className="text-xs font-semibold text-success">{qty} in bag</span>
              <div className="flex items-center overflow-hidden rounded-lg border border-border bg-surface-raised">
                <button type="button" aria-label="Decrease quantity" disabled={pending} onClick={() => void handleStep(-1)} className="px-3 py-1.5 text-lg leading-none text-text-secondary transition-colors hover:bg-surface-hover hover:text-headline disabled:opacity-40">−</button>
                <span className="min-w-7 px-1 text-center text-sm font-bold tabular-nums text-headline">{qty}</span>
                <button type="button" aria-label="Increase quantity" disabled={pending || !canIncrease} onClick={() => void handleStep(1)} className="px-3 py-1.5 text-lg leading-none text-text-secondary transition-colors hover:bg-surface-hover hover:text-headline disabled:opacity-40">+</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
