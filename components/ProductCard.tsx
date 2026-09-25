import Image from "next/image";
import Link from "next/link";
import { formatPrice, formatThousands, formatRating } from "@/lib/format";

export interface ProductCardData {
  slug: string;
  title: string;
  image: string;
  priceCents: number;
  listPriceCents?: number;
  ratingAvg?: number;
  ratingCount?: number;
  boughtInPastMonth?: number;
  badge?: string;
  subtitle?: string;
  brand?: string;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const hasDiscount = Boolean(product.listPriceCents && product.listPriceCents > product.priceCents);
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-[0_14px_34px_rgba(0,0,0,0.16)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:border-accent hover:shadow-[0_18px_44px_rgba(0,0,0,0.35),0_0_0_1px_rgba(167,139,250,0.18)] focus-visible:border-accent"
    >
      <div className="relative aspect-[1/1] overflow-hidden bg-surface">
        {product.badge && (
          <span className="absolute left-3 top-3 z-10 rounded-md border border-accent/30 bg-surface/90 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent backdrop-blur">
            {product.badge}
          </span>
        )}
        <Image
          src={product.image || "/images/placeholder.png"}
          alt={product.title}
          width={400}
          height={400}
          className="h-full w-full object-contain p-5 transition-transform duration-200 group-hover:scale-[1.025]"
          sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 45vw"
        />
        <span className="pointer-events-none absolute inset-x-3 bottom-3 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        {product.subtitle && <p className="morrow-eyebrow truncate">{product.subtitle}</p>}
        <h3 className="line-clamp-2 text-[0.95rem] font-bold leading-snug text-headline transition-colors group-hover:text-accent">
          {product.title}
        </h3>
        {(product.ratingAvg ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
            <span className="font-bold text-star">{formatRating(product.ratingAvg!)}</span>
            <StarGlyph />
            <span>{product.ratingCount ? `${formatThousands(product.ratingCount)} ratings` : "New arrival"}</span>
            {product.boughtInPastMonth ? <span className="text-text-muted">· {formatThousands(product.boughtInPastMonth)}+ bought</span> : null}
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-1">
          <span className="text-xl font-extrabold tracking-[-0.04em] text-headline">{formatPrice(product.priceCents)}</span>
          {hasDiscount && <del className="text-sm text-text-muted">{formatPrice(product.listPriceCents!)}</del>}
        </div>
      </div>
    </Link>
  );
}

function StarGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-star" fill="currentColor" aria-hidden="true">
      <path d="M12 17.3l-6.2 3.7 1.6-7-5.4-4.7 7.1-.6L12 2l2.9 6.7 7.1.6-5.4 4.7 1.6 7z" />
    </svg>
  );
}
