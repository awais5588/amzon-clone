export const dynamic = "force-dynamic";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-white">
        <div className="max-w-[1100px] mx-auto px-3 py-2 text-[13px] text-faint">
          Amazon {`>`} <span className="font-semibold text-muted line-through">Your Cart</span>{" "}
          {`>`} <span className="font-semibold text-headline">Secure Checkout</span>
        </div>
      </div>
      <div className="max-w-[1100px] mx-auto px-3 py-8">
        <div className="bg-card rounded-sm shadow-sm p-8 text-center">
          <h1 className="text-2xl font-medium text-headline">Checkout</h1>
          <p className="text-sm text-muted mt-2">
            The full checkout flow — address, payment, and place-order — lands in the next phase.
          </p>
          <a
            href="/cart"
            className="inline-block mt-4 text-[13px] text-link hover:text-link-hover hover:underline"
          >
            ← Return to cart
          </a>
        </div>
      </div>
    </div>
  );
}