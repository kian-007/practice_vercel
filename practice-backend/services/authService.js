const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { sendResetEmail } = require("../email");
const redis = require("../config/redis");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const RESETOKEN_SECRET = process.env.RESETOKEN_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;

// Register
async function registerUser(email, password) {
  const existing = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  if (existing.rows.length > 0) {
    return {
      success: false,
      message: "This email is already registered :(",
    };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await pool.query(
    "INSERT INTO users (email, password, role) VALUES ($1, $2, $3)",
    [email, hashedPassword, "user"],
  );

  return {
    success: true,
    message: "Registration successful :D",
  };
}

// Login
async function loginUser(email, password, userAgent) {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  const user = result.rows[0];

  const isPasswordCorrect =
    user && (await bcrypt.compare(password, user.password));

  if (!isPasswordCorrect) {
    return {
      success: false,
      message: "wrong email or password",
    };
  }

  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "15m" },
  );

  // Generate a unique refresh token, as in the original auth.js
  const refreshToken = jwt.sign(
    { id: user.id, jti: crypto.randomUUID() },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  );

  // Store refresh token and device information
  await pool.query(
    `INSERT INTO refresh_tokens(user_id, token, user_agent)
     VALUES ($1, $2, $3)`,
    [user.id, refreshToken, userAgent],
  );

  // Clear cached sessions for this user
  await redis.del(`sessions:${user.id}`);

  return {
    success: true,
    message: "successful login :D",
    accessToken,
    refreshToken,
  };
}

// Change password
async function changePassword(email, currentPassword, newPassword) {
  const result = await pool.query(
    "SELECT id, password FROM users WHERE email = $1",
    [email],
  );

  const user = result.rows[0];

  if (!user) {
    return {
      httpStatus: 404,
      body: {
        success: false,
        message: "User not found",
      },
    };
  }

  const isPasswordCorrect = await bcrypt.compare(
    currentPassword,
    user.password,
  );

  if (!isPasswordCorrect) {
    return {
      httpStatus: 401,
      body: {
        success: false,
        message: "Current password is incorrect",
      },
    };
  }

  if (currentPassword === newPassword) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        message: "New password must be different from your current password",
      },
    };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
    hashedPassword,
    user.id,
  ]);

  return {
    httpStatus: 200,
    body: {
      success: true,
      message: "Password changed successfully",
    },
  };
}

// Forgot password
async function forgotPassword(email) {
  const userResult = await pool.query(
    "SELECT id, email FROM users WHERE email = $1",
    [email],
  );

  const user = userResult.rows[0];

  // Same response whether the email exists or not
  if (!user) {
    return {
      success: true,
      message: "If this email exists, a reset link has been sent.",
    };
  }

  // Delete previous reset tokens for this user
  await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [
    user.id,
  ]);

  // Create a reset token valid for 15 minutes
  const resetToken = jwt.sign({ userId: user.id }, RESETOKEN_SECRET, {
    expiresIn: "15m",
  });

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

  return {
    success: true,
    message: "If this email exists, a reset link has been sent.",
  };
}

// Reset password
async function resetPassword(token, newPassword) {
  if (!token || !newPassword) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        message: "Token and new password are required",
      },
    };
  }

  const tokenResult = await pool.query(
    `
    SELECT *
    FROM password_reset_tokens
    WHERE token = $1
    `,
    [token],
  );

  if (tokenResult.rows.length === 0) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        message: "Invalid or expired reset token",
      },
    };
  }

  const resetToken = tokenResult.rows[0];

  // Check whether the reset token has expired
  if (new Date(resetToken.expires_at).getTime() < Date.now()) {
    await pool.query(
      `
      DELETE FROM password_reset_tokens
      WHERE id = $1
      `,
      [resetToken.id],
    );

    return {
      httpStatus: 400,
      body: {
        success: false,
        message: "Invalid or expired reset token",
      },
    };
  }

  const userResult = await pool.query(
    "SELECT password FROM users WHERE id = $1",
    [resetToken.user_id],
  );

  const user = userResult.rows[0];

  if (!user) {
    return {
      httpStatus: 404,
      body: {
        success: false,
        message: "user not found",
      },
    };
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password);

  if (isSamePassword) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        message: "New password must be different from your last password",
      },
    };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Update the user's password
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

    // Delete the used reset token
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

  return {
    httpStatus: 200,
    body: {
      success: true,
      message: "Password reset successfully",
    },
  };
}

// Logout
async function logout(refreshToken) {
  if (refreshToken) {
    const result = await pool.query(
      `
      DELETE FROM refresh_tokens
      WHERE token = $1
      RETURNING user_id
      `,
      [refreshToken],
    );

    const userId = result.rows[0]?.user_id;

    if (userId) {
      await redis.del(`sessions:${userId}`);
    }
  }

  return { success: true };
}

// Refresh tokens
async function refreshTokens(refreshToken) {
  if (!refreshToken) {
    return {
      httpStatus: 401,
      body: { message: "No refresh token" },
    };
  }

  try {
    jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch (err) {
    return {
      httpStatus: 401,
      body: { message: "Invalid refresh token" },
    };
  }

  const tokenResult = await pool.query(
    "SELECT * FROM refresh_tokens WHERE token = $1",
    [refreshToken],
  );

  if (tokenResult.rows.length === 0) {
    return {
      httpStatus: 401,
      body: {
        success: false,
        message: "Refresh token not found",
      },
    };
  }

  const tokenRow = tokenResult.rows[0];

  const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
    tokenRow.user_id,
  ]);

  const user = userResult.rows[0];

  if (!user) {
    return {
      httpStatus: 401,
      body: {
        success: false,
        message: "User not found",
      },
    };
  }

  const newAccessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "15m" },
  );

  // Generate a unique replacement refresh token
  const newRefreshToken = jwt.sign(
    { id: user.id, jti: crypto.randomUUID() },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  );

  // Rotate the stored refresh token
  await pool.query(
    `
    UPDATE refresh_tokens
    SET token = $1, last_used_at = NOW()
    WHERE token = $2
    `,
    [newRefreshToken, refreshToken],
  );

  return {
    success: true,
    newAccessToken,
    newRefreshToken,
  };
}

module.exports = {
  registerUser,
  loginUser,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  refreshTokens,
};
