import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../lib/mongoose";
import { ProductModel, ReviewModel } from "../lib/models";

type SeedVariant = {
  label: string;
  sku: string;
  priceCents: number;
  listPriceCents?: number;
  stock: number;
  images: string[];
};

type SeedProduct = {
  slug: string;
  title: string;
  brand: string;
  description: string;
  bullets: string[];
  categoryPath: string[];
  images: string[];
  ratingAvg: number;
  ratingCount: number;
  boughtInPastMonth: number;
  bestsellerRank: string;
  isAmazonBrand: boolean;
  variants: SeedVariant[];
  primeEligible: boolean;
  freeReturns: boolean;
  carbonImpact: "Low" | "Moderate" | "High";
  seller: string;
};

const img = (seed: string) => `https://picsum.photos/seed/${seed}/400/400`;
const imgs = (seed: string, n: number) =>
  Array.from({ length: n }, (_, i) => img(`${seed}-${i}`));

const sure = <T,>(v: T | undefined, label: string): T => {
  if (v === undefined) throw new Error(`missing required seed field: ${label}`);
  return v;
};

type SeedProductInput = Omit<
  SeedProduct,
  "images" | "primeEligible" | "freeReturns" | "carbonImpact" | "seller" | "bullets" | "bestsellerRank" | "isAmazonBrand"
> &
  Partial<Pick<SeedProduct, "bullets" | "bestsellerRank" | "isAmazonBrand">>;

const P = (p: SeedProductInput): SeedProduct => ({
  images: imgs(p.slug, 4),
  bullets: [
    "Engineered for reliable everyday performance.",
    "Backed by a 1-year warranty and free returns.",
  ],
  primeEligible: true,
  freeReturns: true,
  carbonImpact: "Low",
  seller: "Amazon.com",
  bestsellerRank: p.bestsellerRank ?? "",
  isAmazonBrand: p.isAmazonBrand ?? false,
  ...p,
});

const seedProducts: SeedProduct[] = [
  // ------ Electronics (flagship mirrors the SERP screenshot) ------
  P({
    slug: "fire-tv-stick-4k-max",
    title:
      "Amazon Fire TV Stick 4K Max (newest model), streaming device, with AI-powered Fire TV Search, supports Wi-Fi 6E, free & live TV without cable or satellite, find shows faster with Alexa",
    brand: "Amazon",
    description:
      "The fastest Fire TV Stick ever — 40% more power. Stream in 4K Ultra HD, Dolby Vision, HDR10+. Search across apps with AI-powered Fire TV Search and control your TV with Alexa voice remote.",
    bullets: [
      "40% more power than the previous Fire TV Stick 4K Max.",
      "4K Ultra HD, Dolby Vision, HDR10+, HLG streaming.",
      "AI-powered Fire TV Search to find shows across apps.",
      "Wi-Fi 6E support for smoother streaming.",
      "Alexa voice remote with dedicated volume controls.",
    ],
    categoryPath: ["Electronics", "Streaming Media Players"],
    ratingAvg: 4.6,
    ratingCount: 82900,
    boughtInPastMonth: 10000,
    bestsellerRank: "#1 Best Seller in Streaming Media Players",
    isAmazonBrand: true,
    variants: [
      {
        label: "Fire TV Stick 4K Max",
        sku: "FTV-4KMAX-BASE",
        priceCents: 8499,
        listPriceCents: 8999,
        stock: 320,
        images: [img("ftv-4kmax")],
      },
      {
        label: "Fire TV Stick 4K Max with Alexa Voice Remote Pro",
        sku: "FTV-4KMAX-PRO",
        priceCents: 9999,
        stock: 180,
        images: [img("ftv-4kmax-pro")],
      },
      {
        label: "Fire TV Stick 4K Max (Renewed)",
        sku: "FTV-4KMAX-RENEW",
        priceCents: 6999,
        stock: 95,
        images: [img("ftv-4kmax-renewed")],
      },
    ],
  }),
  P({
    slug: "fire-tv-stick-4k-plus",
    title:
      "Amazon Fire TV Stick 4K Plus (newest model) with AI-powered Fire TV Search, Wi-Fi 6, stream hundreds of free channels",
    brand: "Amazon",
    description:
      "Upgrade your TV with 4K streaming, Wi-Fi 6, and an enhanced Alexa Voice Remote with app control for compatible Fire TV Edition soundbars.",
    categoryPath: ["Electronics", "Streaming Media Players"],
    ratingAvg: 4.7,
    ratingCount: 41205,
    boughtInPastMonth: 8000,
    isAmazonBrand: true,
    variants: [
      { label: "4K Plus", sku: "FTV-4KPLUS", priceCents: 7499, listPriceCents: 8499, stock: 210, images: [img("ftv-4kplus")] },
    ],
  }),
  P({
    slug: "kindle-paperwhite-16gb",
    title: "Kindle Paperwhite (16 GB) — 7\" display, adjustable warm light, water-resistant, wireless charging",
    brand: "Amazon",
    description:
      "Our best-ever Paperwhite: larger 6.8\" display, months of battery life, and warm light that protects your eyes at night.",
    categoryPath: ["Electronics", "Kindle E-readers"],
    ratingAvg: 4.7,
    ratingCount: 34412,
    boughtInPastMonth: 3200,
    isAmazonBrand: true,
    variants: [
      { label: "16 GB, Black", sku: "KINDLE-PW16-BLK", priceCents: 14999, stock: 140, images: [img("pw16-black")] },
      { label: "16 GB, Agave Green", sku: "KINDLE-PW16-GRN", priceCents: 14999, stock: 96, images: [img("pw16-green")] },
    ],
  }),
  P({
    slug: "echo-dot-5th-gen",
    title: 'Echo Dot (5th Gen, 2025 release) | Smart speaker with Alexa | Charcoal',
    brand: "Amazon",
    description:
      "Our most popular smart speaker with bigger sound, motion/temperature sensing, and built-in Alexa — perfect for any room.",
    categoryPath: ["Electronics", "Smart Speakers"],
    ratingAvg: 4.6,
    ratingCount: 56110,
    boughtInPastMonth: 9500,
    isAmazonBrand: true,
    variants: [
      { label: "Charcoal", sku: "ECHO-DOT5-CHAR", priceCents: 4999, listPriceCents: 5999, stock: 400, images: [img("echo5-char")] },
      { label: "Deep Sea Blue", sku: "ECHO-DOT5-BLUE", priceCents: 4999, listPriceCents: 5999, stock: 260, images: [img("echo5-blue")] },
    ],
  }),
  P({
    slug: "logitech-pebble-mouse",
    title: "Logitech Pebble 2 M350s Wireless Mouse with Bluetooth, quiet click, USB-C — Sand",
    brand: "Logitech",
    description:
      "A minimal, silent, comfortable wireless mouse that lives happily in your pocket or bag. Up to 24 months of battery.",
    categoryPath: ["Electronics", "Computer Accessories"],
    ratingAvg: 4.5,
    ratingCount: 18200,
    boughtInPastMonth: 4100,
    variants: [
      { label: "Sand", sku: "LOGI-PEBBLE-SAND", priceCents: 3299, stock: 340, images: [img("pebble-sand")] },
      { label: "Graphite", sku: "LOGI-PEBBLE-GRAPH", priceCents: 3299, stock: 300, images: [img("pebble-graph")] },
    ],
  }),

  // ------ Home & Kitchen ------
  P({
    slug: "stanley-quencher-tumbler",
    title: "Stanley Quencher H2.0 FlowState Tumbler 40 oz, Twist & Pour lid, Straw, Insulated Stainless Steel — Rose Quartz",
    brand: "Stanley",
    description:
      "Legendary durability and ice-cold performance for a full day. Leak-resistant twist-and-pour lid, comfortable handle, dishwasher safe.",
    categoryPath: ["Home & Kitchen", "Drinkware"],
    ratingAvg: 4.8,
    ratingCount: 30250,
    boughtInPastMonth: 6200,
    variants: [
      { label: "Rose Quartz 40 oz", sku: "STAN-Q40-ROSE", priceCents: 4500, listPriceCents: 6500, stock: 220, images: [img("stanley-rose")] },
      { label: "Black 40 oz", sku: "STAN-Q40-BLK", priceCents: 4500, listPriceCents: 6500, stock: 240, images: [img("stanley-black")] },
      { label: "Forest 30 oz", sku: "STAN-Q30-FOREST", priceCents: 3500, stock: 150, images: [img("stanley-forest")] },
    ],
  }),
  P({
    slug: "instant-pot-duo-6qt",
    title: "Instant Pot Duo 7-in-1 Electric Pressure Cooker, 6 Quart, 14 One-Touch Programs — Stainless Steel",
    brand: "Instant Pot",
    description:
      "Soups, stews, rice, beans and more — 7 appliances in one. Sauté, slow cook, pressure cook, and keep warm at the touch of a button.",
    categoryPath: ["Home & Kitchen", "Cookware"],
    ratingAvg: 4.7,
    ratingCount: 98740,
    boughtInPastMonth: 5300,
    variants: [
      { label: "6 Quart", sku: "IP-DUO-6QT", priceCents: 8999, listPriceCents: 11999, stock: 180, images: [img("ipduo-6qt")] },
      { label: "8 Quart", sku: "IP-DUO-8QT", priceCents: 10999, stock: 90, images: [img("ipduo-8qt")] },
    ],
  }),
  P({
    slug: "bissell-little-green",
    title: "BISSELL Little Green Multi-Purpose Portable Carpet & Upholstery Cleaner — 1400B",
    brand: "Bissell",
    description:
      "Remove fresh stains and set-in spots from carpets, stairs, upholstery, and auto interiors with the portable little green machine.",
    categoryPath: ["Home & Kitchen", "Vacuum Cleaners"],
    ratingAvg: 4.5,
    ratingCount: 71220,
    boughtInPastMonth: 4800,
    variants: [
      { label: "1400B", sku: "BISS-LG-1400B", priceCents: 12399, listPriceCents: 14499, stock: 130, images: [img("bissell-lg")] },
    ],
  }),

  // ------ Books ------
  P({
    slug: "atomic-habits",
    title: "Atomic Habits: An Easy & Proven Way to Build Good Habits & Break Bad Ones",
    brand: "Avery",
    description:
      "The #1 New York Times bestseller. Tiny changes, remarkable results — James Clear's ground-breaking guide to habit design.",
    categoryPath: ["Books", "Self-Help"],
    ratingAvg: 4.8,
    ratingCount: 182300,
    boughtInPastMonth: 9000,
    bestsellerRank: "#1 Best Seller in Personal Transformation",
    variants: [
      { label: "Hardcover", sku: "BK-ATOMIC-HB", priceCents: 1799, listPriceCents: 2799, stock: 600, images: [img("atomic-hb")] },
      { label: "Paperback", sku: "BK-ATOMIC-PB", priceCents: 1299, stock: 800, images: [img("atomic-pb")] },
      { label: "Kindle Edition", sku: "BK-ATOMIC-KINDLE", priceCents: 1199, stock: 100000, images: [img("atomic-kindle")] },
    ],
  }),
  P({
    slug: "the-psychology-of-money",
    title: "The Psychology of Money: Timeless lessons on wealth, greed, and happiness",
    brand: "Harriman House",
    description:
      "Morgan Housel shares 19 short stories exploring the strange ways people think about money and how to make better financial decisions.",
    categoryPath: ["Books", "Business"],
    ratingAvg: 4.7,
    ratingCount: 112400,
    boughtInPastMonth: 6400,
    variants: [
      { label: "Hardcover", sku: "BK-PSYCM-HB", priceCents: 1699, listPriceCents: 2699, stock: 500, images: [img("psyc-hb")] },
      { label: "Paperback", sku: "BK-PSYCM-PB", priceCents: 1199, stock: 700, images: [img("psyc-pb")] },
    ],
  }),
  P({
    slug: "better-relationship-with-food",
    title: "Better Relationship with Food: A mindful approach to eating well — 60+ recipes",
    brand: "Ten Speed Press",
    description:
      "A friendly, judgment-free guide to intuitive eating with approachable recipes that celebrate food, not restriction.",
    categoryPath: ["Books", "Health & Fitness"],
    ratingAvg: 4.6,
    ratingCount: 9900,
    boughtInPastMonth: 1100,
    variants: [
      { label: "Paperback", sku: "BK-MINDFOOD-PB", priceCents: 2299, stock: 260, images: [img("mindfood-pb")] },
    ],
  }),

  // ------ Fashion ------
  P({
    slug: "carhartt-beanie",
    title: "Carhartt Men's Knit Cuffed Beanie — Ripstop Battery, Acrylic, One Size",
    brand: "Carhartt",
    description:
      "Knit cuffed beanie that keeps its shape wear after wear. The classic, durable everyday hat built to work.",
    categoryPath: ["Fashion", "Men's Hats"],
    ratingAvg: 4.7,
    ratingCount: 38500,
    boughtInPastMonth: 5200,
    variants: [
      { label: "Black", sku: "CARH-BEANIE-BLK", priceCents: 1599, stock: 900, images: [img("carh-blk")] },
      { label: "Carhartt Brown", sku: "CARH-BEANIE-BRN", priceCents: 1599, stock: 750, images: [img("carh-brn")] },
      { label: "Navy", sku: "CARH-BEANIE-NVY", priceCents: 1599, stock: 600, images: [img("carh-nvy")] },
    ],
  }),
  P({
    slug: "nike-running-shirt",
    title: "Nike Dri-FIT Legend Men's Short-Sleeve Training Top",
    brand: "Nike",
    description:
      "Stay cool and dry through every rep with sweat-wicking Dri-FIT fabric and a relaxed, gym-ready fit.",
    categoryPath: ["Fashion", "Men's Activewear"],
    ratingAvg: 4.6,
    ratingCount: 15400,
    boughtInPastMonth: 3100,
    variants: [
      { label: "Outer Banks Blue, M", sku: "NIKE-DRFIT-M-BLU", priceCents: 2800, listPriceCents: 3500, stock: 320, images: [img("nike-m-blue")] },
      { label: "Black, L", sku: "NIKE-DRFIT-L-BLK", priceCents: 2800, listPriceCents: 3500, stock: 290, images: [img("nike-l-blk")] },
    ],
  }),
  P({
    slug: "unisex-thermal-shacket",
    title: "CARVD Cockpit Unisex Heathered Thermal Shacket — Oversized Fleece-Lined Over-Shirt",
    brand: "CARVD",
    description:
      "The cozy heavy-weight shacket that earned 200k+ 5-star reviews. Fleece-lined, oversized, four-pocket warmth for any outfit.",
    categoryPath: ["Fashion", "Women's Coats & Jackets"],
    ratingAvg: 4.5,
    ratingCount: 204500,
    boughtInPastMonth: 8700,
    variants: [
      { label: "Charcoal Heather, S/M", sku: "CARVD-SHACK-CHAR", priceCents: 6999, listPriceCents: 7999, stock: 410, images: [img("carvd-char")] },
      { label: "Army Green, M/L", sku: "CARVD-SHACK-ARMY", priceCents: 6999, listPriceCents: 7999, stock: 380, images: [img("carvd-army")] },
    ],
  }),

  // ------ Toys & Games ------
  P({
    slug: "sour-patch-kids",
    title: "Sour Patch Kids Soft & Chewy Candy, 11 lb Bulk Box",
    brand: "Sour Patch Kids",
    description:
      "SOUR. SWEET. GONE. A bulk 11 lb box of the classic fruity candy with a soft, chewy texture and sour-sugar burst.",
    categoryPath: ["Toys & Games", "Candy & Sweets"],
    ratingAvg: 4.8,
    ratingCount: 24100,
    boughtInPastMonth: 3900,
    variants: [
      { label: "11 lb Bulk Box", sku: "SPK-BULK-11LB", priceCents: 4999, listPriceCents: 6399, stock: 150, images: [img("spk-11lb")] },
      { label: "3.6 lb Box", sku: "SPK-BOX-3LB", priceCents: 2199, stock: 260, images: [img("spk-3lb")] },
    ],
  }),
  P({
    slug: "brachs-autumn-mix",
    title: "Brach's Autumn Mix Candy, 20 oz Bag — Candy Corn, Harvest Chews, Mellowcreme",
    brand: "Brach's",
    description:
      "A fall favorite mix of mellowcreme candy corn and rich caramelly harvest chews. Perfect for seasonal treats.",
    categoryPath: ["Toys & Games", "Candy & Sweets"],
    ratingAvg: 4.6,
    ratingCount: 9800,
    boughtInPastMonth: 2100,
    variants: [
      { label: "20 oz Bag", sku: "BRACHS-AUTUMN-20", priceCents: 798, stock: 480, images: [img("brachs-autumn")] },
    ],
  }),
  P({
    slug: "lego-botanical-roses",
    title: "LEGO Icons Botanical Collection Roses Bouquet to Flower Building Set — 939 Pieces",
    brand: "LEGO",
    description:
      "Build two long-stemmed LEGO roses and finish them with flower accents you can thread along the stems. A forever bouquet.",
    categoryPath: ["Toys & Games", "Building Toys"],
    ratingAvg: 4.8,
    ratingCount: 18600,
    boughtInPastMonth: 2700,
    variants: [
      { label: "939 Pieces", sku: "LEGO-ROSE-939", priceCents: 2499, listPriceCents: 2999, stock: 210, images: [img("lego-rose")] },
    ],
  }),
];

const seedReviews: Array<{
  productSlug: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  helpful: number;
}> = [
  {
    productSlug: "fire-tv-stick-4k-max",
    userName: "Sarah M.",
    rating: 5,
    title: "Snappy and easy to set up",
    body: "Set up in under five minutes and it's noticeably faster than my old Fire Stick. Alexa Search finds things across Netflix and Prime in one go.",
    helpful: 214,
  },
  {
    productSlug: "fire-tv-stick-4k-max",
    userName: "Devon R.",
    rating: 4,
    title: "Great for a bedroom TV",
    body: "4K picture is beautiful and Wi-Fi 6E hasn't dropped a stream yet. Taking one star off because the remote is a hair too small for my hands.",
    helpful: 97,
  },
  {
    productSlug: "fire-tv-stick-4k-max",
    userName: "Priya K.",
    rating: 5,
    title: "Strong upgrade over 4K (generation before)",
    body: "Everything is instant. Voice controls work well even with background noise. Free channels are a nice bonus.",
    helpful: 63,
  },
  {
    productSlug: "fire-tv-stick-4k-max",
    userName: "James T.",
    rating: 4,
    title: "Solid, unless your TV lacks HDMI",
    body: "Works perfectly on my 2021 Samsung. Just confirm your TV has an HDMI port before ordering — my older spare didn't!",
    helpful: 41,
  },
  {
    productSlug: "fire-tv-stick-4k-max",
    userName: "Ayesha N.",
    rating: 5,
    title: "No buffering on 200Mbps",
    body: "Streams 4K with zero buffering. The USB-C power cable is braided and generous length too.",
    helpful: 22,
  },
  {
    productSlug: "stanley-quencher-tumbler",
    userName: "Liam B.",
    rating: 5,
    title: "Ice still there next morning",
    body: "Went to bed with Ice Cubes, woke up to ice cubes. The lid truly doesn't leak in a bag. Worth the hype.",
    helpful: 88,
  },
  {
    productSlug: "stanley-quencher-tumbler",
    userName: "Maya D.",
    rating: 4,
    title: "Beautiful but heavy",
    body: "Gorgeous color and keeps drinks cold all day. It's genuinely heavy when full, so keep that in mind for a commute.",
    helpful: 54,
  },
  {
    productSlug: "atomic-habits",
    userName: "Omar S.",
    rating: 5,
    title: "The framework actually sticks",
    body: "Read it slowly, applied the 1% rule, and my morning routine finally changed. Everyone should read this.",
    helpful: 302,
  },
  {
    productSlug: "carhartt-beanie",
    userName: "Zain A.",
    rating: 5,
    title: "Exactly the classic beanie",
    body: "Fits great, warm without being itchy, and the cuff stays put. Been wearing it all winter.",
    helpful: 76,
  },
  {
    productSlug: "lego-botanical-roses",
    userName: "Hiba F.",
    rating: 5,
    title: "Gift that kept them guessing",
    body: "Bought for a friend who hates clutter. It sits on their shelf and people always touch it to check it's real.",
    helpful: 48,
  },
];

async function main() {
  await connectDB();

  console.log("Wiping product/review collections...");
  await Promise.all([
    ProductModel.deleteMany({}),
    ReviewModel.deleteMany({}),
  ]);

  const products = (await ProductModel.insertMany(
    seedProducts as unknown as SeedProduct[]
  )) as unknown as Array<{ _id: unknown; slug: string }>;
  console.log(`Inserted ${products.length} products`);

  const productSlugById = new Map<string, string>();
  for (const p of products) productSlugById.set(p.slug, String(p._id));

  const reviews = seedReviews.map((r) => {
    const productId = sure(productSlugById.get(r.productSlug), `review target ${r.productSlug}`);
    return {
      product: productId,
      user: new mongoose.Types.ObjectId(),
      userName: r.userName,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verifiedPurchase: true,
      helpfulCount: r.helpful,
    };
  });
  await ReviewModel.insertMany(reviews);
  console.log(`Inserted ${reviews.length} reviews`);

  const totalVariants = seedProducts.reduce((n, p) => n + p.variants.length, 0);
  console.log(
    `Seed complete — ${products.length} products, ${totalVariants} variants across ${new Set(seedProducts.map((p) => p.categoryPath[0])).size} departments`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});