import { Stars } from "./Stars";
import { formatThousands, formatRating } from "@/lib/format";

export function ProductsHeader({
  title,
  brand,
  isAmazonBrand,
  ratingAvg,
  ratingCount,
  boughtInPastMonth,
}: {
  title: string;
  brand: string;
  isAmazonBrand: boolean;
  ratingAvg: number;
  ratingCount: number;
  boughtInPastMonth: number;
}) {
  return (
    <header className="border-b border-border pb-7">
      <p className={isAmazonBrand ? "morrow-eyebrow w-fit rounded-md border border-accent/25 bg-accent-soft px-2 py-1 text-[9px]" : "morrow-eyebrow"}>
        {isAmazonBrand ? "Morrow select" : brand}
      </p>
      <h1 className="mt-3 max-w-4xl font-display text-4xl leading-tight tracking-[-0.035em] text-headline sm:text-5xl">{title}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-text-secondary">
        <a href="#customer-reviews" className="group flex items-center gap-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <span className="font-bold text-star">{formatRating(ratingAvg)}</span>
          <Stars rating={ratingAvg} />
          <span className="font-semibold text-text-secondary transition-colors group-hover:text-accent">{formatThousands(ratingCount)} ratings</span>
        </a>
        {boughtInPastMonth > 0 && <span className="text-text-muted">{formatThousands(boughtInPastMonth)}+ bought in past month</span>}
      </div>
    </header>
  );
}
