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
    <section className="bg-card rounded-sm shadow-sm px-4 py-5">
      <h2 className="text-xl font-semibold text-headline mb-3">Customer reviews</h2>

      <div className="flex flex-wrap items-start gap-6 mb-5">
        <div className="text-center min-w-[120px]">
          <p className="text-4xl font-semibold text-headline">{formatRating(average)}</p>
          <div className="flex justify-center my-1">
            <Stars rating={average} />
          </div>
          <p className="text-[13px] text-muted">{formatThousands(total)} ratings</p>
          {bought > 0 && (
            <p className="text-[12px] text-muted">{formatThousands(bought)}+ bought in past month</p>
          )}
        </div>
        <div className="flex-1 min-w-[220px] max-w-[420px] text-[13px]">
          <p className="text-muted mb-1">
            Rating: {formatRating(average)} out of 5 stars from {formatThousands(total)} customer
            ratings.
          </p>
          <p className="text-muted">Customers say the most helpful reviews are shown first.</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted">No customer reviews yet for this item from the US.</p>
      ) : (
        <ul className="divide-y divide-border">
          {reviews.map((r, i) => (
            <li key={`${r.userName}-${i}`} className="py-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-semibold text-link">{r.userName}</span>
                {r.verifiedPurchase && (
                  <span className="text-[12px] text-[#007600] flex items-center gap-0.5">
                    <CheckIcon /> Verified Purchase
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Stars rating={r.rating} />
                <h3 className="text-sm font-semibold text-headline">{r.title}</h3>
              </div>
              <p className="text-sm text-headline mt-1.5 leading-relaxed">{r.body}</p>
              <p className="text-[12px] text-faint mt-2">
                Reviewed in the United States on {formatDate(r.createdAt)}
                <span className="mx-1">·</span>
                {r.helpfulCount} people found this helpful
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
      <path d="M9 17.7 4.5 13.2l1.4-1.4L9 14.9l9.1-9.1 1.4 1.4z" />
    </svg>
  );
}