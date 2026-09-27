const express = require("express");
const { pool } = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.post(
  "/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { receiverId, content } = req.body;

    if (!receiverId || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "receiverId and content are required",
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

module.exports = router;
