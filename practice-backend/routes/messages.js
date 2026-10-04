const express = require("express");
const { pool } = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");
const { messageLimiter } = require("../middleware/rateLimiter");
const { sendToUser } = require("../websocket");

const router = express.Router();

router.post(
  "/messages",
  requireAuth,
  messageLimiter,
  asyncHandler(async (req, res) => {
    const { receiverId, content } = req.body;

    if (!receiverId || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "receiverId and content are required",
      });
    }

    // جلوگیری از پیام‌دادن به خود
    if (Number(receiverId) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a message to yourself",
      });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Message is too long (max 1000 characters)",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO messages (sender_id, receiver_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [req.user.id, receiverId, content.trim()],
    );

    sendToUser(receiverId, {
      type: "new_message",
      data: result.rows[0],
    });

    if (delivered) {
      await pool.query(
        `
      UPDATE messages
      SET delivered_at = NOW()
      WHERE id = $1
    `,
        [message.id],
      );
    }

    res.status(201).json({
      success: true,
      message: result.rows[0],
    });
  }),
);

router.get(
  "/messages/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
      `,
      [req.user.id, userId],
    );

    res.status(200).json({
      success: true,
      messages: result.rows,
    });
  }),
);

router.get(
  "/chat/users",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `
      SELECT id, email
      FROM users
      WHERE id <> $1
      ORDER BY email ASC
      `,
      [req.user.id],
    );

    res.status(200).json({
      success: true,
      users: result.rows,
    });
  }),
);

module.exports = router;
