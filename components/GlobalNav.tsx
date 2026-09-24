import Link from "next/link";
import { AmazonLogo } from "./AmazonLogo";
import { CartBadge } from "./CartBadge";
import { AccountMenu } from "./AccountMenu";

const NAV_LINKS = [
  "alexa for shopping",
  "Join Prime",
  "Early Prime Deals",
  "Prime Video",
  "Buy Again",
  "Groceries",
  "Coupons",
  "Pharmacy",
  "Amazon Home - Automotive",
];

const DEPARTMENTS = [
  "All",
  "Electronics",
  "Home & Kitchen",
  "Books",
  "Fashion",
  "Toys & Games",
];

function LocationPin() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor" aria-hidden="true">
      <path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 7.1 11.5 7.6 12 .3.3.5 0 .8-.3.4-1.1 6-7.1 6-11.7C18.4 5.6 15.2 2 12 2zm0 10.5A2.5 2.5 0 1 1 14.5 10h.5a3 3 0 1 0-2 2.8v-.6a1.5 1.5 0 0 0 0-.5z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M10 2a8 8 0 1 0 4.9 14.3l4.9 4.9a1 1 0 0 0 1.4-1.4l-4.9-4.9A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor" aria-hidden="true">
      <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.2 14.6l.1-.1L8.4 13h7.4c.8 0 1.5-.4 1.9-1.1l3.2-5.9L18.4 4l-2.6 5H8.5L8.6 8.9 6.4 4.4H2.8C2 4.4 1.4 5 1.4 5.8S2 7.1 2.8 7.1h1.8l2.7 5.5-1 1.8c-.3.5 0 1 .6 1l14.8.1-1.4-1.9-9-.5-.9 1.6z" />
    </svg>
  );
}

export function GlobalNav({ user }: { user: { name: string } | null }) {
  return (
    <header id="top" className="shadow-md">
      {/* Top bar */}
      <div className="bg-navbar text-white flex items-stretch gap-3 h-14 px-4">
        <div className="flex items-center border border-transparent hover:border-white px-2">
          <AmazonLogo />
        </div>

        <div className="flex items-center border border-transparent hover:border-white px-2 max-lg:hidden">
          <LocationPin />
          <div className="ml-1 leading-tight">
            <div className="text-xs text-[#cccccc]">Delivering to Nashville 37217</div>
            <div className="text-sm font-bold">• Update location</div>
          </div>
        </div>

        {/* Search */}
        <form action="/search" className="flex flex-1 min-w-0 my-auto h-10 rounded-md overflow-hidden">
          <select
            name="department"
            defaultValue="All"
            aria-label="All departments"
            className="bg-[#e6e6e6] text-black text-xs px-3 border-r border-[#cdcdcd] outline-none hover:bg-[#dadada] cursor-pointer max-sm:hidden"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d === "All" ? "all" : d}>
                {d}
              </option>
            ))}
          </select>
          <input
            type="search"
            name="q"
            placeholder="Search Amazon"
            aria-label="Search Amazon"
            className="flex-1 min-w-0 px-3 text-sm text-black bg-white placeholder:text-[#8f8f8f] outline-none focus:outline-2 focus:outline-solid focus:outline-[#f90] focus:outline-offset-[-2px]"
          />
          <button
            type="submit"
            aria-label="Search"
            className="bg-buy hover:bg-buy-hover text-black px-3 flex items-center justify-center cursor-pointer"
          >
            <SearchIcon />
          </button>
        </form>

        <div className="flex items-center gap-1 max-lg:hidden">
          <div className="border border-transparent hover:border-white px-2 py-1 leading-tight">
            <span className="block text-xs text-[#cccccc]">En</span>
            <span className="block text-sm font-bold">EN ▾</span>
          </div>
        </div>

        <AccountMenu user={user} />

        <Link
          href="/orders"
          className="flex items-center border border-transparent hover:border-white px-2 leading-tight max-lg:hidden"
        >
          <span>
            <span className="block text-xs text-[#cccccc]">Returns</span>
            <span className="block text-sm font-bold">& Orders</span>
          </span>
        </Link>

        <a href="/cart" className="flex items-end border border-transparent hover:border-white px-2">
          <span className="relative">
            <CartIcon />
            <CartBadge />
          </span>
          <span className="text-sm font-bold ml-0.5 mb-0.5">Cart</span>
        </a>
      </div>

      {/* Services strip */}
      <div className="bg-navbar-2 text-white text-[13px] flex items-center gap-3 h-9 px-4 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="flex items-center gap-1.5 font-bold cursor-pointer hover:text-[#febd69]">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
            <path d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z" />
          </svg>
          All
        </span>

        {NAV_LINKS.map((label) => (
          <span
            key={label}
            className="cursor-pointer px-0.5 border border-transparent hover:border-white"
          >
            {label}
          </span>
        ))}

        <span className="flex-1 min-w-4" />

        <span className="flex items-center gap-1.5 cursor-pointer" title="Compare items">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 3v18M5 8l-2 4h4zM19 8l-2 4h4z" strokeLinejoin="round" />
          </svg>
          VS
        </span>
      </div>
    </header>
  );
}