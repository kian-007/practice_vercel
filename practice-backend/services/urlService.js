const crypto = require("crypto");
const redis = require("../config/redis");
const { pool } = require("../config/db");
const { broadcast } = require("../websocket");

// Generate a random short code
function generateShortCode() {
  return crypto.randomBytes(4).toString("base64url");
}

// Create a shortened URL in PostgreSQL
async function createUrl(userId, originalUrl, expiresAt) {
  const shortCode = generateShortCode();

  const result = await pool.query(
    `
      INSERT INTO short_urls
      (user_id, original_url, short_code, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [userId, originalUrl, shortCode, expiresAt || null],
  );

  // Invalidate the URLs cache
  await redis.del("allUrls");

  // Notify connected WebSocket clients
  broadcast({
    type: "url_created",
    url: result.rows[0],
  });

  return result.rows[0];
}

// Get URLs with pagination
async function getUrls(page, limit) {
  const offset = (page - 1) * limit;

  // Fetch URLs for the current page
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

  // Count all URLs for pagination
  const countResult = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM short_urls
    `,
  );

  const total = Number(countResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);

  // Return URLs and pagination information
  return {
    urls: urlResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

// Find a short URL and prepare it for redirection
async function getUrlForRedirect(shortCode) {
  const cacheKey = `shorturl:${shortCode}`;

  // First, check Redis cache
  const cachedUrl = await redis.get(cacheKey);

  if (cachedUrl) {
    // Check whether the cached URL has expired
    if (
      cachedUrl.expires_at &&
      new Date(cachedUrl.expires_at).getTime() < Date.now()
    ) {
      await redis.del(cacheKey);
      return { status: "expired" };
    }

    console.log("source: redis");
    // Increment click count
    await pool.query(
      `
        UPDATE short_urls
        SET clicks = clicks + 1
        WHERE short_code = $1
      `,
      [shortCode],
    );

    return {
      status: "found",
      originalUrl: cachedUrl.original_url,
    };
  }

  // If Redis has no result, search PostgreSQL
  const result = await pool.query(
    `
      SELECT original_url, expires_at
      FROM short_urls
      WHERE short_code = $1
    `,
    [shortCode],
  );

  // Return not_found if the short code doesn't exist
  if (result.rowCount === 0) {
    return { status: "not_found" };
  }

  const url = result.rows[0];

  // Check whether the database URL has expired
  if (url.expires_at && new Date(url.expires_at).getTime() < Date.now()) {
    return { status: "expired" };
  }

  // Save the URL in Redis for one hour
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

  // Increment click count
  await pool.query(
    `
      UPDATE short_urls
      SET clicks = clicks + 1
      WHERE short_code = $1
    `,
    [shortCode],
  );

  return {
    status: "found",
    originalUrl: url.original_url,
  };
}

// Delete a URL belonging to the specified user
async function deleteUrl(id, userId) {
  const result = await pool.query(
    `
      DELETE FROM short_urls
      WHERE id = $1
      AND user_id = $2
      RETURNING id, short_code
    `,
    [id, userId],
  );

  // Return null if the URL doesn't exist or isn't owned by the user
  if (result.rowCount === 0) {
    return null;
  }

  const deletedUrl = result.rows[0];

  // Remove the deleted URL from Redis cache
  await redis.del(`shorturl:${deletedUrl.short_code}`);
  await redis.del("allUrls");

  // Notify connected WebSocket clients
  broadcast({
    type: "url_deleted",
    id: deletedUrl.id,
  });

  return deletedUrl;
}

// Export service functions for use by the controller
module.exports = {
  createUrl,
  getUrls,
  getUrlForRedirect,
  deleteUrl,
};
