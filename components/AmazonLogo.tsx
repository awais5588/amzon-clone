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
    <a href={href} className={`flex flex-col leading-none ${className}`} aria-label="amazon clone home">
      <span
        className={`text-[18px] font-semibold tracking-tight uppercase ${
          variant === "light" ? "text-white" : "text-headline"
        }`}
      >
        amazon<span className="text-[9px] font-normal align-top text-[#febd69]">clone</span>
      </span>
      <svg
        viewBox="0 0 100 8"
        className="w-[76px] h-[7px] mt-[1px]"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M2 2 Q 20 8 50 8 Q 80 8 98 2" fill="none" stroke="#febd69" strokeWidth="2.5" />
      </svg>
    </a>
  );
}