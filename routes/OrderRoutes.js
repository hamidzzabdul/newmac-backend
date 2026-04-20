const express = require("express");
const router = express.Router();
const orderController = require("../controllers/OrderController");
const generateReceiptController = require("../controllers/ReceiptController");
const paystackController = require("../controllers/PaystacksController");

const authController = require("../controllers/AuthController");

router.post("/", authController.protect, orderController.createOrder);
router.get(
  "/admin/all",
  authController.protect,
  authController.restrictTo("admin"),
  orderController.getAllOrders,
);

// router.patch("/:orderId/status", authController.protect, authController.restrictTo("admin"), orderController.updateOrderStatus);

// Get all orders for the authenticated user
router.get("/my-orders", authController.protect, orderController.getMyOrders);

router.patch(
  "/:orderId/cancel",
  authController.protect,
  orderController.cancelUnpaidOrder,
);

// Paystack
router.post(
  "/:id/paystack/initialize",
  authController.protect,
  paystackController.initalizePayment,
);
router.get("/:id/paystack/verify", paystackController.verifyTransaction);

// Get Single order
router.get("/:orderId", authController.protect, orderController.getOrderById);

// Get single order
router.get(
  "/admin/:orderId",
  authController.protect,
  authController.restrictTo("admin"),
  orderController.getOrderById,
);
router.patch(
  "/admin/:orderId/status",
  authController.protect,
  authController.restrictTo("admin"),
  orderController.updateOrderStatus,
);

// Generate PDF receipt for an order
router.get(
  "/:orderId/receipt",
  authController.protect,
  generateReceiptController.generateReceipt,
);

module.exports = router;
