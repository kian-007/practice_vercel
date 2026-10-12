const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");
const { createUrlLimiter } = require("../middleware/rateLimiter");

const {
  handleCreateUrl,
  handleGetUrls,
  redirectUrl,
  handleDeleteUrl,
} = require("../controllers/urlController");

const router = express.Router();

// Create a shortened URL
router.post(
  "/urls",
  createUrlLimiter,
  requireAuth,
  asyncHandler(handleCreateUrl),
);

// Get URLs with pagination
router.get("/urls", requireAuth, asyncHandler(handleGetUrls));

// Redirect short URL
router.get("/:shortCode", asyncHandler(redirectUrl));

// Delete a URL
router.delete("/urls/:id", requireAuth, asyncHandler(handleDeleteUrl));

module.exports = router;
