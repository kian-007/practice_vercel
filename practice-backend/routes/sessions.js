const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const redis = require("../config/redis");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");

//-----(بونوس اختیاری) یه route برای «خروج از همه‌ی دستگاه‌ها»----
router.post(
  "/logout-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    console.log("REQ USER:", req.user);
    await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [
      req.user.id,
    ]);

    await redis.del(`sessions:${req.user.id}`);

    res.clearCookie("token", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    res.json({
      success: true,
      message: "Logged out from all devices",
    });
  }),
);

router.get(
  "/sessions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const cacheKey = `sessions:${req.user.id}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        sessions: cached,
        source: "redis",
      });
    }
    const userResult = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [req.user.email],
    );
    const user = userResult.rows[0];
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const currentRefreshToken = req.cookies.refreshToken;
    const result = await pool.query(
      `
      SELECT
        id,
        user_id AS userID,
        user_agent,
        created_at,
        last_used_at,
        token = $1 AS current
      FROM refresh_tokens
      WHERE user_id = $2
      ORDER BY last_used_at DESC
      `,
      [currentRefreshToken, user.id],
    );

    const sessions = result.rows;
    await redis.set(cacheKey, sessions, {
      ex: 3600,
    });

    res.json({
      success: true,
      sessions: sessions,
      source: "postgres",
    });
  }),
);

// ======================================================
// DELETE ONE SESSION
// ======================================================

router.delete(
  "/sessions/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessionId = req.params.id;

    const result = await pool.query(
      `
      DELETE FROM refresh_tokens
      WHERE id = $1
      AND user_id = $2
      RETURNING id
      `,
      [sessionId, req.user.id],
    );

    // if (result.rows.length === 0)
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    await redis.del(`sessions:${req.user.id}`);
    res.json({
      success: true,
      message: "Session revoked",
    });
  }),
);

module.exports = router;
