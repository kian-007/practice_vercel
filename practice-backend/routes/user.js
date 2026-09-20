const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");

router.get("/me", requireAuth, (req, res) => {
  res.json({ loggedIn: true, email: req.user.email, role: req.user.role });
});

module.exports = router;
