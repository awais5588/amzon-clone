# Recon — Amazon.com (amzonClone)

Date: 2026-09-24. Goal: understand Amazon.com end-to-end before building a clone.

## Method (what "using Amazon" actually produced here)

- Direct live access was attempted and is **bot-blocked**: `https://www.amazon.com/` returns an
  empty/captcha page; search results `503`; the Customer Service help page `403`. No account can
  be signed up from a headless environment, and no browser/screenshots are possible from this
  tool. Screenshots therefore cannot be produced — noted honestly per the assignment.
- Recon was built from: (1) Amazon's official Customer Service / Help documentation (quoted
  sections below), (2) a May 2026 wireframe walkthrough of the shopping happy-path, (3) system-
  design and IA breakdowns of the current (2026) Amazon UX, including the May 2026 "Alexa for
  Shopping" (formerly Rufus) AI layer, search-SERP "Researched by AI", and PDP/Cart touchpoints.

## The core happy path (what a shopper actually does)

Search / browse → search results (filter pills + left refinement rail) → product detail page
(PDP) → Add to Cart / Buy Now → cart (qty stepper, saved-for-later, subtotal) → checkout
(sign-in gate → shipping address → shipping method → payment → review) → place order →
order confirmation (order number + delivery estimate) → Your Orders (track, buy again, return).

## Flows / features to rebuild (scoped for the clone)

### A. Discovery (read-heavy)
- **Homepage**: top nav bar (logo · *Deliver to* location bar · search box with department
  dropdown + autocomplete · language · *Sign in/Account* · *Returns & Orders* · *Cart* with
  item count). Hamburger "All" mega-menu with department/ category tree. Hero/focus sections,
  product carousels ("Inspired by your browsing history"), Best Sellers & Deals lanes.
- **Search results**: filter pills across the top; left refinement rail (department, price range,
  rating, Prime-eligible, free shipping, availability, "deal" flags); sort menu (Featured, Price
  low–high, high–low, Avg. Customer Review, Newest, Best Sellers); product cards with image,
  title, ★rating+count, price (strike-through list price, deal badge), "Only X left in stock",
  Prime badge; sponsored/ad placements (skim).
- **Category browse**: department landing pages / browse tree, Best Sellers page per category.
- **Recommendation lanes** (customers-also-viewed, frequently-bought-together) — markup only,
  rule-based.

### B. Product Detail Page (PDP)
- Title, brand link, ★ rating + "N ratings", price block (deal badge / list-price strike),
  buy box: variant selectors (size/color/flavor), quantity stepper, **Add to Cart**, **Buy Now**
  (one-click ordering gate), Prime delivery estimate, "Ships from / Sold by", "Only X left".
- Below the fold: "About this item" bullets, product info/category table, **reviews** (rating
  histogram with star breakdown, written reviews with verified-purchase badge), "Customers say"
  summary, customer questions, related-product carousels, bestseller rank.

### C. Transactions (write-heavy)
- **Cart**: line items (thumbnail, title link, price, sold-by), qty stepper (cap at stock), delete,
  "in stock / only X left" warnings, **Saved for later**, subtotal, **Proceed to checkout**.
- **Checkout**: own stripped header (progress steps); **sign-in gate**; enter/select shipping
  address; shipping method (standard/expedited/Prime 2-day with ETA + price); payment method
  (saved cards / add card incl. fake billing); **review & place order** with order summary
  (Subtotal + Shipping + Tax = Total); **order confirmation** (order number, delivery estimate,
  track/buy-again links, Continue Shopping). One-way click flow, like Amazon.
- **Your Orders**: status cards (Pending/Shipped/Delivered/Cancelled), track, buy again, return/
  refund (mock), order detail with itemized invoice summary.

### D. Accounts
- **Sign up / Sign in** (email+password), persistent session, account menu ("Your Account",
  "Your Orders", "Your Lists", Sign out). Saved addresses and payment methods for fast checkout.

### E. Reviews subsystem
- Post-purchase: star rating + written review, verified-purchase badge, computed average + count.

## Explicitly out of scope (deferred, named for honesty)
Marketplace/seller tools, warehouses/fulfillment, real payment gateway (simulated sandbox),
Prime membership entitlement logic, subscriptions, coupons/lightning-deal countdowns, gift
wrapping, live-chat support, and the 2026 "Alexa for Shopping" AI chat layer. Recommendations are
rule-based, no personalization.

## Critical design invariants learned (carry into the build)
- Cart is **advisory**: always re-validate price + stock at checkout, never trust cart line prices.
- Inventory: soft reservation at checkout; decrement only on confirmed order; guard for
  overselling ("Only X left" hints are approximate).
- Orders are an explicit **state machine** (pending→processing/confirmed→shipped→delivered /
  cancelled); idempotent placement (client-generated order key) so double-clicks can't double-order.
- Two worlds: discovery (tolerates staleness, cheap) vs. transactions (must be correct).

## Sources
- Amazon Customer Service — "Searching and Browsing for Items" (amazon.com/gp/help, nodeId
  GSUNWNFT2ALMPR3L); "How to Place an Order" (nodeId TM0z2tvxdI4nu36ypt).
- Cristea George, "From Search to Checkout: Wireframing the Amazon Shopping Flow" (Medium,
  2026-05-17) — screen-by-screen happy-path inventory.
- TheUXMentor, "Why Amazon Makes Buying Feel So Easy — a UX Breakdown" (2026-08-19) — 2026 UX
  priorities (search = real home screen, review trust, transparent checkout).
- Amalytix, "Alexa for Shopping (formerly Amazon Rufus) 2026" — 2026 AI-layer touchpoints
  (recorded for completeness; out of scope).
- SpaceComplexity "Design Amazon's E-Commerce Platform" + Techinterview system design guides —
  cart re-validation, inventory reservation, order state machine invariants above.
- Direct attempts: amazon.com → captcha/empty; /s?k= → 503; /gp/help → 403.