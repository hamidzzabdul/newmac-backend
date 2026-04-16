const mongoose = require("mongoose");
const slugify = require("slugify");
const Product = require("../../models/Product"); // adjust path if needed
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD,
);

async function generateUniqueSlug(name, productId) {
  const baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (
    await Product.findOne({
      slug,
      _id: { $ne: productId },
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

async function backfillProductSlugs() {
  try {
    await mongoose.connect(DB);

    const products = await Product.find({
      $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
    });

    console.log(`Found ${products.length} products without slugs`);

    for (const product of products) {
      product.slug = await generateUniqueSlug(product.name, product._id);
      await product.save({ validateBeforeSave: false });
      console.log(`Updated: ${product.name} -> ${product.slug}`);
    }

    console.log("Slug backfill complete");
    process.exit();
  } catch (err) {
    console.error("Error backfilling slugs:", err);
    process.exit(1);
  }
}

backfillProductSlugs();
