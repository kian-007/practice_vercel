const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const sessionRoutes = require("./routes/sessions");
const adminRoutes = require("./routes/admin");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());

const CLIENT_URL = process.env.CLIENT_URL;

app.use(
  cors({
    origin: [`${CLIENT_URL}`, "http://localhost:5173"], // 👈 آدرس فرانت‌اندت
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

app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", sessionRoutes);
app.use("/", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
