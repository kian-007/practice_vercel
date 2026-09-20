const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

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

module.exports = { requireAuth, requireRole };
