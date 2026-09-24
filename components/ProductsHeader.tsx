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
    <header>
      {isAmazonBrand ? (
        <p className="text-[13px] text-muted border border-border rounded-sm px-1.5 py-0.5 w-fit flex items-center gap-1">
          Featured from Amazon brands <span className="text-faint">ⓘ</span>
        </p>
      ) : (
        <p className="text-[13px] text-link hover:text-link-hover hover:underline w-fit">
          Visit the {brand} Store
        </p>
      )}
      <h1 className="text-2xl font-medium text-headline leading-snug mt-1">{title}</h1>
      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[13px]">
        <a href="#customer-reviews" className="flex items-center gap-1.5 group">
          <span className="font-bold text-star">{formatRating(ratingAvg)}</span>
          <Stars rating={ratingAvg} />
          <span className="text-link group-hover:text-link-hover group-hover:underline">
            {formatThousands(ratingCount)} ratings
          </span>
          <span className="text-faint">|</span>
          <span className="text-link group-hover:text-link-hover group-hover:underline">
            {formatThousands(ratingCount)} answered questions
          </span>
        </a>
        {boughtInPastMonth > 0 && (
          <span className="text-muted">
            {formatThousands(boughtInPastMonth)}+ bought in past month
          </span>
        )}
      </div>
    </header>
  );
}