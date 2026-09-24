# Product Map — amzonClone (from screenshots + Amazon research)

Derived from the five screenshots in `/recon/` (OCR of layout + text) cross-referenced
with Amazon.com 2026 research. Note: `product.png` is a SERP-with-sticky-mini-cart, so
the PDP is mapped from research. Screenshot OCR source files kept out of repo (tooling).

## 1. Pages/screens to build

| # | Screen | Reconstructed from |
|---|--------|--------------------|
| S1 | **Home** | home.png — 2026 redesigned layout |
| S2 | **Search results (SERP)** | search.png / product.png — "tv stick" SERP |
| S3 | **Product detail (PDP)** | research (no dedicated screenshot) |
| S4 | **Cart** | cart.png |
| S5 | **Checkout** (address → shipping → payment → review → place order) | checkout.png + research |
| S6 | **Order confirmation** | research (absent from screenshots) |
| S7 | **Your Orders / order detail** | research + assignment requirement |
| S8 | **Sign in / Sign up, account menu** | nav elements in all screenshots + research |

## 2. UI elements & interactions (from screenshot OCR)

**Global nav (every page, desktop):**
- `amazon` logo (left) · `Delivering to Nashville 37217` + `• Update location`
  (location/zip bar, clickable) · search box with department dropdown (`All ▾`) ·
  right cluster: `Hello, Awais` / `EN ▾` / `Account & Lists ▾` / `Returns & Orders` /
  `Cart` (with count badge).
- **Services strip** under the nav: `All` (hamburger mega-menu) · `alexa for shopping` ·
  `Join Prime` · `Early Prime Deals` · `Prime Video` · `Buy Again` · `Groceries` ·
  `Coupons` · `Pharmacy` · `Amazon Home - Automotive`. On home also a marketing
  countdown (`03:08`) and `/VS` compare icon.

**S1 Home — 2026 layout:** left focus column (Prime offer text: "Exclusively for
members / Prime Big Deals / drop Oct 6-7 / Join Prime") · multi-column promo grid
("The fall edit — Shop premium brands", "Shop Halloween candy picks", "New
sportswear and more — Stay active with Nike", "Spend less every day — Customer-loved
finds under $20") · product tiles with name/price ("Brach's Autumn Mix", "Sour Patch
Kids") · bottom product-card row: `Sponsore`d, `You might like — Sponsored`,
`Top-selling Amazon Devices — fire tv stick HD`, "Shop this new home arrival",
Apple Watch Series 12 cards. Each card: image, title, tag badge, link.

**S2/S3 SERP:** result count line `1-16 of over 10,000 results for "tv stick"` ·
`Sort by: Featured ▾` top-right · **filter pills** (`Popular Shopping Ideas`: Fire,
Android, Streaming, Apple, See more; `Narrow your search`: Gaming, Remote cover,
Ethernet adapter, Hdmi cable, Roku 4K HD) · **left refinement rail**: Prime Delivery
(Today by 8AM / Today by 2PM / Delivery Day: Get It Today / Get It by Tomorrow),
Free Shipping Eligible, Customer Reviews (★★★★★ & Up), Price ($1–$70+) · **result
cards (horizontal, 2026 style)**: image left, right block = brand tag "Featured from
Amazon brands", title (2-3 lines), `4.6 ★★★★★ (82.9K)`, `10K+ bought in past month`,
price `$8499`, delivery promise (`Join Prime to get FREE delivery Tomorrow, Sep 25` /
`Or Non-members get FREE delivery Tue, Sep 29`), `Carbon impact ▾`, **Add to cart**
button; once added: inline `1 in cart` + `+/-` stepper + **sticky right sub-cart**
(`Subtotal $84.99 / Your order qualifies for FREE delivery / Go to Cart`).

**S4 Cart:** `Shopping Cart` title + `Deselect all items` + `Price` column header ·
top Visa-gift-card promo banner · line item: image, title link, `In Stock`,
`FREE delivery Tue, Sep 29 available at checkout`, `FREE Returns`, `Carbon impact ▾`,
`This is a gift — Learn more`, `Configuration: Fire TV Stick 4K Max` (variant line),
actions `Delete` · `Save for later` · `Compare with similar items` · `Share`, qty
stepper, price, "Add protection" banner · right rail: `Subtotal (1 item): $84.99`,
`This order contains a gift`, **Proceed to checkout** (orange), Prime upsell box
(`Fast, FREE delivery … 30-day trial for $0` / `Accept your free trial`) · bottom
`You might also like`.

**S5 Checkout:** stripped header (`amazon` · `Secure checkout ▾` · `Cart`) · steps
list: **Add delivery address** (`Enter your address to see delivery options` →
`Add a new delivery address` + `Deliver to this address` zone), **Payment method**,
**Review items and shipping** · right **order summary rail**: Items / Shipping &
handling / Estimated tax to be collected / **Order total: $84.99** · legal footer
(email ack, contract on shipment, tax note, 30-day returns, Back to cart, Back to
top) · **Place your order** button referenced in legal copy.

## 3. Main user flows

1. **Browse/promo → product** — home cards → PDP.
2. **Search & filter** — query + department + Sort + pills + left rail → SERP → add to
   cart inline (sticky sub-cart) → PDP.
3. **Cart management** — view, qty stepper (cap at stock), delete, save-for-later,
   gift flag, subtotal, proceed.
4. **Checkout funnel** — sign-in gate → delivery address (new/saved) → shipping method
   → payment (saved/mock card) → review → **place order (idempotent)** → confirmation.
5. **Post-purchase** — Your Orders state machine (Pending→Processing→Shipped→Delivered
   / Cancelled), order detail, track/buy-again, mock return.
6. **Account** — sign up / sign in, saved addresses & payment methods, account menu.
7. **Reviews** — post-purchase star + written review, verified-purchase badge, avg+count.

## 4. MongoDB data models

```
User {
  name, email (unique), passwordHash,
  addresses: [ { fullName, line1, line2, city, state, zip, phone, isDefault } ],
  paymentMethods: [ { brand, last4, expMonth, expYear, cardholderName, isDefault } ],  // sandbox only, no CVV
}
Product {                     // parent doc; variants embedded
  title, brand, description, bullets: [String],
  category: { path: [String] },
  images: [String],
  ratingAvg, ratingCount, boughtInPastMonth, bestsellerRank,
  isAmazonBrand: Boolean,
  variants: [ { label, sku, priceCents, listPriceCents?, stock, images } ],
  primeEligible, freeReturns, carbonImpact,
  seller: 'Amazon.com', createdAt
}
Review { productId, userId, userName, rating(1-5), title, body, verifiedPurchase, helpfulCount, createdAt }
Cart { userId, items: [ { productId, variantSku, title, image, priceCents(snapshot), qty } ], updatedAt }  // advisory
Order {
  orderKey (unique, idempotency), userId,
  status: 'Pending'|'Processing'|'Shipped'|'Delivered'|'Cancelled',
  items: [ { productId, variantSku, title, image, qty, unitPriceCents } ],  // snapshot at checkout
  shippingAddress: {...}, payment: { brand, last4 },
  totals: { subtotalCents, shippingCents, taxCents, totalCents },
  deliveryEstimate: { min: Date, max: Date }, createdAt, timeline dates
}
```

**Invariants preserved** (from recon): cart is advisory → revalidate price/stock at
checkout; soft-reserve stock at checkout, decrement only on confirmed order (guard
overselling); order placement idempotent via unique `orderKey` + insert-on-conflict.

## 5. Implementation plan (Next.js + TS + Tailwind + Mongo + server actions)

- **Structure:** `lib/` (mongoose singleton, models, auth/cart/format helpers),
  `app/` routes per S1–S8, `components/` (GlobalNav, SerpCard, ProductCard, CartLine,
  OrderSummary, StarRating, QtyStepper, BuyBox), `scripts/seed.ts` (catalog across ~5
  departments incl. flagship Fire TV Stick 4K Max mirroring the screenshots).
- **Auth:** httpOnly signed cookie session; server actions for signup/signin/signout.
- **Cart:** server actions `addToCart/updateQty/remove/saveForLater`; qty capped at stock.
- **Checkout:** one page, step state via URL/search params; server action validates cart,
  soft-reserves stock, returns order summary; `placeOrder` is idempotent → confirmation.
- **Search:** Mongo regex + filters on server, query params; Sort key (featured/price/
  rating/bought/recent).
- **Styling:** Tailwind; whitesmoke body `#E3E6E6`, white cards, blue links
  `#007185` + underline-on-hover, orange purchase button `#FF9900`, yellow CTA
  `#FFD814`; sticky sub-cart + inline qty on SERP; responsive.
- **Phases (each committed interleaved w/ logs):**
  P1 scaffold + DB + models + seed → P2 global nav + home → P3 SERP (filters/sort/rail)
  → P4 PDP (variants, reviews, buy box) → P5 cart → P6 auth → P7 checkout + orders +
  confirmation → P8 polish (recommendations, gift flag, carbon line, mock returns).

## 6. Pakistan-related limitations & differences

- **No `amazon.pk`**: Amazon.com does not operate as an official storefront in Pakistan
  — no local catalog, no Prime fulfillment zone, no Rupee pricing. This clone mirrors
  the **US experience in the screenshots** (USD prices, US zip/`Nashville` style
  location bar, US-style delivery estimates, `Estimated tax`), so shipping promises and
  tax are simulated US-context, not Pakistan-accurate.
- **Payments**: sandbox/mock cards only (no gateway, no real charge, no CVV stored) —
  moot for PK anyway since Amazon.com doesn't take PK domestic payment methods here.
  No COD implemented.
- **Fulfillment**: delivery ETAs are fake values (like "Tomorrow, Sep 25"), not real
  logistics; free-shipping is thresholdless for the demo per screenshots.
- Everything else (flows, UI, models) is market-independent.