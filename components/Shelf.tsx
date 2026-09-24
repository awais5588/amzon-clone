import type { ProductCardData } from "./ProductCard";
import { ProductCard } from "./ProductCard";

export function Shelf({
  title,
  note,
  cards,
}: {
  title: string;
  note?: string;
  cards: ProductCardData[];
}) {
  if (cards.length === 0) return null;
  return (
    <section className="bg-card rounded-sm shadow-sm px-4 pt-4 pb-5">
      <div className="mb-3">
        <h2 className="text-xl font-semibold text-headline">{title}</h2>
        {note && <p className="text-[13px] text-muted">{note}</p>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <ProductCard key={c.slug} product={c} />
        ))}
      </div>
    </section>
  );
}