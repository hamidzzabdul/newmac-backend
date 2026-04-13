require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../../models/Product");

const MONGO_URI =
  process.env.DATABASE || "mongodb://127.0.0.1:27017/westlands_meat";

const products = [
  {
    name: "Beef Hind Quarter",
    description:
      "A meaty hind section of beef with a good balance of lean cuts, ideal for roasting, stewing, or portioning.",
    category: "beef",
    pricePerKg: 850,
    sku: "BEEF-HIND-QUARTER",
  },
  {
    name: "Beef Front Quarter",
    category: "beef",
    pricePerKg: 780,
    sku: "BEEF-FRONT-QUARTER",
  },
  {
    name: "Whole Carcass",
    description:
      "A full beef carcass option for bulk buyers, butcher shops, and customers who want full-cut flexibility.",
    category: "beef",
    pricePerKg: 750,
    sku: "BEEF-WHOLE-CARCASS",
  },
  {
    name: "Brisket Sliced",
    description:
      "Tender sliced brisket with rich flavor, perfect for braising, smoking, or slow-cooked dishes.",
    category: "beef",
    pricePerKg: 830,
    sku: "BEEF-BRISKET-SLICED",
  },
  {
    name: "Soup Bones",
    description:
      "Beef soup bones ideal for making rich broths, soups, and stews with deep natural flavor.",
    category: "beef",
    pricePerKg: 200,
    sku: "BEEF-SOUP-BONES",
  },
  {
    name: "BBQ Ribs",
    description:
      "Juicy beef ribs prepared for grilling or barbecuing, packed with bold meaty flavor.",
    category: "beef",
    pricePerKg: 760,
    sku: "BEEF-BBQ-RIBS",
  },
  {
    name: "Short Ribs",
    description:
      "Well-marbled beef short ribs ideal for braising, roasting, or premium grilled meals.",
    category: "beef",
    pricePerKg: 880,
    sku: "BEEF-SHORT-RIBS",
  },
  {
    name: "Beef Stripes",
    description:
      "Thinly cut beef strips that cook quickly and work well for stir-fries, sauces, and fast meals.",
    category: "beef",
    pricePerKg: 1100,
    sku: "BEEF-STRIPES",
  },
  {
    name: "Staff Meat",
    description:
      "An affordable everyday beef option suitable for home cooking, stews, and general use.",
    category: "beef",
    pricePerKg: 740,
    sku: "BEEF-STAFF-MEAT",
  },
  {
    name: "Rib Eye Bone In",
    description:
      "Premium bone-in rib eye with rich marbling and deep flavor, excellent for grilling or pan-searing.",
    category: "beef",
    pricePerKg: 1310,
    sku: "BEEF-RIB-EYE-BONE-IN",
  },
  {
    name: "Rib Eye Boneless",
    description:
      "A tender boneless rib eye steak with excellent marbling, perfect for premium steak meals.",
    category: "beef",
    pricePerKg: 1480,
    sku: "BEEF-RIB-EYE-BONELESS",
  },
  {
    name: "T-Bone Steak",
    description:
      "Classic T-bone steak combining tenderness and flavor, ideal for grilling or special occasion meals.",
    category: "beef",
    pricePerKg: 1650,
    sku: "BEEF-T-BONE-STEAK",
  },
  {
    name: "Top Rump",
    description:
      "A lean and versatile beef cut suitable for roasting, slicing, grilling, or stir-fry preparation.",
    category: "beef",
    pricePerKg: 1999,
    sku: "BEEF-TOP-RUMP",
  },
  {
    name: "Silverside",
    description:
      "Lean beef silverside cut best suited for roasting, boiling, corning, or slow-cooked meals.",
    category: "beef",
    pricePerKg: 1040,
    sku: "BEEF-SILVERSIDE",
  },
  {
    name: "Sirloin Steak",
    description:
      "A premium sirloin steak with a firm texture and rich beef flavor, ideal for grilling or frying.",
    category: "beef",
    pricePerKg: 1630,
    sku: "BEEF-SIRLOIN-STEAK",
  },
  {
    name: "Rump Steak",
    description:
      "A flavorful beef steak cut with a satisfying bite, perfect for grilling, pan-frying, or slicing.",
    category: "beef",
    pricePerKg: 1100,
    sku: "BEEF-RUMP-STEAK",
  },
  {
    name: "Top Side",
    description:
      "A lean beef cut commonly used for roasting, slicing, or preparing economical family meals.",
    category: "beef",
    pricePerKg: 1050,
    sku: "BEEF-TOP-SIDE",
  },
  {
    name: "Beef Fillet Trimmed",
    description:
      "A premium trimmed beef fillet that is tender, lean, and ideal for high-end steak dishes.",
    category: "beef",
    pricePerKg: 1810,
    sku: "BEEF-FILLET-TRIMMED",
  },
  {
    name: "Beef Chunks",
    description:
      "Handy beef chunks prepared for stews, curries, and other slow-cooked hearty meals.",
    category: "beef",
    pricePerKg: 785,
    sku: "BEEF-CHUNKS",
  },
  {
    name: "Ossobuco",
    description:
      "Cross-cut beef shank with bone marrow, ideal for braising and rich, slow-cooked dishes.",
    category: "beef",
    pricePerKg: 700,
    sku: "BEEF-OSSOBUCO",
  },
  {
    name: "Lean Mince Meat",
    description:
      "Lean minced beef with reduced fat content, great for healthy sauces, patties, and fillings.",
    category: "beef",
    pricePerKg: 820,
    sku: "BEEF-LEAN-MINCE-MEAT",
  },
  {
    name: "Mince Meat",
    description:
      "Fresh minced beef suitable for burgers, meatballs, sauces, samosas, and everyday cooking.",
    category: "beef",
    pricePerKg: 750,
    sku: "BEEF-MINCE-MEAT",
  },
  {
    name: "Lean Beef Cubes",
    description:
      "Lean diced beef cubes ideal for stews, kebabs, stir-fries, and healthy meal preparation.",
    category: "beef",
    pricePerKg: 900,
    sku: "BEEF-LEAN-CUBES",
  },
  {
    name: "Boneless Beef Cubes",
    description:
      "Boneless beef cubes trimmed for convenience and perfect for stews, curries, and skewers.",
    category: "beef",
    pricePerKg: 810,
    sku: "BEEF-BONELESS-CUBES",
  },

  {
    name: "Lamb Shanks",
    description:
      "Tender lamb shanks best for slow braising, roasting, and rich comforting meals.",
    category: "lamb",
    pricePerKg: 690,
    sku: "LAMB-SHANKS",
  },
  {
    name: "Lamb Ribs",
    description:
      "Flavorful lamb ribs ideal for grilling, roasting, or barbecuing with aromatic seasoning.",
    category: "lamb",
    pricePerKg: 790,
    sku: "LAMB-RIBS",
  },
  {
    name: "Lamb Mince",
    description:
      "Fresh minced lamb perfect for kebabs, burgers, meatballs, and flavorful family dishes.",
    category: "lamb",
    pricePerKg: 960,
    sku: "LAMB-MINCE",
  },
  {
    name: "Lamb Cubes Bone In",
    description:
      "Bone-in lamb cubes with rich flavor, excellent for stews, curries, and slow-cooked dishes.",
    category: "lamb",
    pricePerKg: 680,
    sku: "LAMB-CUBES-BONE-IN",
  },
  {
    name: "Lamb Boneless",
    description:
      "Boneless lamb cut for easy preparation, suitable for roasting, grilling, or cubing.",
    category: "lamb",
    pricePerKg: 1050,
    sku: "LAMB-BONELESS",
  },
  {
    name: "Lamb Shoulder Chops",
    description:
      "Well-flavored shoulder chops ideal for pan-frying, grilling, or oven roasting.",
    category: "lamb",
    pricePerKg: 850,
    sku: "LAMB-SHOULDER-CHOPS",
  },
  {
    name: "Lamb Loin Chops",
    description:
      "Premium loin chops that are tender and juicy, perfect for quick grilling or pan-searing.",
    category: "lamb",
    pricePerKg: 1180,
    sku: "LAMB-LOIN-CHOPS",
  },
  {
    name: "Lamb Leg Netted Boneless",
    description:
      "A neatly prepared boneless lamb leg, netted for even roasting and easy presentation.",
    category: "lamb",
    pricePerKg: 1040,
    sku: "LAMB-LEG-NETTED-BONELESS",
  },
  {
    name: "Lamb Leg",
    description:
      "Classic lamb leg cut ideal for roasting whole, marinating, or preparing festive meals.",
    category: "lamb",
    pricePerKg: 900,
    sku: "LAMB-LEG",
  },
  {
    name: "Whole Lamb",
    description:
      "Whole lamb option for bulk orders, events, roasting, or custom butcher cuts.",
    category: "lamb",
    pricePerKg: 790,
    sku: "LAMB-WHOLE",
  },

  {
    name: "Goat Ribs",
    description:
      "Goat ribs with rich natural flavor, great for grilling, roasting, or slow-cooked recipes.",
    category: "goat",
    pricePerKg: 980,
    sku: "GOAT-RIBS",
  },
  {
    name: "Goat Mince",
    description:
      "Fresh minced goat meat suitable for sausages, patties, stews, and spiced dishes.",
    category: "goat",
    pricePerKg: 970,
    sku: "GOAT-MINCE",
  },
  {
    name: "Goat Tripes",
    description:
      "Cleaned goat tripe ideal for traditional dishes, soups, and slow-cooked preparations.",
    category: "goat",
    pricePerKg: 500,
    sku: "GOAT-TRIPES",
  },
  {
    name: "Goat Kidney",
    description:
      "Fresh goat kidney for specialty cooking, sautéed dishes, and traditional recipes.",
    category: "goat",
    pricePerKg: 700,
    sku: "GOAT-KIDNEY",
  },
  {
    name: "Goat Liver",
    description:
      "Nutrient-rich goat liver ideal for frying, stewing, or preparing quick traditional meals.",
    category: "goat",
    pricePerKg: 650,
    sku: "GOAT-LIVER",
  },
  {
    name: "Goat Cubes Bone In",
    description:
      "Bone-in goat cubes with bold flavor, excellent for stews, curries, and slow-cooked dishes.",
    category: "goat",
    pricePerKg: 799,
    sku: "GOAT-CUBES-BONE-IN",
  },
  {
    name: "Goat Cubes Boneless",
    description:
      "Boneless goat cubes trimmed for convenience and ideal for curries, stir-fries, and kebabs.",
    category: "goat",
    pricePerKg: 1150,
    sku: "GOAT-CUBES-BONELESS",
  },
  {
    name: "Goat Legs",
    description:
      "Goat leg cuts with great texture and flavor, suitable for roasting or slow cooking.",
    category: "goat",
    pricePerKg: 850,
    sku: "GOAT-LEGS",
  },
  {
    name: "Whole Goat",
    description:
      "Whole goat for ceremonies, events, bulk buying, or custom butcher sectioning.",
    category: "goat",
    pricePerKg: 805,
    sku: "GOAT-WHOLE",
  },
];

async function seedProducts() {
  try {
    console.log("Starting seed...");
    console.log("Using DB:", MONGO_URI);

    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

    const result = await Product.deleteMany({});
    console.log("Deleted old products:", result.deletedCount);

    const inserted = await Product.insertMany(
      products.map((p) => ({
        ...p,
        comparePrice: null,
        images: [],
        stockkg: 20,
        visibility: "visible",
        featured: false,
        onSale: false,
        allowBackorder: false,
      })),
    );

    console.log("Inserted products:", inserted.length);

    await mongoose.connection.close();
    console.log("MongoDB connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:");
    console.error(error);
    process.exit(1);
  }
}

seedProducts();
