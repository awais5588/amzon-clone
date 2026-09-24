import type { ProductCardData } from "./ProductCard";
import { ProductCard } from "./ProductCard";

export function Shelf({
  title,
  note,
  cards,
  seeMore,
}: {
  title: string;
  note?: string;
  cards: ProductCardData[];
  seeMore?: { href: string; label?: string };
}) {
  if (cards.length === 0) return null;
  return (
    <section className="bg-card rounded-sm shadow-sm px-4 pt-4 pb-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-headline">{title}</h2>
          {note && <p className="text-[13px] text-muted">{note}</p>}
        </div>
        {seeMore && (
          <a
            href={seeMore.href}
            className="text-[13px] text-link hover:text-link-hover hover:underline whitespace-nowrap shrink-0"
          >
            {seeMore.label ?? (
              <>
                See more <span aria-hidden="true">›</span>
              </>
            )}
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
        {cards.map((c) => (
          <ProductCard key={c.slug} product={c} />
        ))}
      </div>
    </section>
  );
}