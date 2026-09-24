"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatPrice, deliveryPromises } from "@/lib/format";
import { addToCart } from "@/app/_actions/cart";
import { setCartSummary } from "@/lib/cart-client";

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

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" aria-hidden="true">
      <path d="M7 9l5 5 5-5z" />
    </svg>
  );
}

export function ProductView({
  product,
  initialQtyBySku,
}: {
  product: ProductViewData;
  initialQtyBySku: Record<string, number>;
}) {
  const router = useRouter();
  const [sku, setSku] = useState(product.variants[0]?.sku ?? "");
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [pending, setPending] = useState<null | "add" | "buy">(null);
  const [feedback, setFeedback] = useState<"added" | "error" | null>(null);
  const [promise] = useState(() => deliveryPromises());

  const variant = useMemo(
    () => product.variants.find((v) => v.sku === sku) ?? product.variants[0],
    [product.variants, sku]
  );
  const inCart = initialQtyBySku[variant?.sku ?? ""] ?? 0;

  const images = useMemo(() => {
    const list = variant?.images?.length ? variant.images : product.images;
    return list.length ? list : ["https://picsum.photos/seed/no-image/500/500"];
  }, [variant, product.images]);

  const selectVariant = useCallback(
    (nextSku: string) => {
      setSku(nextSku);
      setImageIndex(0);
      setQty(1);
      setFeedback(null);
    },
    []
  );

  const run = useCallback(
    async (mode: "add" | "buy") => {
      if (!variant) return;
      setPending(mode);
      setFeedback(null);
      try {
        const res = await addToCart({ productId: product.productId, variantSku: variant.sku, qty });
        setCartSummary(res);
        setFeedback("added");
        if (mode === "buy") router.push("/cart");
      } catch {
        setFeedback("error");
      } finally {
        setPending(null);
      }
    },
    [product.productId, variant, qty, router]
  );

  const outOfStock = !variant || variant.stock <= 0;
  const maxQty = variant ? Math.max(1, Math.min(variant.stock, 10)) : 1;

  return (
    <div className="grid md:grid-cols-[minmax(0,1fr)_400px] gap-6">
      {/* Gallery */}
      <div>
        <div className="bg-card rounded-sm border border-border flex items-center justify-center p-4 sticky md:top-3">
          <div className="relative aspect-square w-full max-w-[420px]">
            <Image
              src={images[imageIndex]}
              alt={product.title}
              fill
              className="object-contain"
              sizes="(min-width:768px) 40vw, 90vw"
              priority
            />
          </div>
        </div>
        {images.length > 1 && (
          <div className="mt-2 flex gap-2 flex-wrap justify-center">
            {images.map((img, i) => (
              <button
                key={img + i}
                type="button"
                onClick={() => setImageIndex(i)}
                aria-label={`View image ${i + 1}`}
                className={`w-14 h-14 border rounded-sm overflow-hidden ${i === imageIndex ? "border-[#c45500] ring-1 ring-[#c45500]" : "border-border hover:border-link"}`}
              >
                <Image src={img} alt="" width={56} height={56} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Buy box */}
      <div className="bg-card rounded-sm border border-border p-4">
        {product.bestsellerRank && (
          <p className="text-[13px] text-deal font-medium mb-1">{product.bestsellerRank}</p>
        )}

        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-medium text-headline">{formatPrice(variant?.priceCents ?? 0)}</span>
          {variant?.listPriceCents && variant.listPriceCents > (variant?.priceCents ?? 0) && (
            <del className="text-sm text-faint">{formatPrice(variant.listPriceCents)}</del>
          )}
        </div>
        {variant?.listPriceCents && variant.listPriceCents > (variant?.priceCents ?? 0) && (
          <p className="text-[13px] text-deal font-medium mt-0.5">
            Save {formatPrice(variant.listPriceCents - (variant?.priceCents ?? 0))}
          </p>
        )}

        {product.freeReturns && (
          <p className="text-[13px] mt-1">
            <span className="font-semibold text-headline">FREE Returns</span>
            <span className="text-muted"> · Returnable within 30 days</span>
          </p>
        )}

        {product.primeEligible && (
          <p className="text-[13px] text-muted mt-1 flex items-center gap-1">
            <span className="font-semibold text-muted">Carbon impact</span> <ChevronDown /> {product.carbonImpact}
          </p>
        )}

        <div className="mt-3 text-[13px] leading-snug">
          <p className="text-link underline-offset-2 hover:underline">{promise.members}</p>
          <p className="text-muted">{promise.nonMembers}</p>
        </div>

        <p className="text-[12px] text-faint mt-1.5">
          Ships from Amazon.com
          <span className="text-faint"> · Sold by {product.seller}</span>
        </p>

        {/* Stock state */}
        {outOfStock ? (
          <p className="mt-3 text-[15px] text-[#b12704] font-medium">Currently unavailable.</p>
        ) : (
          <p className="mt-3 text-[15px] text-[#007600] font-medium">
            In Stock
            {variant.stock <= 10 && (
              <span className="text-[13px] text-[#b12704] font-normal">
                {" "}
                Only {variant.stock} left in stock — order soon.
              </span>
            )}
          </p>
        )}

        {/* Variant selector */}
        {product.variants.length > 1 && (
          <div className="mt-3">
            <p className="text-[13px]">
              <span className="text-faint">Style:</span>{" "}
              <span className="font-medium">{variant?.label}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.variants.map((v) => {
                const active = v.sku === variant?.sku;
                return (
                  <button
                    key={v.sku}
                    type="button"
                    onClick={() => selectVariant(v.sku)}
                    aria-pressed={active}
                    className={`border rounded-sm px-3 py-2 text-left text-[13px] transition-colors ${
                      active
                        ? "border-[#007185] ring-1 ring-[#007185] bg-row-hover"
                        : "border-border hover:border-link"
                    } ${v.stock <= 0 ? "opacity-50" : ""}`}
                  >
                    <span className="block">{v.label}</span>
                    <span className="block text-headline font-medium mt-0.5">
                      {formatPrice(v.priceCents)}
                    </span>
                    {v.stock <= 0 && <span className="block text-[12px] text-[#b12704]">Unavailable</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Qty + actions */}
        {!outOfStock && (
          <div className="mt-4 flex items-center gap-2">
            <label htmlFor="buy-qty" className="text-[13px] text-muted">
              Qty:
            </label>
            <select
              id="buy-qty"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="border border-border rounded-sm px-2 py-1 text-sm cursor-pointer"
            >
              {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            {inCart > 0 && (
              <span className="text-[13px] text-muted">
                · <span className="text-headline font-medium">{inCart} in cart</span>
              </span>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            disabled={outOfStock || pending !== null}
            onClick={() => void run("add")}
            className="bg-cta hover:bg-[#e6c200] border border-cta-border text-headline rounded-[20px] px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add to Cart
          </button>
          <button
            type="button"
            disabled={outOfStock || pending !== null}
            onClick={() => void run("buy")}
            className="bg-buy hover:bg-buy-hover border border-[#a35c00] text-headline rounded-[20px] px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Buy Now
          </button>
          {feedback === "added" && (
            <p className="text-[13px] text-[#007600] font-medium">Added to cart ✓</p>
          )}
          {feedback === "error" && (
            <p className="text-[13px] text-[#b12704] font-medium">Something went wrong — please try again.</p>
          )}
        </div>

        {product.isAmazonBrand && (
          <p className="mt-3 text-[12px] text-faint flex items-center gap-1">
            <span className="border border-border rounded-sm px-1 py-0.5">Featured from Amazon brands ⓘ</span>
          </p>
        )}
      </div>
    </div>
  );
}