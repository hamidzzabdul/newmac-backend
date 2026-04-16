const express = require("express");

const router = express.Router();

const productController = require("../controllers/ProductController");
const authController = require("../controllers/AuthController");
// public
router.get("/", productController.getAllProducts);
router.get("/:slug", productController.getProductBySlug);
router.get("/:id", productController.getProductById);

// admin only
router.post(
  "/",
  authController.protect,
  productController.uploadProductImages,
  productController.createProduct,
);
router.patch(
  "/:id",
  authController.protect,
  productController.uploadProductImages,
  productController.updateProduct,
);

// for inventory update
router.patch(
  "/inventory/:id",
  authController.protect,
  productController.updateProductInventory,
);
router.delete("/:id", authController.protect, productController.deleteProduct);

module.exports = router;
