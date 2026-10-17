const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");
const { messageLimiter } = require("../middleware/rateLimiter");
const messageController = require("../controllers/messageController");

const router = express.Router();

router.post(
  "/messages",
  requireAuth,
  messageLimiter,
  asyncHandler(messageController.createMessage),
);

router.get(
  "/messages/:userId",
  requireAuth,
  asyncHandler(messageController.handleGetMessages),
);

router.get(
  "/chat/users",
  requireAuth,
  asyncHandler(messageController.handleGetChatUsers),
);

module.exports = router;
