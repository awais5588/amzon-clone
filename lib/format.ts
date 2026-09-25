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

export function deliveryPromises(now: Date = new Date()): DeliveryPromise {
  return {
    members: `Complimentary delivery tomorrow, ${monthDayOf(addDays(now, 1))}`,
    nonMembers: `Delivery estimate: ${freeDeliveryDate(now)}`,
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

/** Estimated arrival date string, e.g. "Mon, Sep 28", computed from an order's placed date. */
export function etaDate(from: Date | string, etaDays: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + etaDays);
  return weekdayMonthDayOf(d);
}

export function orderDisplayNumber(orderKey: string): string {
  const digest = (seed: string): string => {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < seed.length; i++) {
      h1 = Math.imul(h1 ^ seed.charCodeAt(i), 16777619);
      h2 = Math.imul(h2 + seed.charCodeAt(i), 2246822519);
    }
    const n1 = Math.abs(h1 % 10000000);
    const n2 = Math.abs(h2 % 10000000);
    return `${String(n1).padStart(7, "0")}${String(n2).padStart(7, "0")}`;
  };
  const digits = digest(orderKey);
  return `113-${digits.slice(0, 7)}-${digits.slice(7, 14)}`;
}