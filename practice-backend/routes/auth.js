const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { sendResetEmail } = require("../email");
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
const redis = require("../config/redis");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const RESETOKEN_SECRET = process.env.RESETOKEN_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;

const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

router.post(
  "/register",
  registerLimiter,
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

router.post(
  "/login",
  loginLimiter,
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
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "15m" },
      );
      const refreshToken = jwt.sign(
        { id: user.id, email: user.email },
        JWT_REFRESH_SECRET,
        {
          expiresIn: "7d",
        },
      );

      // User-Agent دستگاه
      const userAgent = req.headers["user-agent"] || "Unknown";

      await pool.query(
        `INSERT INTO refresh_tokens(user_id, token, user_agent)VALUES ($1, $2, $3)`,
        [user.id, refreshToken, userAgent],
      );

      await redis.del(`sessions:${user.id}`);

      res.cookie("token", accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });
      res.cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json({ success: true, message: "successful login :D" });
    } else {
      res.json({ success: false, message: "wrong email or password" });
    }
  }),
);

router.patch(
  "/change-password",
  requireAuth,
  changePasswordValidation,
  handleValidation,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // پیدا کردن کاربر
    const result = await pool.query(
      "SELECT id, password  FROM users WHERE email = $1",
      [req.user.email],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // بررسی رمز فعلی
    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // رمز جدید نباید با رمز فعلی یکی باشد
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your current password",
      });
    }

    // Hash کردن رمز جدید
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // تغییر رمز در دیتابیس
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      user.id,
    ]);

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  }),
);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
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

    res.json({
      success: true,
      message: "If this email exists, a reset link has been sent.",
    });
  }),
);

router.post(
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
    const userResult = await pool.query(
      `SELECT password FROM users WHERE id = $1`,
      [resetToken.user_id],
    );
    const user = userResult.rows[0];
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "user not found" });
    }
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your last password",
      });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 5. تغییر password
      const updateResult = await client.query(
        `
      UPDATE users
      SET password = $1
      WHERE id = $2
      `,
        [hashedPassword, resetToken.user_id],
      );
      if (updateResult.rowCount !== 1) {
        throw new Error("User password was not updated");
      }
      // 6. حذف token
      const deleteResult = await client.query(
        `
      DELETE FROM password_reset_tokens
      WHERE id = $1
      `,
        [resetToken.id],
      );
      if (deleteResult.rowCount !== 1) {
        throw new Error("Reset token was not deleted");
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  }),
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const result = await pool.query(
        "DELETE FROM refresh_tokens WHERE token = $1 RETURNING user_id",
        [refreshToken],
      );
      const userId = result.rows[0]?.user_id;
      if (userId) {
        await redis.del(`sessions:${userId}`);
      }
    }

    res.clearCookie("token", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    res.json({ success: true });
  }),
);

router.post(
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
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "15m" },
    );
    const newRefreshToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );
    await pool.query(
      `UPDATE refresh_tokens SET token = $1, last_used_at = NOW() WHERE token = $2`,
      [newRefreshToken, refreshToken],
    );
    res.cookie("token", newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ success: true });
  }),
);

module.exports = router;
