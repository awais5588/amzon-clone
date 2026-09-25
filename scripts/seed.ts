import { createHash } from "node:crypto";
import { access } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import type { Types } from "mongoose";

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

type ProductInput = Omit<
  SeedProduct,
  "images" | "ratingAvg" | "ratingCount" | "boughtInPastMonth" | "bestsellerRank" | "isAmazonBrand" | "primeEligible" | "freeReturns" | "carbonImpact" | "seller"
>;

type VariantRow = SeedVariant & { reserved?: number };
type MigratedVariant = SeedVariant & { reserved: number };
type MigratedProduct = Omit<SeedProduct, "variants"> & { variants: MigratedVariant[] };

type ProductRow = Omit<SeedProduct, "variants"> & {
  _id: Types.ObjectId;
  variants: VariantRow[];
  createdAt: Date;
  updatedAt: Date;
};

type OrderItemRow = {
  product: Types.ObjectId;
  variantSku: string;
  title: string;
  image: string;
  qty: number;
  unitPriceCents: number;
};

type OrderRow = {
  _id: Types.ObjectId;
  orderKey: string;
  items: OrderItemRow[];
  [key: string]: unknown;
};

type CartItemRow = {
  product: Types.ObjectId;
  variantSku: string;
};

type CartRow = {
  _id: Types.ObjectId;
  items: CartItemRow[];
  saved: CartItemRow[];
  [key: string]: unknown;
};

type ReviewRow = {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  user: Types.ObjectId;
  verifiedPurchase: boolean;
  [key: string]: unknown;
};

type UserRow = {
  _id: Types.ObjectId;
  [key: string]: unknown;
};

type DatabaseSnapshot = {
  products: ProductRow[];
  orders: OrderRow[];
  carts: CartRow[];
  reviews: ReviewRow[];
  users: UserRow[];
};

type MigrationModels = typeof import("../lib/models");

type PreservedVariantState = {
  slug: string;
  sku: string;
  stock: number;
  reserved: number;
};

type PreservedProductState = {
  slug: string;
  id: string;
  createdAt: Date;
};

type MigrationPlan = {
  migratedProducts: MigratedProduct[];
  productUpdates: MigratedProduct[];
  insertedSlugs: string[];
  updatedSlugs: string[];
  unchangedSlugs: string[];
  removedProductIds: string[];
  reviewsToDelete: string[];
  reviewIdsToUnverify: string[];
  preservedVariants: PreservedVariantState[];
  preservedProducts: PreservedProductState[];
};

type IntegrityFingerprint = {
  orders: string;
  carts: string;
  users: string;
  protectedProduct: string;
  protectedReviews: string;
};

type Reference = {
  source: string;
  productId: string;
  variantSku: string;
};

const protectedProductId = "6ab66118198564b695544c9b";
const protectedOrderKey = "3ddc8fbd-772b-459e-a183-d6006f54d5dc";
const protectedSlug = "unisex-thermal-shacket";
const protectedImage = "https://picsum.photos/seed/carvd-char/400/400";

const localImage = (slug: string, extension: "jpg" | "png" | "webp") =>
  `/images/catalog/${slug}/primary.${extension}`;

const P = (input: ProductInput): SeedProduct => {
  const primaryImage = input.variants[0]?.images[0];
  if (!primaryImage) throw new Error(`missing primary image for ${input.slug}`);
  return {
    ...input,
    images: [primaryImage],
    ratingAvg: 0,
    ratingCount: 0,
    boughtInPastMonth: 0,
    bestsellerRank: "",
    isAmazonBrand: input.brand === "Amazon",
    primeEligible: false,
    freeReturns: false,
    carbonImpact: "Moderate",
    seller: "",
  };
};

const catalogProducts: SeedProduct[] = [
  P({
    slug: "fire-tv-stick-4k-max",
    title: "Amazon Fire TV Stick 4K Max (2nd Gen) streaming media player with Wi-Fi 6E, Alexa Voice Remote, Dolby Vision and HDR10+",
    brand: "Amazon",
    description:
      "A compact 4K streaming stick with Wi-Fi 6E, an Alexa Voice Remote and support for Dolby Vision and HDR10+ on compatible televisions and streaming services.",
    bullets: [
      "Streams 4K Ultra HD content with Dolby Vision and HDR10+ support on compatible devices.",
      "Wi-Fi 6E support for compatible home networks.",
      "Alexa Voice Remote includes dedicated power, volume and mute controls.",
      "Compact streaming stick with a low-profile HDMI design.",
    ],
    categoryPath: ["Electronics", "Streaming Media Players"],
    variants: [
      {
        label: "Fire TV Stick 4K Max",
        sku: "FTV-4KMAX-BASE",
        priceCents: 4999,
        listPriceCents: 5999,
        stock: 320,
        images: [localImage("fire-tv-stick-4k-max", "jpg")],
      },
      {
        label: "Fire TV Stick 4K Max with Alexa Voice Remote Pro",
        sku: "FTV-4KMAX-PRO",
        priceCents: 6999,
        stock: 180,
        images: [localImage("fire-tv-stick-4k-max", "jpg")],
      },
      {
        label: "Fire TV Stick 4K Max (Renewed)",
        sku: "FTV-4KMAX-RENEW",
        priceCents: 2999,
        stock: 95,
        images: [localImage("fire-tv-stick-4k-max", "jpg")],
      },
    ],
  }),
  P({
    slug: "echo-dot-5th-gen",
    title: "Amazon Echo Dot (5th Gen) smart speaker with Alexa, Charcoal",
    brand: "Amazon",
    description:
      "The fifth-generation Echo Dot combines room-filling sound with built-in temperature sensing, motion detection and a microphone-off button.",
    bullets: [
      "Compact smart speaker with improved audio performance.",
      "Built-in temperature sensor can trigger Alexa routines.",
      "Motion detection can be used with compatible routines.",
      "Microphone-off button disconnects the microphones electronically.",
    ],
    categoryPath: ["Electronics", "Smart Speakers"],
    variants: [
      {
        label: "Charcoal",
        sku: "ECHO-DOT5-CHAR",
        priceCents: 4999,
        listPriceCents: 5999,
        stock: 400,
        images: [localImage("echo-dot-5th-gen", "jpg")],
      },
      {
        label: "Deep Sea Blue",
        sku: "ECHO-DOT5-BLUE",
        priceCents: 4999,
        listPriceCents: 5999,
        stock: 260,
        images: [localImage("echo-dot-5th-gen", "jpg")],
      },
    ],
  }),
  P({
    slug: "anker-735",
    title: "Anker 735 Charger (Nano II 65W) compact fast-charging wall charger with three ports",
    brand: "Anker",
    description:
      "A compact three-port wall charger with one USB-C port and two USB-A ports, designed for phones, tablets, laptops and other compatible devices.",
    bullets: [
      "Rated up to 65W total output when connected to compatible devices.",
      "One USB-C port and two USB-A ports.",
      "PowerIQ technology adapts output to supported connected devices.",
      "Compact charger with a foldable three-pin plug.",
    ],
    categoryPath: ["Electronics", "Chargers & Power Adapters"],
    variants: [
      {
        label: "65W, Three Port",
        sku: "ANKER-735-65W",
        priceCents: 3999,
        listPriceCents: 4999,
        stock: 150,
        images: [localImage("anker-735", "png")],
      },
    ],
  }),
  P({
    slug: "logitech-pebble-mouse",
    title: "Logitech Pebble 2 M350s Silent Wireless Mouse with Bluetooth, USB-C charging and multi-device switching, Sand",
    brand: "Logitech",
    description:
      "A slim, low-noise wireless mouse designed for everyday use, with a quiet-click build, portable form and Easy-Switch device control.",
    bullets: [
      "Silent-click design for quieter use in shared spaces.",
      "Connects with Bluetooth and Logi Bolt where supported.",
      "Easy-Switch lets one mouse move between multiple devices.",
      "USB-C charging with up to 24 months of stated battery life.",
    ],
    categoryPath: ["Electronics", "Computer Accessories"],
    variants: [
      {
        label: "Sand",
        sku: "LOGI-PEBBLE-SAND",
        priceCents: 3299,
        stock: 340,
        images: [localImage("logitech-pebble-mouse", "png")],
      },
      {
        label: "Graphite",
        sku: "LOGI-PEBBLE-GRAPH",
        priceCents: 3299,
        stock: 300,
        images: [localImage("logitech-pebble-mouse", "png")],
      },
    ],
  }),
  P({
    slug: "logitech-mx-keys-s",
    title: "Logitech MX Keys S wireless illuminated keyboard for Mac, low profile, Bluetooth and Bolt, Graphite",
    brand: "Logitech",
    description:
      "A low-profile wireless keyboard with smart backlighting, multi-device switching and a layout designed for macOS.",
    bullets: [
      "Smart illumination brightens when the hands approach and dims after inactivity.",
      "Switches among up to three compatible devices.",
      "Low-profile scissor keys travel within a laptop-sized footprint.",
      "Rechargeable USB-C keyboard with Bluetooth and Logi Bolt connectivity.",
    ],
    categoryPath: ["Electronics", "Computer Accessories"],
    variants: [
      {
        label: "Graphite, Mac Layout",
        sku: "LOGI-MX-KEYS-S-GRAPHITE-MAC",
        priceCents: 9999,
        stock: 90,
        images: [localImage("logitech-mx-keys-s", "png")],
      },
    ],
  }),
  P({
    slug: "logitech-mx-master-3s",
    title: "Logitech MX Master 3S wireless performance mouse, quiet clicks, MagSpeed wheel, USB-C, Graphite",
    brand: "Logitech",
    description:
      "An ergonomic wireless productivity mouse with an electromagnetic scroll wheel, quiet clicks and sensitivity controls for compatible workflows.",
    bullets: [
      "MagSpeed electromagnetic wheel supports fast, precise scrolling.",
      "Quiet mechanical clicks reduce noise without changing the button layout.",
      "Tracks on surfaces compatible with the included sensor.",
      "USB-C quick charging and multi-device switching.",
    ],
    categoryPath: ["Electronics", "Computer Accessories"],
    variants: [
      {
        label: "Graphite",
        sku: "LOGI-MX-MASTER-3S-GRAPHITE",
        priceCents: 9999,
        stock: 130,
        images: [localImage("logitech-mx-master-3s", "png")],
      },
    ],
  }),
  P({
    slug: "samsung-t7-shield",
    title: "Samsung T7 Shield 1TB portable SSD, USB 3.2 Gen 2, IP65, black",
    brand: "Samsung",
    description:
      "A compact ruggedized portable solid-state drive with a rubberized exterior and USB 3.2 Gen 2 connectivity for compatible devices.",
    bullets: [
      "1TB portable SSD for files, projects and backups.",
      "Sequential read speed up to 1,050 MB/s and write speed up to 1,000 MB/s on compatible systems.",
      "IP65 rating for resistance to dust and water under specified conditions.",
      "Works with compatible USB-C and USB-A host devices.",
    ],
    categoryPath: ["Electronics", "Storage"],
    variants: [
      {
        label: "1TB, Black",
        sku: "SAM-T7-SHIELD-1TB-BLK",
        priceCents: 10999,
        listPriceCents: 12999,
        stock: 100,
        images: [localImage("samsung-t7-shield", "png")],
      },
    ],
  }),
  P({
    slug: "instant-pot-duo-6qt",
    title: "Instant Pot Duo 7-in-1 electric pressure cooker, 6 quart, stainless steel",
    brand: "Instant Pot",
    description:
      "A programmable 6-quart pressure cooker that combines pressure cooking, slow cooking, sautéing, rice cooking, steaming, warming and automatic keep-warm functions.",
    bullets: [
      "Six-quart stainless-steel cooking pot with pressure-cooking lid.",
      "Fourteen one-touch programs for common cooking tasks.",
      "Manual controls for pressure level and keep-warm mode.",
      "Handles cooking stages from sauté through pressure cook or slow cook.",
    ],
    categoryPath: ["Home & Kitchen", "Cookware"],
    variants: [
      {
        label: "6 Quart",
        sku: "IP-DUO-6QT",
        priceCents: 8999,
        listPriceCents: 11999,
        stock: 180,
        images: [localImage("instant-pot-duo-6qt", "png")],
      },
      {
        label: "8 Quart",
        sku: "IP-DUO-8QT",
        priceCents: 10999,
        stock: 90,
        images: [localImage("instant-pot-duo-6qt", "png")],
      },
    ],
  }),
  P({
    slug: "ninja-af141",
    title: "Ninja Air Fryer Pro 5-quart, 4-in-1 air fryer, roast, reheat and dehydrate, model AF141, black",
    brand: "Ninja",
    description:
      "A five-quart countertop air fryer with four cooking functions: Air Fry, Roast, Reheat and Dehydrate.",
    bullets: [
      "Five-quart basket capacity for compatible foods.",
      "Air Fry, Roast, Reheat and Dehydrate cooking functions.",
      "Nonstick basket and crisper plate are dishwasher safe.",
      "Model AF141 includes a five-quart basket and crisper plate.",
    ],
    categoryPath: ["Home & Kitchen", "Air Fryers"],
    variants: [
      {
        label: "5 Quart, Black",
        sku: "NINJA-AF141-5QT-BLK",
        priceCents: 8999,
        listPriceCents: 11999,
        stock: 60,
        images: [localImage("ninja-af141", "jpg")],
      },
    ],
  }),
  P({
    slug: "cuisinart-34c-12bk",
    title: "Cuisinart Culinary Collection 12-piece ceramic nonstick cookware set, model 34C-12BK, black",
    brand: "Cuisinart",
    description:
      "A twelve-piece ceramic nonstick cookware set with stainless-steel handles, glass covers, bamboo utensils and a lid organizer.",
    bullets: [
      "Includes 2.5-quart saucepan, 3.5-quart sauté pan and 6-quart stockpot with covers.",
      "Includes 8-inch and 10-inch skillets, a lid organizer and three bamboo utensils.",
      "Ceramic nonstick cooking surfaces are designed for use with metal utensils.",
      "Compatible with all stovetops, including induction; dishwasher safe.",
    ],
    categoryPath: ["Home & Kitchen", "Cookware Sets"],
    variants: [
      {
        label: "12 Piece, Black",
        sku: "CUIS-34C-12BK",
        priceCents: 29995,
        stock: 85,
        images: [localImage("cuisinart-34c-12bk", "jpg")],
      },
    ],
  }),
  P({
    slug: "kitchenaid-artisan-5qt",
    title: "KitchenAid Artisan Series 5-quart tilt-head stand mixer, model KSM150PSER, Empire Red",
    brand: "KitchenAid",
    description:
      "A five-quart tilt-head stand mixer with a polished stainless-steel bowl, ten speed settings and a planetary mixing attachment.",
    bullets: [
      "Five-quart polished stainless-steel bowl with handle.",
      "Ten speed settings cover slow mixing through high-speed whipping.",
      "Planetary mixing action combines ingredients against the bowl and attachment.",
      "Tilt-head design provides access to the attachment and bowl.",
    ],
    categoryPath: ["Home & Kitchen", "Small Appliances"],
    variants: [
      {
        label: "5 Quart, Empire Red",
        sku: "KIT-ARTISAN-5QT-KSM150PSER",
        priceCents: 44999,
        stock: 35,
        images: [localImage("kitchenaid-artisan-5qt", "webp")],
      },
    ],
  }),
  P({
    slug: "bissell-little-green",
    title: "BISSELL Little Green multi-purpose portable carpet and upholstery cleaner, model 1400B",
    brand: "BISSELL",
    description:
      "A portable spot cleaner for carpet, upholstery and compatible auto surfaces, using a removable water tank and spray-extraction trigger.",
    bullets: [
      "Portable design for targeted carpet and upholstery cleaning.",
      "Removable tank and spray-extraction hose.",
      "Includes multiple cleaning attachments for different surfaces.",
      "Model 1400B is a separate-spot cleaner rather than a full-size carpet machine.",
    ],
    categoryPath: ["Home & Kitchen", "Carpet Cleaners"],
    variants: [
      {
        label: "Model 1400B",
        sku: "BISS-LG-1400B",
        priceCents: 15999,
        listPriceCents: 19999,
        stock: 130,
        images: [localImage("bissell-little-green", "png")],
      },
    ],
  }),
  P({
    slug: "stanley-quencher-tumbler",
    title: "Stanley Quencher H2.0 FlowState insulated tumbler, 40 oz, Purple Dust",
    brand: "Stanley",
    description:
      "A vacuum-insulated stainless-steel tumbler with a FlowState lid, reusable straw, handle and carry loop for everyday drinkware use.",
    bullets: [
      "Vacuum insulation helps keep drinks cold or hot during the day.",
      "FlowState lid has straw, drink and full-cover positions.",
      "Reusable straw and handle are included on the selected configuration.",
      "Available sizes in this catalog include 40-ounce and 30-ounce options.",
    ],
    categoryPath: ["Home & Kitchen", "Drinkware"],
    variants: [
      {
        label: "Purple Dust, 40 oz",
        sku: "STAN-Q40-ROSE",
        priceCents: 4500,
        listPriceCents: 6500,
        stock: 220,
        images: [localImage("stanley-quencher-tumbler", "png")],
      },
      {
        label: "Black, 40 oz",
        sku: "STAN-Q40-BLK",
        priceCents: 4500,
        listPriceCents: 6500,
        stock: 240,
        images: [localImage("stanley-quencher-tumbler", "png")],
      },
      {
        label: "Forest Green, 30 oz",
        sku: "STAN-Q30-FOREST",
        priceCents: 3500,
        stock: 150,
        images: [localImage("stanley-quencher-tumbler", "png")],
      },
    ],
  }),
  P({
    slug: "carhartt-beanie",
    title: "Carhartt Men's A18 knit cuffed beanie, navy, one size",
    brand: "Carhartt",
    description:
      "The A18 is a rib-knit cuffed beanie with a Carhartt label and a close-fitting one-size design.",
    bullets: [
      "Rib-knit cuffed construction.",
      "Carhartt label detail at the cuff.",
      "One-size fit.",
      "Navy colorway shown.",
    ],
    categoryPath: ["Fashion", "Men's Hats"],
    variants: [
      {
        label: "Navy, One Size",
        sku: "CARH-A18-NVY",
        priceCents: 1999,
        stock: 300,
        images: [localImage("carhartt-beanie", "webp")],
      },
    ],
  }),
  P({
    slug: "bellroy-key-cover",
    title: "Bellroy Key Cover, full-grain leather, black",
    brand: "Bellroy",
    description:
      "A compact leather key organizer that keeps keys in a single stack and can be attached to a bag or belt loop.",
    bullets: [
      "Full-grain leather outer construction.",
      "Holds standard keys in a compact stack.",
      "Integrated loop for attachment to a bag or belt.",
      "Black colorway.",
    ],
    categoryPath: ["Luggage & Accessories", "Key Organizers"],
    variants: [
      {
        label: "Black",
        sku: "BELL-KEYCOVER-BLK",
        priceCents: 3995,
        stock: 200,
        images: [localImage("bellroy-key-cover", "jpg")],
      },
    ],
  }),
  P({
    slug: "anker-341-power-strip",
    title: "Anker 341 USB Power Strip, 11-in-1, 8 AC outlets, 2 USB-A and 1 USB-C, 5 ft, white",
    brand: "Anker",
    description:
      "A five-foot desktop power strip with eight AC outlets, two USB-A ports and one 20W USB-C port.",
    bullets: [
      "Eight AC outlets plus two USB-A ports and one USB-C port.",
      "Up to 20W charging through the USB-C port.",
      "Outlets are arranged on three sides for compact placement.",
      "Includes built-in 2,000-joule surge protection for compatible setups.",
    ],
    categoryPath: ["Electronics", "Power Strips"],
    variants: [
      {
        label: "5 ft, White",
        sku: "ANKER-341-A9183-5FT-WHT",
        priceCents: 2799,
        stock: 175,
        images: [localImage("anker-341-power-strip", "png")],
      },
    ],
  }),
  P({
    slug: "moleskine-classic-notebook",
    title: "Moleskine Classic large notebook, 5.5 × 8 inches, dot grid, black, 192 pages",
    brand: "Moleskine",
    description:
      "A large hardcover dot-grid notebook with lay-flat binding, elastic closure and an internal expandable pocket.",
    bullets: [
      "Large 5.5-by-8-inch hardcover format.",
      "Dot-grid pages support flexible planning and note layouts.",
      "Lay-flat binding and elastic closure.",
      "Includes an internal expandable pocket.",
    ],
    categoryPath: ["Office Products", "Notebooks"],
    variants: [
      {
        label: "Large, Dot Grid, Black",
        sku: "MOL-CLASSIC-LG-DOT-BLK",
        priceCents: 3295,
        stock: 300,
        images: [localImage("moleskine-classic-notebook", "png")],
      },
    ],
  }),
  P({
    slug: "pilot-g2-pens",
    title: "Pilot G2 07 Fine Point retractable gel pens, 0.7 mm, black ink, 12-count",
    brand: "Pilot",
    description:
      "A twelve-count pack of retractable gel pens with a fine 0.7 mm tip, black ink and pocket clip.",
    bullets: [
      "Retractable barrel with a pocket clip.",
      "0.7 mm fine point in black gel ink.",
      "Twelve pens per pack.",
      "Designed for everyday writing on compatible paper.",
    ],
    categoryPath: ["Office Products", "Pens"],
    variants: [
      {
        label: "0.7 mm, Black, 12 Count",
        sku: "PIL-G2-07-BLK-12",
        priceCents: 1399,
        stock: 450,
        images: [localImage("pilot-g2-pens", "jpg")],
      },
    ],
  }),
  P({
    slug: "swingline-stapler",
    title: "Swingline Optima 40 electric stapler, model S7054501, black",
    brand: "Swingline",
    description:
      "A desktop electric stapler designed for up to 40 sheets, with automatic current shut-off and a manual mode for staples without power.",
    bullets: [
      "Staples up to 40 sheets in electric mode.",
      "Automatic current shut-off when no staples are detected.",
      "Manual mode is available for stapling without power.",
      "Model S7054501 is a black desktop electric stapler.",
    ],
    categoryPath: ["Office Products", "Staplers"],
    variants: [
      {
        label: "40 Sheet Capacity, Black",
        sku: "SWG-OPTIMA-S7054501-BLK",
        priceCents: 6999,
        stock: 75,
        images: [localImage("swingline-stapler", "jpg")],
      },
    ],
  }),
];

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function loadEnvironment() {
  const local = config({
    path: path.resolve(process.cwd(), ".env.local"),
    quiet: true,
  });
  if (local.error) throw local.error;
  config({ path: path.resolve(process.cwd(), ".env"), quiet: true, override: false });
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is required in .env.local");
  process.env.MONGODB_URI = uri;
}

function stableStringify(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object") {
    if ("_bsontype" in value) return JSON.stringify(String(value));
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function hashDocuments(documents: unknown[]): string {
  return createHash("sha256")
    .update(documents.map(stableStringify).join("\n"))
    .digest("hex");
}

function productComparable(product: MigratedProduct | ProductRow): Record<string, unknown> {
  return {
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    description: product.description,
    bullets: product.bullets,
    categoryPath: product.categoryPath,
    images: product.images,
    boughtInPastMonth: product.boughtInPastMonth,
    bestsellerRank: product.bestsellerRank,
    isAmazonBrand: product.isAmazonBrand,
    variants: product.variants.map((variant) => ({
      label: variant.label,
      sku: variant.sku,
      priceCents: variant.priceCents,
      listPriceCents: variant.listPriceCents,
      stock: variant.stock,
      reserved: variant.reserved ?? 0,
      images: variant.images,
    })),
    primeEligible: product.primeEligible,
    freeReturns: product.freeReturns,
    carbonImpact: product.carbonImpact,
    seller: product.seller,
  };
}

function validateCatalog() {
  requireCondition(catalogProducts.length === 19, `expected 19 catalog products, found ${catalogProducts.length}`);
  const slugs = new Set<string>();
  const skus = new Set<string>();
  for (const product of catalogProducts) {
    requireCondition(!slugs.has(product.slug), `duplicate catalog slug: ${product.slug}`);
    requireCondition(product.slug !== protectedSlug, `protected slug must not be seeded: ${product.slug}`);
    slugs.add(product.slug);
    requireCondition(product.title.length > 20, `short title: ${product.slug}`);
    requireCondition(product.description.length > 40, `short description: ${product.slug}`);
    requireCondition(product.bullets.length >= 3, `insufficient bullets: ${product.slug}`);
    requireCondition(product.variants.length > 0, `no variants: ${product.slug}`);
    requireCondition(product.images.length > 0, `no product images: ${product.slug}`);
    for (const image of product.images) {
      requireCondition(image.startsWith("/images/catalog/"), `non-local product image: ${product.slug}`);
    }
    for (const variant of product.variants) {
      requireCondition(!skus.has(variant.sku), `duplicate catalog SKU: ${variant.sku}`);
      requireCondition(/^[A-Z0-9][A-Z0-9-]+$/.test(variant.sku), `invalid SKU: ${variant.sku}`);
      requireCondition(variant.priceCents >= 0, `negative price: ${variant.sku}`);
      requireCondition(variant.listPriceCents === undefined || variant.listPriceCents >= variant.priceCents, `invalid list price: ${variant.sku}`);
      requireCondition(Number.isInteger(variant.stock) && variant.stock >= 0, `invalid stock: ${variant.sku}`);
      requireCondition(variant.images.length > 0, `no variant images: ${variant.sku}`);
      for (const image of variant.images) {
        requireCondition(image.startsWith("/images/catalog/"), `non-local variant image: ${variant.sku}`);
      }
      skus.add(variant.sku);
    }
  }
}

async function validateLocalImages() {
  const images = new Set<string>();
  for (const product of catalogProducts) {
    product.images.forEach((image) => images.add(image));
    product.variants.forEach((variant) => variant.images.forEach((image) => images.add(image)));
  }
  await Promise.all(
    [...images].map(async (image) => {
      const filePath = path.resolve(process.cwd(), "public", image.replace(/^\//, ""));
      try {
        await access(filePath);
      } catch {
        throw new Error(`missing local catalog image: ${image}`);
      }
    }),
  );
}

async function readDatabase(models: MigrationModels): Promise<DatabaseSnapshot> {
  const productsQuery = models.ProductModel.find({}).sort({ _id: 1 }).lean();
  const ordersQuery = models.OrderModel.find({}).sort({ _id: 1 }).lean();
  const cartsQuery = models.CartModel.find({}).sort({ _id: 1 }).lean();
  const reviewsQuery = models.ReviewModel.find({}).sort({ _id: 1 }).lean();
  const usersQuery = models.UserModel.find({}).sort({ _id: 1 }).lean();
  const [products, orders, carts, reviews, users] = await Promise.all([
    productsQuery.exec(),
    ordersQuery.exec(),
    cartsQuery.exec(),
    reviewsQuery.exec(),
    usersQuery.exec(),
  ]);
  return {
    products: products as unknown as ProductRow[],
    orders: orders as unknown as OrderRow[],
    carts: carts as unknown as CartRow[],
    reviews: reviews as unknown as ReviewRow[],
    users: users as unknown as UserRow[],
  };
}

function assertProtectedData(snapshot: DatabaseSnapshot) {
  const order = snapshot.orders.find((entry) => entry.orderKey === protectedOrderKey);
  requireCondition(order, `protected order not found: ${protectedOrderKey}`);
  requireCondition(order.items.length === 1, `protected order must contain exactly one item`);
  const item = order.items[0];
  requireCondition(String(item.product) === protectedProductId, "protected order product ID changed");
  requireCondition(item.variantSku === "CARVD-SHACK-CHAR", "protected order SKU changed");
  requireCondition(item.qty === 2, "protected order quantity changed");
  requireCondition(item.unitPriceCents === 6999, "protected order price changed");
  requireCondition(item.image === protectedImage, "protected order image changed");

  const product = snapshot.products.find((entry) => String(entry._id) === protectedProductId);
  requireCondition(product, "protected product not found");
  requireCondition(product.slug === protectedSlug, "protected product slug changed");
  const variants = new Map(product.variants.map((variant) => [variant.sku, variant]));
  const charVariant = variants.get("CARVD-SHACK-CHAR");
  const armyVariant = variants.get("CARVD-SHACK-ARMY");
  requireCondition(charVariant, "protected Charcoal variant not found");
  requireCondition(armyVariant, "protected Army Green variant not found");
  requireCondition(charVariant.priceCents === 6999 && charVariant.stock === 408, "protected Charcoal variant changed");
  requireCondition(armyVariant.priceCents === 6999 && armyVariant.stock === 380, "protected Army Green variant changed");
}

function collectReferences(snapshot: DatabaseSnapshot): Reference[] {
  const references: Reference[] = [];
  for (const order of snapshot.orders) {
    order.items.forEach((item) => {
      references.push({
        source: `order ${order.orderKey}`,
        productId: String(item.product),
        variantSku: item.variantSku,
      });
    });
  }
  for (const cart of snapshot.carts) {
    for (const item of [...cart.items, ...cart.saved]) {
      references.push({
        source: `cart ${String(cart._id)}`,
        productId: String(item.product),
        variantSku: item.variantSku,
      });
    }
  }
  return references;
}

function buildMigrationPlan(snapshot: DatabaseSnapshot): MigrationPlan {
  validateCatalog();
  assertProtectedData(snapshot);

  const desiredSlugs = new Set(catalogProducts.map((product) => product.slug));
  const desiredSkuOwners = new Map(
    catalogProducts.flatMap((product) => product.variants.map((variant) => [variant.sku, product.slug] as const)),
  );
  const productById = new Map(snapshot.products.map((product) => [String(product._id), product]));
  const productBySlug = new Map(snapshot.products.map((product) => [product.slug, product]));
  const currentSkuOwners = new Map<string, ProductRow[]>();
  const seenSlugs = new Set<string>();

  for (const product of snapshot.products) {
    requireCondition(!seenSlugs.has(product.slug), `duplicate existing product slug: ${product.slug}`);
    seenSlugs.add(product.slug);
    for (const variant of product.variants) {
      requireCondition(variant.stock >= 0, `negative existing stock: ${product.slug}/${variant.sku}`);
      const owners = currentSkuOwners.get(variant.sku) ?? [];
      owners.push(product);
      currentSkuOwners.set(variant.sku, owners);
    }
  }

  for (const [sku, owners] of currentSkuOwners) {
    requireCondition(owners.length === 1, `duplicate existing SKU: ${sku}`);
  }

  for (const [sku, targetSlug] of desiredSkuOwners) {
    const owners = currentSkuOwners.get(sku) ?? [];
    for (const owner of owners) {
      requireCondition(
        owner.slug === targetSlug,
        `SKU ${sku} currently belongs to ${owner.slug}, not target product ${targetSlug}`,
      );
    }
  }

  const migratedProducts: MigratedProduct[] = catalogProducts.map((seed) => {
    const existing = productBySlug.get(seed.slug);
    return {
      ...seed,
      variants: seed.variants.map((variant) => {
        const previous = existing?.variants.find((entry) => entry.sku === variant.sku);
        return {
          ...variant,
          stock: previous?.stock ?? variant.stock,
          reserved: previous?.reserved ?? 0,
        };
      }),
    };
  });
  const migratedBySlug = new Map(migratedProducts.map((product) => [product.slug, product]));

  for (const reference of collectReferences(snapshot)) {
    const product = productById.get(reference.productId);
    requireCondition(product, `${reference.source} references missing product ${reference.productId}`);
    const isProtected = reference.productId === protectedProductId;
    const allowed = isProtected || desiredSlugs.has(product.slug);
    requireCondition(allowed, `${reference.source} references product outside the migration: ${product.slug}`);
    const target = isProtected ? product : migratedBySlug.get(product.slug);
    requireCondition(target, `${reference.source} has no target product`);
    requireCondition(
      target.variants.some((variant) => variant.sku === reference.variantSku),
      `${reference.source} references SKU removed by migration: ${reference.variantSku}`,
    );
  }

  const removedProducts = snapshot.products.filter(
    (product) => String(product._id) !== protectedProductId && !desiredSlugs.has(product.slug),
  );
  const userIds = new Set(snapshot.users.map((user) => String(user._id)));
  const reviewsToDelete = new Set<string>();
  const reviewIdsToUnverify = new Set<string>();

  for (const review of snapshot.reviews) {
    const product = productById.get(String(review.product));
    const isProtected = product && String(product._id) === protectedProductId;
    const isDesired = product ? desiredSlugs.has(product.slug) : false;
    const hasValidUser = userIds.has(String(review.user));
    if (isProtected) continue;
    if (!product) {
      requireCondition(!hasValidUser, `valid user review references missing product ${String(review.product)}`);
      reviewsToDelete.add(String(review._id));
      continue;
    }
    if (!isDesired) {
      requireCondition(!hasValidUser, `valid user review would be lost with product ${product.slug}`);
      reviewsToDelete.add(String(review._id));
      continue;
    }
    if (hasValidUser) {
      if (review.verifiedPurchase) reviewIdsToUnverify.add(String(review._id));
    } else {
      reviewsToDelete.add(String(review._id));
    }
  }

  const productUpdates: MigratedProduct[] = [];
  const insertedSlugs: string[] = [];
  const updatedSlugs: string[] = [];
  const unchangedSlugs: string[] = [];
  const preservedVariants: PreservedVariantState[] = [];
  const preservedProducts: PreservedProductState[] = [];

  for (const migrated of migratedProducts) {
    const existing = productBySlug.get(migrated.slug);
    if (!existing) {
      insertedSlugs.push(migrated.slug);
      productUpdates.push(migrated);
      continue;
    }
    preservedProducts.push({
      slug: existing.slug,
      id: String(existing._id),
      createdAt: existing.createdAt,
    });
    for (const variant of migrated.variants) {
      const previous = existing.variants.find((entry) => entry.sku === variant.sku);
      if (previous) {
        preservedVariants.push({
          slug: migrated.slug,
          sku: variant.sku,
          stock: previous.stock,
          reserved: previous.reserved ?? 0,
        });
      }
    }
    if (stableStringify(productComparable(existing)) === stableStringify(productComparable(migrated))) {
      unchangedSlugs.push(migrated.slug);
    } else {
      updatedSlugs.push(migrated.slug);
      productUpdates.push(migrated);
    }
  }

  return {
    migratedProducts,
    productUpdates,
    insertedSlugs,
    updatedSlugs,
    unchangedSlugs,
    removedProductIds: removedProducts.map((product) => String(product._id)),
    reviewsToDelete: [...reviewsToDelete],
    reviewIdsToUnverify: [...reviewIdsToUnverify],
    preservedVariants,
    preservedProducts,
  };
}

function fingerprint(snapshot: DatabaseSnapshot): IntegrityFingerprint {
  return {
    orders: hashDocuments(snapshot.orders),
    carts: hashDocuments(snapshot.carts),
    users: hashDocuments(snapshot.users),
    protectedProduct: hashDocuments(
      snapshot.products.filter((product) => String(product._id) === protectedProductId),
    ),
    protectedReviews: hashDocuments(
      snapshot.reviews.filter(
        (review) => String(review.product) === protectedProductId,
      ),
    ),
  };
}

async function prepareMigration(models: MigrationModels, plan: MigrationPlan) {
  for (const product of plan.productUpdates) {
    await models.ProductModel.updateOne(
      { slug: product.slug },
      { $set: product },
      {
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        writeConcern: { w: "majority", j: true },
      },
    ).exec();
  }

  if (plan.reviewsToDelete.length > 0) {
    await models.ReviewModel.deleteMany(
      { _id: { $in: plan.reviewsToDelete } },
      { writeConcern: { w: "majority", j: true } },
    ).exec();
  }

  if (plan.reviewIdsToUnverify.length > 0) {
    await models.ReviewModel.updateMany(
      { _id: { $in: plan.reviewIdsToUnverify } },
      { $set: { verifiedPurchase: false } },
      { writeConcern: { w: "majority", j: true } },
    ).exec();
  }

  const targetQuery = models.ProductModel.find({
    slug: { $in: catalogProducts.map((product) => product.slug) },
  });
  const targetProducts = (await targetQuery.lean().exec()) as unknown as ProductRow[];
  requireCondition(targetProducts.length === catalogProducts.length, "not all target products exist after preparation");

  const targetIds = targetProducts.map((product) => product._id);
  const reviewQuery = models.ReviewModel.find({ product: { $in: targetIds } })
    .select({ product: 1, rating: 1 });
  const targetReviews = (await reviewQuery.lean().exec()) as unknown as Array<{
    product: Types.ObjectId;
    rating: number;
  }>;
  const statistics = new Map<string, { sum: number; count: number }>();
  for (const review of targetReviews) {
    const key = String(review.product);
    const current = statistics.get(key) ?? { sum: 0, count: 0 };
    current.sum += review.rating;
    current.count += 1;
    statistics.set(key, current);
  }

  for (const product of targetProducts) {
    const current = statistics.get(String(product._id));
    const ratingCount = current?.count ?? 0;
    const ratingAvg = ratingCount > 0 ? Number(((current?.sum ?? 0) / ratingCount).toFixed(2)) : 0;
    if (product.ratingAvg === ratingAvg && product.ratingCount === ratingCount) continue;
    await models.ProductModel.updateOne(
      { _id: product._id },
      { $set: { ratingAvg, ratingCount } },
      { runValidators: true, writeConcern: { w: "majority", j: true } },
    ).exec();
  }
}

async function removeUnreferencedProducts(models: MigrationModels, productIds: string[]) {
  if (productIds.length === 0) return;
  await models.ProductModel.deleteMany(
    { _id: { $in: productIds } },
    { writeConcern: { w: "majority", j: true } },
  ).exec();
}

function verifyMigration(
  before: DatabaseSnapshot,
  after: DatabaseSnapshot,
  plan: MigrationPlan,
  expectFinalCatalog = true,
) {
  assertProtectedData(after);
  const beforeFingerprint = fingerprint(before);
  const afterFingerprint = fingerprint(after);
  for (const key of Object.keys(beforeFingerprint) as Array<keyof IntegrityFingerprint>) {
    requireCondition(
      beforeFingerprint[key] === afterFingerprint[key],
      `protected ${key} data changed during migration`,
    );
  }

  const expectedSlugs = new Set([...catalogProducts.map((product) => product.slug), protectedSlug]);
  if (expectFinalCatalog) {
    requireCondition(after.products.length === expectedSlugs.size, `expected ${expectedSlugs.size} products after migration`);
  }
  const actualSlugs = new Set(after.products.map((product) => product.slug));
  for (const slug of expectedSlugs) {
    requireCondition(actualSlugs.has(slug), `missing expected product after migration: ${slug}`);
  }

  const productById = new Map(after.products.map((product) => [String(product._id), product]));
  const migratedBySlug = new Map(plan.migratedProducts.map((product) => [product.slug, product]));
  for (const product of after.products) {
    if (product.slug === protectedSlug) continue;
    const expected = migratedBySlug.get(product.slug);
    if (!expectFinalCatalog && !expected) continue;
    requireCondition(expected, `unexpected product after migration: ${product.slug}`);
    requireCondition(
      stableStringify(productComparable(product)) === stableStringify(productComparable(expected)),
      `catalog data mismatch after migration: ${product.slug}`,
    );
  }

  const seenSkus = new Set<string>();
  for (const product of after.products) {
    for (const variant of product.variants) {
      requireCondition(!seenSkus.has(variant.sku), `duplicate SKU after migration: ${variant.sku}`);
      seenSkus.add(variant.sku);
    }
  }

  for (const preserved of plan.preservedProducts) {
    const product = after.products.find((entry) => entry.slug === preserved.slug);
    requireCondition(product, `preserved product missing: ${preserved.slug}`);
    requireCondition(String(product._id) === preserved.id, `product ID changed: ${preserved.slug}`);
    requireCondition(
      product.createdAt.getTime() === preserved.createdAt.getTime(),
      `product createdAt changed: ${preserved.slug}`,
    );
  }

  for (const preserved of plan.preservedVariants) {
    const product = after.products.find((entry) => entry.slug === preserved.slug);
    const variant = product?.variants.find((entry) => entry.sku === preserved.sku);
    requireCondition(variant, `preserved variant missing: ${preserved.slug}/${preserved.sku}`);
    requireCondition(variant.stock === preserved.stock, `stock changed: ${preserved.slug}/${preserved.sku}`);
    requireCondition((variant.reserved ?? 0) === preserved.reserved, `reserved stock changed: ${preserved.slug}/${preserved.sku}`);
  }

  for (const reference of collectReferences(after)) {
    const product = productById.get(reference.productId);
    requireCondition(product, `${reference.source} references missing product after migration`);
    requireCondition(
      product.variants.some((variant) => variant.sku === reference.variantSku),
      `${reference.source} references missing SKU after migration: ${reference.variantSku}`,
    );
  }

  const userIds = new Set(after.users.map((user) => String(user._id)));
  const targetSlugs = new Set(catalogProducts.map((product) => product.slug));
  const statistics = new Map<string, { sum: number; count: number }>();
  for (const review of after.reviews) {
    const product = productById.get(String(review.product));
    if (!product) {
      requireCondition(String(review.product) !== protectedProductId, "review for protected product points to a missing product");
      continue;
    }
    if (product.slug === protectedSlug) continue;
    requireCondition(targetSlugs.has(product.slug), `review remains for removed product: ${product.slug}`);
    requireCondition(userIds.has(String(review.user)), `invalid user review remains for ${product.slug}`);
    requireCondition(!review.verifiedPurchase, `verified purchase flag remains for ${product.slug}`);
    const key = String(product._id);
    const current = statistics.get(key) ?? { sum: 0, count: 0 };
    current.sum += Number(review.rating);
    current.count += 1;
    statistics.set(key, current);
  }

  for (const product of after.products) {
    if (product.slug === protectedSlug) continue;
    if (!expectFinalCatalog && !migratedBySlug.has(product.slug)) continue;
    const current = statistics.get(String(product._id));
    const count = current?.count ?? 0;
    const average = count > 0 ? Number(((current?.sum ?? 0) / count).toFixed(2)) : 0;
    requireCondition(product.ratingCount === count, `rating count mismatch: ${product.slug}`);
    requireCondition(product.ratingAvg === average, `rating average mismatch: ${product.slug}`);
  }
}

function printPlan(plan: MigrationPlan) {
  console.log("Migration preflight passed");
  console.log(`Products: ${plan.insertedSlugs.length} insert, ${plan.updatedSlugs.length} update, ${plan.unchangedSlugs.length} unchanged`);
  console.log(`Products: ${plan.removedProductIds.length} unreferenced removals, 1 protected product untouched`);
  console.log(`Reviews: ${plan.reviewsToDelete.length} invalid removals, ${plan.reviewIdsToUnverify.length} verified flags cleared`);
  console.log(`Variants: ${plan.preservedVariants.length} existing stock/reserved pairs preserved`);
}

async function main() {
  loadEnvironment();
  await validateLocalImages();

  const mongoose = (await import("mongoose")).default;
  const models = await import("../lib/models");
  const { connectDB } = await import("../lib/mongoose");
  await connectDB();

  try {
    const initial = await readDatabase(models);
    const initialPlan = buildMigrationPlan(initial);
    printPlan(initialPlan);

    if (process.argv.includes("--dry-run")) {
      console.log("Dry run complete; no database changes were made");
      return;
    }

    await prepareMigration(models, initialPlan);
    const prepared = await readDatabase(models);
    verifyMigration(initial, prepared, initialPlan, false);

    const beforeRemoval = await readDatabase(models);
    verifyMigration(initial, beforeRemoval, initialPlan, false);
    const removalPlan = buildMigrationPlan(beforeRemoval);
    requireCondition(removalPlan.productUpdates.length === 0, "catalog preparation did not converge before removal");
    requireCondition(removalPlan.reviewsToDelete.length === 0, "review preparation did not converge before removal");
    requireCondition(removalPlan.reviewIdsToUnverify.length === 0, "review verification cleanup did not converge before removal");

    await removeUnreferencedProducts(models, removalPlan.removedProductIds);
    const after = await readDatabase(models);
    verifyMigration(initial, after, removalPlan);

    console.log(
      `Migration complete: ${catalogProducts.length + 1} products, ${catalogProducts.reduce((sum, product) => sum + product.variants.length, 0) + 2} variants`,
    );
    console.log("Protected order, user, cart, CARVD product and CARVD reviews are unchanged");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
