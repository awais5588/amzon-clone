import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function AmazonLogo({
  href = "/",
  className = "",
  variant = "light",
}: {
  href?: string;
  className?: string;
  variant?: "light" | "dark";
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label={`${BRAND.name} home`}
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] border border-accent/50 bg-accent-soft text-accent shadow-[0_0_22px_rgba(167,139,250,0.18)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path d="M12 3.5 14 10l6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2 2-6.5Z" fill="currentColor" />
          <circle cx="12" cy="12" r="2.1" fill="var(--accent-ink)" />
        </svg>
      </span>
      <span
        className={`font-sans text-[1.05rem] font-extrabold tracking-[-0.04em] ${
          variant === "light" ? "text-headline" : "text-headline"
        }`}
      >
        {BRAND.name}
      </span>
    </Link>
  );
}
