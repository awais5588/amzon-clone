export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  const clamped = Math.max(0, Math.min(5, rating));
  return (
    <span className={`inline-flex ${className}`} aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, clamped - (i - 1)));
        return <Star key={i} fill={fill} />;
      })}
    </span>
  );
}

function Star({ fill }: { fill: number }) {
  const path =
    "M12 17.3l-6.2 3.7 1.6-7-5.4-4.7 7.1-.6L12 2l2.9 6.7 7.1.6-5.4 4.7 1.6 7z";
  return (
    <span className="relative inline-block w-3.5 h-3.5">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-star" fill="currentColor" aria-hidden="true">
        <path d={path} opacity={0.25} />
      </svg>
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-star" fill="currentColor" aria-hidden="true">
          <path d={path} />
        </svg>
      </span>
    </span>
  );
}