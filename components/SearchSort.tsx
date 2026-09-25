"use client";

import { useRouter } from "next/navigation";

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to high" },
  { value: "price-desc", label: "Price: High to low" },
  { value: "rating", label: "Customer review" },
  { value: "newest", label: "Newest arrivals" },
  { value: "bestsellers", label: "Best sellers" },
];

export function SearchSort({
  q,
  department,
  sort,
  sp,
}: {
  q?: string;
  department?: string;
  sort: string;
  sp: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2.5">
      <label htmlFor="sort-select" className="hidden text-xs font-semibold text-text-secondary sm:inline">Sort by</label>
      <select
        id="sort-select"
        value={sort}
        onChange={(event) => {
          const params = new URLSearchParams();
          for (const key of ["q", "department", "p", "rating", "freeship", "delivery", "minPrice", "maxPrice"]) {
            const value = Array.isArray(sp[key]) ? sp[key][0] ?? "" : sp[key] ?? "";
            if (value) params.set(key, value);
          }
          if (!q && !params.has("q")) params.delete("q");
          if (department === "all") params.delete("department");
          params.set("sort", event.target.value);
          router.push(`/search?${params.toString()}`);
        }}
        className="morrow-input min-w-40 cursor-pointer py-2 text-sm text-headline"
      >
        {SORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}
