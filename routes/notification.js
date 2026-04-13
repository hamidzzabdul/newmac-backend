const express = require("express");
const notificationController = require("../controllers/NotificationcsController");
const authController = require("../controllers/AuthController");

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo("admin"));

router.get(
  "/admin/notifications",
  notificationController.getAdminNotifications,
);

module.exports = router;
