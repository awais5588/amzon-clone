import Image from "next/image";
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
}

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <a
      href={`/product/${product.slug}`}
      className="group block bg-card rounded-sm overflow-hidden border border-border transition-shadow hover:shadow-md flex flex-col"
    >
      <div className="relative aspect-square bg-[#f7fafa]">
        {product.badge && (
          <span className="absolute top-1.5 left-1.5 z-10 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-sm">
            {product.badge}
          </span>
        )}
        <Image
          src={product.image}
          alt={product.title}
          width={400}
          height={400}
          className="object-cover w-full h-full group-hover:opacity-90 transition-opacity"
          sizes="(min-width:1024px) 20vw, 45vw"
        />
      </div>
      <div className="p-2.5 flex flex-col gap-1">
        <h3 className="text-[13px] leading-snug text-link group-hover:text-link-hover group-hover:underline line-clamp-2">
          {product.title}
        </h3>

        {product.subtitle && (
          <p className="text-xs text-muted">{product.subtitle}</p>
        )}

        {(product.ratingAvg ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-star font-bold">{formatRating(product.ratingAvg!)}</span>
            <StarGlyph />
            <span className="text-faint">
              {product.ratingCount ? `(${formatThousands(product.ratingCount)})` : ""}
              {product.boughtInPastMonth ? ` · ${formatThousands(product.boughtInPastMonth)}+ bought in past month` : ""}
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-1">
          <span className="text-lg font-semibold text-headline">
            {formatPrice(product.priceCents)}
          </span>
          {product.listPriceCents && product.listPriceCents > product.priceCents && (
            <del className="text-sm text-faint">{formatPrice(product.listPriceCents)}</del>
          )}
        </div>
      </div>
    </a>
  );
}

function StarGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-star" fill="currentColor" aria-hidden="true">
      <path d="M12 17.3l-6.2 3.7 1.6-7-5.4-4.7 7.1-.6L12 2l2.9 6.7 7.1.6-5.4 4.7 1.6 7z" />
    </svg>
  );
}