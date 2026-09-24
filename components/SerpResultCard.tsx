"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
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
  carbonImpact?: string;
  initialQty: number;
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
  carbonImpact = "Low",
  initialQty,
}: SerpResultCardProps) {
  const [qty, setQty] = useState(initialQty);
  const [pending, setPending] = useState(false);
  const [promise] = useState(() => deliveryPromises());

  const apply = useCallback((nextQty: number) => {
    setQty(nextQty);
  }, []);

  const run = useCallback(
    async (fn: () => Promise<{ totalQty: number; subtotalCents: number; qualifiesForFreeDelivery: boolean }>) => {
      setPending(true);
      try {
        const res = await fn();
        setCartSummary(res);
      } finally {
        setPending(false);
      }
    },
    []
  );

  const handleAdd = useCallback(
    () =>
      run(() =>
        addToCart({ productId, variantSku }).then((s) => {
          const item = s.items.find((i) => i.variantSku === variantSku);
          apply(item?.qty ?? 1);
          return s;
        })
      ),
    [run, apply, productId, variantSku]
  );

  const handleStep = useCallback(
    (delta: number) =>
      run(() =>
        setCartItemQty({ productId, variantSku, qty: qty + delta }).then((s) => {
          const item = s.items.find((i) => i.variantSku === variantSku);
          apply(item?.qty ?? 0);
          return s;
        })
      ),
    [run, apply, productId, variantSku, qty]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <article className="flex gap-3 bg-card rounded-sm shadow-sm hover:shadow-md transition-shadow p-2.5">
      <a href={`/product/${slug}`} className="shrink-0 w-36 sm:w-48 aspect-square bg-[#f7fafa] overflow-hidden rounded-sm">
        <Image
          src={image}
          alt={title}
          width={200}
          height={200}
          className="w-full h-full object-cover"
          sizes="200px"
        />
      </a>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {isAmazonBrand && (
          <p className="text-xs text-muted flex items-center gap-1 border border-border rounded-sm px-1.5 py-0.5 w-fit mt-0.5">
            Featured from Amazon brands
            <span className="text-faint">ⓘ</span>
          </p>
        )}

        <h3 className="text-[15px] leading-snug text-link hover:text-link-hover hover:underline line-clamp-2">
          <a href={`/product/${slug}`}>{title}</a>
        </h3>

        <div className="flex items-center gap-1.5 text-[13px]">
          <span className="font-bold text-star">{formatRating(ratingAvg)}</span>
          <Stars rating={ratingAvg} />
          <span className="text-faint">{formatThousands(ratingCount)}</span>
        </div>

        {boughtInPastMonth > 0 && (
          <p className="text-xs text-muted">
            {formatThousands(boughtInPastMonth)}+ bought in past month
          </p>
        )}

        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-xl font-semibold text-headline">{formatPrice(priceCents)}</span>
          {listPriceCents && listPriceCents > priceCents && (
            <del className="text-sm text-faint">{formatPrice(listPriceCents)}</del>
          )}
        </div>

        <div className="text-[13px] leading-tight mt-1">
          <p className="text-link underline-offset-2 hover:underline">{promise.members}</p>
          <p className="text-muted">{promise.nonMembers}</p>
        </div>

        <p className="text-xs text-faint flex items-center gap-1 mt-0.5">
          Carbon impact <ChevronDown /> {carbonImpact}
        </p>

        <div className="mt-1.5">
          {qty === 0 ? (
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={pending}
              className="bg-cta hover:bg-[#e6c200] border border-cta-border text-headline rounded-[8px] px-4 py-1.5 text-[13px] font-medium shadow-sm disabled:opacity-50 transition-colors"
            >
              Add to cart
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-headline">
                {qty} in cart
              </span>
              <div className="flex items-center rounded-sm border border-border overflow-hidden">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={pending}
                  onClick={() => void handleStep(-1)}
                  className="px-2.5 py-1 text-lg leading-none hover:bg-row-hover disabled:opacity-50"
                >
                  −
                </button>
                <span className="px-2 text-sm tabular-nums">{qty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={pending}
                  onClick={() => void handleStep(1)}
                  className="px-2.5 py-1 text-lg leading-none hover:bg-row-hover disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" aria-hidden="true">
      <path d="M7 9l5 5 5-5z" />
    </svg>
  );
}