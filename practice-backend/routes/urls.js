const express = require("express");
const crypto = require("crypto");
const redis = require("../config/redis");
const { pool } = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

function generateShortCode() {
  return crypto.randomBytes(4).toString("base64url");
}

router.post(
  "/urls",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { originalUrl, expiresAt } = req.body;

    if (!originalUrl) {
      return res.status(400).json({
        success: false,
        message: "originalUrl is required",
      });
    }

    const shortCode = generateShortCode();
    const result = await pool.query(
      `
        INSERT INTO short_urls
        (user_id, original_url, short_code, expires_at)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
      [req.user.id, originalUrl, shortCode, expiresAt || null],
    );
    await redis.del("allUrls");

    res.status(201).json({
      success: true,
      url: result.rows[0],
    });
  }),
);

router.get(
  "/urls",
  requireAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 50);
    const offset = (page - 1) * limit;

    const urlResult = await pool.query(
      `
      SELECT *
      FROM short_urls
      ORDER BY created_at DESC
      LIMIT $1
      OFFSET $2
      `,
      [limit, offset],
    );

    const countResult = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM short_urls
      `,
    );

    const total = Number(countResult.rows[0].total);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      urls: urlResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }),
);

router.get(
  "/:shortCode",
  asyncHandler(async (req, res) => {
    const { shortCode } = req.params;

    const cacheKey = `shorturl:${shortCode}`;
    const cachedUrl = await redis.get(cacheKey);

    if (cachedUrl) {
      if (
        cachedUrl.expires_at &&
        new Date(cachedUrl.expires_at).getTime() < Date.now()
      ) {
        await redis.del(cacheKey);

        return res.status(410).json({
          success: false,
          message: "Short URL has expired",
        });
      }

      // increment clicks
      await pool.query(
        `
        UPDATE short_urls
        SET clicks = clicks + 1
        WHERE short_code = $1`,
        [shortCode],
      );

      return res.redirect(302, cachedUrl.original_url);
    }

    // 2. اگر Redis نداشت → PostgreSQL
    const result = await pool.query(
      `
      SELECT original_url, expires_at
      FROM short_urls
      WHERE short_code = $1
      `,
      [shortCode],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Short URL not found",
      });
    }

    const url = result.rows[0];

    if (url.expires_at && new Date(url.expires_at).getTime() < Date.now()) {
      return res.status(410).json({
        success: false,
        message: "Short URL has expired",
      });
    }

    // 4. ذخیره در Redis
    await redis.set(
      cacheKey,
      {
        original_url: url.original_url,
        expires_at: url.expires_at,
      },
      {
        ex: 3600,
      },
    );
    console.log("source: POSTGRES");
    await pool.query(
      `
      UPDATE short_urls
      SET clicks = clicks + 1
      WHERE short_code = $1
      `,
      [shortCode],
    );

    res.redirect(302, url.original_url);
  }),
);

router.delete(
  "/urls/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    console.log("REQ USER:", req.user);
    console.log("URL ID:", req.params.id);
    const { id } = req.params;
    const result = await pool.query(
      `
      DELETE FROM short_urls
      WHERE id = $1
      AND user_id = $2
      RETURNING id, short_code
      `,
      [id, req.user.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "URL not found or you don't have permission to delete it",
      });
    }

    const shortCode = result.rows[0].short_code;

    await redis.del(`shorturl:${shortCode}`);
    await redis.del("allUrls");

    return res.status(200).json({
      success: true,
      message: "URL deleted successfully",
    });
  }),
);

module.exports = router;
