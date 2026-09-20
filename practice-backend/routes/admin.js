const express = require("express");
const router = express.Router();
const { knex } = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");

router.get(
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

module.exports = router;
