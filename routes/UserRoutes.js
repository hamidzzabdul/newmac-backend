const express = require("express");
const userController = require("./../controllers/UserController");
const authController = require("./../controllers/AuthController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/verify-signup-otp", authController.verifySignupOTP);
router.post("/resend-signup-otp", authController.resendSignupOTP);

router.post("/login", authController.login);

router.post("/forgotPassword", authController.forgotPassword);
router.post("/verify-reset-otp", authController.verifyResetOTP);
router.patch("/resetPassword-with-otp", authController.resetPasswordWithOTP);

router.get("/logout", authController.logout);

// Protect all routes after this middleware
router.use(authController.protect);

router.patch("/updateMyPassword", authController.updatePassword);
router.get("/me", userController.getMe, userController.getUser);
router.patch("/updateMe", userController.updateMe);
router.delete("/deleteMe", userController.deleteMe);

// Admin Only routes

router.use(authController.restrictTo("admin"));

router.patch("/:id/role", userController.updateUserRole);

router
  .route("/")
  .get(authController.protect, userController.getAllUsers)
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
