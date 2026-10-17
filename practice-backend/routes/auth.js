const express = require("express");
const router = express.Router();

const {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
} = require("../middleware/rateLimiter");

const { requireAuth } = require("../middleware/auth");

const {
  registerValidation,
  loginValidation,
  changePasswordValidation,
} = require("../validators/authValidators");

const { handleValidation } = require("../middleware/validate");
const { asyncHandler } = require("../middleware/asyncHandler");

const authController = require("../controllers/authController");

// Register
router.post(
  "/register",
  registerLimiter,
  registerValidation,
  handleValidation,
  asyncHandler(authController.handleRegister),
);

// Login
router.post(
  "/login",
  loginLimiter,
  loginValidation,
  handleValidation,
  asyncHandler(authController.handleLogin),
);

// Change password
router.patch(
  "/change-password",
  requireAuth,
  changePasswordValidation,
  handleValidation,
  asyncHandler(authController.handleChangePassword),
);

// Forgot password
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  asyncHandler(authController.handleForgotPassword),
);

// Reset password
router.post(
  "/reset-password",
  asyncHandler(authController.handleResetPassword),
);

// Logout
router.post("/logout", asyncHandler(authController.handleLogout));

// Refresh tokens
router.post("/refresh", asyncHandler(authController.handleRefresh));

module.exports = router;
