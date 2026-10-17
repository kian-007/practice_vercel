const authService = require("../services/authService");

const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

// Send a service result as an HTTP response
function sendServiceResponse(res, result) {
  if (result.httpStatus !== undefined) {
    return res.status(result.httpStatus).json(result.body);
  }

  return res.json(result);
}

// Register
async function handleRegister(req, res) {
  const { email, password } = req.body;

  const result = await authService.registerUser(email, password);

  return res.json(result);
}

// Login
async function handleLogin(req, res) {
  const { email, password } = req.body;

  const result = await authService.loginUser(
    email,
    password,
    req.headers["user-agent"] || "Unknown",
  );

  if (!result.success) {
    return res.json(result);
  }

  res.cookie("token", result.accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", result.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    success: true,
    message: result.message,
  });
}

// Change password
async function handleChangePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  const result = await authService.changePassword(
    req.user.email,
    currentPassword,
    newPassword,
  );

  return sendServiceResponse(res, result);
}

// Forgot password
async function handleForgotPassword(req, res) {
  const { email } = req.body;

  const result = await authService.forgotPassword(email);

  return res.json(result);
}

// Reset password
async function handleResetPassword(req, res) {
  const { token, newPassword } = req.body;

  const result = await authService.resetPassword(token, newPassword);

  return sendServiceResponse(res, result);
}

// Logout
async function handleLogout(req, res) {
  const refreshToken = req.cookies.refreshToken;

  await authService.logout(refreshToken);

  res.clearCookie("token", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  return res.json({ success: true });
}

// Refresh tokens
async function handleRefresh(req, res) {
  const refreshToken = req.cookies.refreshToken;

  const result = await authService.refreshTokens(refreshToken);

  if (result.httpStatus !== undefined) {
    return res.status(result.httpStatus).json(result.body);
  }

  res.cookie("token", result.newAccessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", result.newRefreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({ success: true });
}

module.exports = {
  handleRegister,
  handleLogin,
  handleChangePassword,
  handleForgotPassword,
  handleResetPassword,
  handleLogout,
  handleRefresh,
};
