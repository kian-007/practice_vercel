const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { pool } = require("./config/db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const sessionRoutes = require("./routes/sessions");
const adminRoutes = require("./routes/admin");
const urlRoutes = require("./routes/urls");
const messagesRoutes = require("./routes/messages");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());

const CLIENT_URL = process.env.CLIENT_URL;
const allowedOrigins = ["http://localhost:5173", CLIENT_URL].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// ---------- Routes ----------
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok" });
  } catch (err) {
    res.status(503).json({ status: "error" });
  }
});

app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", sessionRoutes);
app.use("/", adminRoutes);
app.use("/", urlRoutes);
app.use("/", messagesRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
