export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex items-center gap-3 rounded-full border border-border bg-surface px-5 py-3 text-sm text-text-secondary" role="status">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        Loading the catalog…
      </div>
    </div>
  );
}
