"use client";

import { useRouter } from "next/navigation";

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Avg. Customer Review" },
  { value: "newest", label: "Newest Arrivals" },
  { value: "bestsellers", label: "Best Sellers" },
];

export function SearchSort({
  q,
  department,
  sort,
}: {
  q?: string;
  department?: string;
  sort: string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor="sort-select" className="text-sm text-muted">
        Sort by:
      </label>
      <select
        id="sort-select"
        defaultValue={sort}
        onChange={(e) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (department && department !== "all") params.set("department", department);
          params.set("sort", e.target.value);
          router.push(`/search?${params.toString()}`);
        }}
        className="border border-border rounded-sm bg-card text-sm px-2 py-1 cursor-pointer"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}