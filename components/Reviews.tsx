import { Stars } from "./Stars";
import { formatRating, formatThousands, formatDate } from "@/lib/format";

export interface ReviewView {
  userName: string;
  rating: number;
  title: string;
  body: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

export function Reviews({
  average,
  total,
  bought,
  reviews,
}: {
  average: number;
  total: number;
  bought: number;
  reviews: ReviewView[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_14px_34px_rgba(0,0,0,0.14)] sm:p-7">
      <p className="morrow-eyebrow">From the community</p>
      <h2 className="mt-2 font-display text-3xl text-headline">Customer reviews</h2>
      <div className="mt-6 flex flex-wrap items-start gap-8 border-b border-border pb-6">
        <div className="min-w-32 text-center">
          <p className="text-5xl font-extrabold tracking-[-0.06em] text-headline">{formatRating(average)}</p>
          <div className="my-2 flex justify-center"><Stars rating={average} /></div>
          <p className="text-xs text-text-secondary">{formatThousands(total)} ratings</p>
          {bought > 0 && <p className="mt-1 text-xs text-text-muted">{formatThousands(bought)}+ bought recently</p>}
        </div>
        <div className="max-w-lg flex-1 text-sm leading-relaxed text-text-secondary">
          <p>Rated {formatRating(average)} out of 5 by {formatThousands(total)} customers.</p>
          <p className="mt-1 text-text-muted">Helpful reviews are shown first to keep the signal clear.</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="py-6 text-sm text-text-secondary">No customer reviews yet for this item.</p>
      ) : (
        <ul className="divide-y divide-border">
          {reviews.map((review, index) => (
            <li key={`${review.userName}-${index}`} className="py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-headline">{review.userName}</span>
                {review.verifiedPurchase && <span className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-[11px] font-semibold text-success"><CheckIcon /> Verified purchase</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2"><Stars rating={review.rating} /><h3 className="text-sm font-bold text-headline">{review.title}</h3></div>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{review.body}</p>
              <p className="mt-3 text-xs text-text-muted">Reviewed on {formatDate(review.createdAt)} · {review.helpfulCount} people found this helpful</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <path d="M9 17.7 4.5 13.2l1.4-1.4L9 14.9l9.1-9.1 1.4 1.4z" />
    </svg>
  );
}
