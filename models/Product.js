const mongoose = require("mongoose");
const slugify = require("slugify");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: ["beef", "chicken", "goat", "lamb", "other"],
      required: true,
    },
    pricePerKg: {
      type: Number,
      required: true,
    },
    comparePrice: {
      type: Number,
      default: null,
    },
    images: {
      type: [String],
      required: false,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    stockkg: {
      type: Number,
      required: true,
      default: 0,
    },
    visibility: {
      type: String,
      enum: ["visible", "hidden"],
      default: "visible",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    onSale: {
      type: Boolean,
      default: false,
    },
    allowBackorder: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
    });
  }
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
