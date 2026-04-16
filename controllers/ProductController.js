const multer = require("multer");
const Product = require("../models/Product");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const factory = require("../controllers/handlerFactory");
const path = require("path");
const fs = require("node:fs");
const slugify = require("slugify");

const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split(".").pop();
    cb(null, `product-${Date.now()}.${ext}`);
  },
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadProductImages = upload.fields([{ name: "images", maxCount: 3 }]);
const deleteImages = (images) => {
  if (!images || images.length === 0) return;

  images.forEach((image) => {
    const imagePath = path.join(__dirname, "..", "public", "uploads", image);

    // Check if file exists before deleting
    if (fs.existsSync(imagePath)) {
      fs.unlink(imagePath, (err) => {
        if (err) {
          return new AppError(err, 209);
        }
      });
    }
  });
};

const generateSKU = async (category) => {
  // Define category prefixes
  const categoryPrefixes = {
    beef: "BF",
    goat: "GT",
    lamb: "LM",
    chicken: "CH",
  };

  const prefix = categoryPrefixes[category] || "PR"; // Default to 'PR' if category not found

  // Find the last product with this prefix
  const lastProduct = await Product.findOne({
    sku: { $regex: `^${prefix}-` },
  }).sort({ sku: -1 });

  let nextNumber = 1;

  if (lastProduct && lastProduct.sku) {
    // Extract number from SKU (e.g., "BF-005" -> 5)
    const match = lastProduct.sku.match(/\d+$/);
    if (match) {
      nextNumber = parseInt(match[0]) + 1;
    }
  }

  // Format with leading zeros (e.g., 001, 002, etc.)
  const formattedNumber = String(nextNumber).padStart(3, "0");

  return `${prefix}-${formattedNumber}`;
};

exports.createProduct = catchAsync(async (req, res, next) => {
  const {
    name,
    description,
    category,
    pricePerKg,
    comparePrice,
    stockkg,
    visibility,
    featured,
    onSale,
    allowBackorder,
  } = req.body;

  // Convert Multer files → array of filenames

  const images = req.files?.images?.map((file) => file.filename);

  if (!name || !category || !pricePerKg || !description || !stockkg) {
    return next(new AppError("Missing required fields", 400));
  }

  const sku = await generateSKU(category);
  const product = new Product({
    name,
    description,
    category,
    pricePerKg,
    comparePrice,
    images,
    sku,
    stockkg,
    visibility,
    featured,
    onSale,
    allowBackorder,
    images,
  });

  const doc = await product.save();
  res.status(201).json(doc);
});

// get All products
exports.getAllProducts = factory.getAll(Product);

// get product by id
exports.getProductBySlug = catchAsync(async (req, res) => {
  const doc = await Product.findOne({ slug: req.params.slug });
  if (!doc) return next(new AppError("Product not found", 404));

  res.status(200).json(doc);
});
exports.getProductById = catchAsync(async (req, res) => {
  const doc = await Product.findById(req.params.id);
  if (!doc) return next(new AppError("Product not found", 404));

  res.status(200).json(doc);
});

// update Product

exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError("Product not found", 404));

  let existingImages = [];
  if (req.body.existingImages) {
    existingImages = JSON.parse(req.body.existingImages);
  }

  const imagesToDelete = product.images.filter(
    (img) => !existingImages.includes(img),
  );

  deleteImages(imagesToDelete);

  const newImages = req.files?.images
    ? req.files.images.map((file) => file.filename)
    : [];

  const images = [...existingImages, ...newImages];

  const updatedData = {
    ...req.body,
    images,
    pricePerKg: Number(req.body.pricePerKg),
    comparePrice: req.body.comparePrice ? Number(req.body.comparePrice) : null,
    stockkg: Number(req.body.stockkg),
    featured: req.body.featured === "true",
    onSale: req.body.onSale === "true",
    allowBackorder: req.body.allowBackorder === "true",
  };

  if (req.body.name) {
    updatedData.slug = slugify(req.body.name, {
      lower: true,
      strict: true,
    });
  }

  const doc = await Product.findByIdAndUpdate(req.params.id, updatedData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: doc,
  });
});

exports.updateProductInventory = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError("Product not found", 404));

  // Only allow inventory-related fields to be updated
  const { name, category, stockkg, pricePerKg } = req.body;

  const updatedData = {
    name,
    category,
    stockkg: Number(stockkg),
    pricePerKg: Number(pricePerKg),
  };

  const doc = await Product.findByIdAndUpdate(req.params.id, updatedData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: doc,
  });
});

// Delete product
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) return next(new AppError("Product not found", 404));

  // Delete all product images from filesystem
  if (product.images && product.images.length > 0) {
    deleteImages(product.images);
  }

  // Delete product from database
  await Product.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: "success",
    message: "Product and associated images deleted successfully",
  });
});
