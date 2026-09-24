export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <span className={`inline-flex text-star ${className}`} aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={rating >= i} />
      ))}
    </span>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
      <path
        d="M12 17.3l-6.2 3.7 1.6-7-5.4-4.7 7.1-.6L12 2l2.9 6.7 7.1.6-5.4 4.7 1.6 7z"
        opacity={filled ? 1 : 0.25}
      />
    </svg>
  );
}