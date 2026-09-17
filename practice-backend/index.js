const { sendResetEmail } = require("./email");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { Pool } = require("pg");
const knexFactory = require("knex");
const bcrypt = require("bcryptjs");

const app = express();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const RESETOKEN_SECRET = process.env.RESETOKEN_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;

app.use(
  cors({
    origin: [`${CLIENT_URL}`, "http://localhost:5173"], // 👈 آدرس فرانت‌اندت
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

const pool = new Pool({
  connectionString: process.env.CONNECTION_STRING, // 👈 از Neon
});
const knex = knexFactory({
  client: "pg",
  connection: process.env.CONNECTION_STRING,
});

// ---------- Middleware چک کردن لاگین ----------
function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ loggedIn: false });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ loggedIn: false });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res
        .status(403)
        .json({ message: "You don't have permission to access this resource" });
    }
    next();
  };
}

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }
  next();
}

const registerValidation = [
  body("email").isEmail().withMessage("Please enter a valid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

const loginValidation = [
  body("email").notEmpty().withMessage("Email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

// ---------- Routes ----------
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.post(
  "/register",
  registerValidation,
  handleValidation,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.json({
        success: false,
        message: "This email is already registered :(",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, $3)",
      [email, hashedPassword, "user"],
    );
    res.json({ success: true, message: "Registration successful :D" });
  }),
);

app.post(
  "/login",
  loginValidation,
  handleValidation,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];
    const isPasswordCorrect =
      user && (await bcrypt.compare(password, user.password));

    if (isPasswordCorrect) {
      const accessToken = jwt.sign(
        { email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "15m" },
      );
      const refreshToken = jwt.sign({ email: user.email }, JWT_REFRESH_SECRET, {
        expiresIn: "7d",
      });

      // User-Agent دستگاه
      const userAgent = req.headers["user-agent"] || "Unknown";

      await pool.query(
        `INSERT INTO refresh_tokens(user_id, token, user_agent)VALUES ($1, $2, $3)`,
        [user.id, refreshToken, userAgent],
      );

      res.cookie("token", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 15 * 60 * 1000,
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json({ success: true, message: "successful login :D" });
    } else {
      res.json({ success: false, message: "wrong email or password" });
    }
  }),
);

app.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const userResult = await pool.query(
      "SELECT id, email FROM users WHERE email = $1",
      [email],
    );
    const user = userResult.rows[0];
    // پاسخ یکسان برای امنیت
    if (!user) {
      return res.json({
        success: true,
        message: "If this email exists, a reset link has been sent.",
      });
    }
    // توکن‌های قبلی این کاربر را حذف کن
    await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [
      user.id,
    ]);

    // JWT با عمر 15 دقیقه
    const resetToken = jwt.sign({ userId: user.id }, RESETOKEN_SECRET, {
      expiresIn: "15m",
    });

    // زمان انقضا را خود Node محاسبه می‌کند
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `
      INSERT INTO password_reset_tokens
        (user_id, token, expires_at)
      VALUES
        ($1, $2, $3)
      `,
      [user.id, resetToken, expiresAt],
    );

    const resetLink = `${CLIENT_URL}/reset-password?token=${resetToken}`;

    console.log("RESET LINK: ", resetLink);
    await sendResetEmail(email, resetLink);

    console.log(" I'm the king");

    res.json({
      success: true,
      message: "If this email exists, a reset link has been sent.",
    });
  }),
);

app.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    // 1. بررسی ورودی
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }
    // 2. پیدا کردن token
    const tokenResult = await pool.query(
      `
      SELECT *
      FROM password_reset_tokens
      WHERE token = $1`,
      [token],
    );
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }
    const resetToken = tokenResult.rows[0];
    // 3. بررسی expiration
    if (new Date(resetToken.expires_at).getTime() < Date.now()) {
      // توکن منقضی شده، پاکش کن
      await pool.query(
        `
        DELETE FROM password_reset_tokens
        WHERE id = $1`,
        [resetToken.id],
      );
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }
    // 4. Hash کردن password جدید
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // 5. تغییر password
    await pool.query(
      `
      UPDATE users
      SET password = $1
      WHERE id = $2
      `,
      [hashedPassword, resetToken.user_id],
    );
    // 6. حذف token
    await pool.query(
      `
      DELETE FROM password_reset_tokens
      WHERE id = $1
      `,
      [resetToken.id],
    );

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  }),
);

app.get("/me", requireAuth, (req, res) => {
  res.json({ loggedIn: true, email: req.user.email, role: req.user.role });
});

app.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [
        refreshToken,
      ]);
    }
    res.clearCookie("token");
    res.clearCookie("refreshToken");
    res.json({ success: true });
  }),
);

//-----(بونوس اختیاری) یه route برای «خروج از همه‌ی دستگاه‌ها»----
app.post(
  "/logout-all",
  requireAuth,
  asyncHandler(async (req, res) => {
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

    await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [
      user.id,
    ]);

    res.clearCookie("token");
    res.clearCookie("refreshToken");
    res.json({
      success: true,
      message: "Logged out from all devices",
    });
  }),
);

app.get(
  "/admin/users",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const allowedSortFields = ["id", "email", "role"];
    const sortField = allowedSortFields.includes(req.query.sort)
      ? req.query.sort
      : "id";
    const sortOrder = req.query.order === "desc" ? "desc" : "asc";

    let queryBuilder = knex("users").select("id", "email", "role");

    if (req.query.role) {
      queryBuilder = queryBuilder.where("role", req.query.role);
    }

    const results = await queryBuilder
      .orderBy(sortField, sortOrder)
      .limit(limit)
      .offset(offset);

    res.json({ page, limit, results });
  }),
);

app.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }
    let payload;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    const tokenResult = await pool.query(
      "SELECT * FROM refresh_tokens WHERE token = $1",
      [refreshToken],
    );
    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found",
      });
    }
    const tokenRow = tokenResult.rows[0];
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      tokenRow.user_id,
    ]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }
    const newAccessToken = jwt.sign(
      { email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "15m" },
    );
    const newRefreshToken = jwt.sign(
      { email: user.email },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );
    await pool.query(
      `UPDATE refresh_tokens SET token = $1, last_used_at = NOW() WHERE token = $2`,
      [newRefreshToken, refreshToken],
    );
    res.cookie("token", newAccessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ success: true });
  }),
);

app.get(
  "/sessions",
  requireAuth,
  asyncHandler(async (req, res) => {
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

    res.json({
      success: true,
      sessions: result.rows,
    });
  }),
);

// ======================================================
// DELETE ONE SESSION
// ======================================================

app.delete(
  "/sessions/:id",

  requireAuth,

  asyncHandler(async (req, res) => {
    const sessionId = req.params.id;

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

    const result = await pool.query(
      `
      DELETE FROM refresh_tokens
      WHERE id = $1
      AND user_id = $2
      RETURNING id
      `,
      [sessionId, user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    res.json({
      success: true,
      message: "Session revoked",
    });
  }),
);

//-------error 404----------
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

//-------error 500----------
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(500)
    .json({ success: false, message: "Something went wrong on the server" });
});

// ---------- ساخت جدول و راه‌اندازی سرور ----------
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT
    )
  `);
  // console.log("users table is ready");

  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
  `);

  await pool.query(`
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW()
  )
`);

  await pool.query(`
  ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS user_agent TEXT
`);

  await pool.query(`
  ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP DEFAULT NOW()
`);

  await pool.query(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`);
  await pool.query(`
  ALTER TABLE password_reset_tokens
ALTER COLUMN expires_at TYPE TIMESTAMPTZ
USING expires_at AT TIME ZONE 'UTC';
`);

  app.listen(5000, () => console.log("backend run at port:5000"));
})();
