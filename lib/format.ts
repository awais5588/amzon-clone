export function formatPrice(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rest = abs % 100;
  return `${sign}$${dollars.toLocaleString("en-US")}.${String(rest).padStart(2, "0")}`;
}

export function formatThousands(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return String(n);
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function wordsFromSlug(slug: string): string {
  return slug.replace(/-/g, " ");
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export interface DeliveryPromise {
  members: string;
  nonMembers: string;
}

/** Simulated US-context delivery promises, keyed to "today" (mirrors the screenshot copy). */
export function deliveryPromises(now: Date = new Date()): DeliveryPromise {
  return {
    members: `Join Prime to get FREE delivery Tomorrow, ${monthDayOf(addDays(now, 1))}`,
    nonMembers: `Or Non-members get FREE delivery ${freeDeliveryDate(now)}`,
  };
}

export function freeDeliveryDate(now: Date = new Date()): string {
  return weekdayMonthDayOf(addDays(now, 4));
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function monthDayOf(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function weekdayMonthDayOf(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}