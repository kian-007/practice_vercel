import { describe, expect, test, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
const { pool } = require("../config/db");

const app = require("../app");
const testEmail = "vitest-user-004@example.com";
const loginTestEmail = "vitest-login@example.com";
const loginTestPassword = "StrongPassword123";

describe("GET /", () => {
  test("should return API is running", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("API is running");
  });
});

beforeAll(async () => {
  await request(app).post("/register").send({
    email: loginTestEmail,
    password: loginTestPassword,
  });
});

describe("POST /login", () => {
  test("should return wrong email or password", async () => {
    const response = await request(app).post("/login").send({
      email: "doesnotexist@gmail.com",
      password: "wrongpassword123",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("wrong email or password");
  });

  test("should login successfully", async () => {
    const response = await request(app).post("/login").send({
      email: loginTestEmail,
      password: loginTestPassword,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const cookies = response.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some((cookie) => cookie.startsWith("token="))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith("refreshToken="))).toBe(
      true,
    );
  });
});

describe("GET /me", () => {
  test("should return 401 without authentication", async () => {
    const response = await request(app).get("/me");
    expect(response.status).toBe(401);
  });

  test("should return user when authenticated", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent.post("/login").send({
      email: loginTestEmail,
      password: loginTestPassword,
    });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    const response = await agent.get("/me");
    expect(response.status).toBe(200);
    expect(response.body.email).toBe(loginTestEmail);
  });

  test("should return 401 with an invalid access token", async () => {
    const response = await request(app)
      .get("/me")
      .set("Cookie", "token=invalid-token");
    expect(response.status).toBe(401);
  });

  test("should return 401 with an expired access token", async () => {
    const expiredToken = jwt.sign(
      {
        id: 1,
        email: loginTestEmail,
        role: "user",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: -1,
      },
    );

    const response = await request(app)
      .get("/me")
      .set("Cookie", `token=${expiredToken}`);
    expect(response.status).toBe(401);
  });
});

describe("POST /refresh", () => {
  test("should return 401 when refresh token is missing", async () => {
    const response = await request(app).post("/refresh");
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("No refresh token");
  });

  test("should return 401 when refresh token is invalid", async () => {
    const response = await request(app)
      .post("/refresh")
      .set("Cookie", "refreshToken=invalid-token");

    expect(response.status).toBe(401);

    expect(response.body.message).toBe("Invalid refresh token");
  });

  test("should refresh tokens with a valid refresh token", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent.post("/login").send({
      email: loginTestEmail,
      password: loginTestPassword,
    });
    expect(loginResponse.status).toBe(200);

    const refreshResponse = await agent.post("/refresh");
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.success).toBe(true);
    const cookies = refreshResponse.headers["set-cookie"];
    expect(cookies.some((cookie) => cookie.startsWith("token="))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith("refreshToken="))).toBe(
      true,
    );
  });

  test("should reject the old refresh token after rotation", async () => {
    const agent = request.agent(app);
    // Login
    const loginResponse = await agent.post("/login").send({
      email: loginTestEmail,
      password: loginTestPassword,
    });
    expect(loginResponse.status).toBe(200);
    // Refresh Token قدیمی را از Cookieهای Login پیدا می‌کنیم
    const loginCookies = loginResponse.headers["set-cookie"];
    const oldRefreshCookie = loginCookies.find((cookie) =>
      cookie.startsWith("refreshToken="),
    );
    expect(oldRefreshCookie).toBeDefined();
    // Refresh → توکن‌ها rotate می‌شوند
    const refreshResponse = await agent.post("/refresh");
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.success).toBe(true);
    // دوباره Refresh Token قدیمی را می‌فرستیم

    const oldTokenResponse = await request(app)
      .post("/refresh")
      .set("Cookie", oldRefreshCookie);
    expect(oldTokenResponse.status).toBe(401);
    expect(oldTokenResponse.body.message).toBe("Refresh token not found");
  });

  test("should allow the new refresh token after rotation", async () => {
    const agent = request.agent(app);
    // Login
    const loginResponse = await agent.post("/login").send({
      email: loginTestEmail,
      password: loginTestPassword,
    });
    expect(loginResponse.status).toBe(200);
    // First refresh → Token A becomes Token B
    const firstRefresh = await agent.post("/refresh");
    expect(firstRefresh.status).toBe(200);
    expect(firstRefresh.body.success).toBe(true);
    // Second refresh → Token B should work
    const secondRefresh = await agent.post("/refresh");
    expect(secondRefresh.status).toBe(200);
    expect(secondRefresh.body.success).toBe(true);
  });
});

describe("POST /logout", () => {
  test("should logout successfully", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent.post("/login").send({
      email: loginTestEmail,
      password: loginTestPassword,
    });
    expect(loginResponse.status).toBe(200);
    const logoutResponse = await agent.post("/logout");
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);
    const response = await agent.get("/me");
    expect(response.status).toBe(401);
  });

  test("should invalidate refresh token after logout", async () => {
    const agent = request.agent(app);
    // Login
    const loginResponse = await agent.post("/login").send({
      email: loginTestEmail,
      password: loginTestPassword,
    });
    expect(loginResponse.status).toBe(200);
    // Refresh Token فعلی را ذخیره می‌کنیم
    const loginCookies = loginResponse.headers["set-cookie"];
    const refreshCookie = loginCookies.find((cookie) =>
      cookie.startsWith("refreshToken="),
    );
    expect(refreshCookie).toBeDefined();
    // Logout
    const logoutResponse = await agent.post("/logout");
    expect(logoutResponse.status).toBe(200);
    // تلاش برای استفاده از Refresh Token قبلی
    const refreshResponse = await request(app)
      .post("/refresh")
      .set("Cookie", refreshCookie);
    expect(refreshResponse.status).toBe(401);
  });
});

describe("POST /register", () => {
  test("should return 400 when email and password are missing", async () => {
    const response = await request(app).post("/register").send({});
    expect(response.status).toBe(400);
  });

  test("should return 400 for invalid email", async () => {
    const response = await request(app).post("/register").send({
      email: "invalid-email",
      password: "123456",
    });
    expect(response.status).toBe(400);
  });

  test("should return 400 when password is too short", async () => {
    const response = await request(app).post("/register").send({
      email: "test@example.com",
      password: "123",
    });
    expect(response.status).toBe(400);
  });

  test("should register a new user successfully", async () => {
    const response = await request(app).post("/register").send({
      email: testEmail,
      password: "StrongPassword123",
    });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("should reject duplicate email", async () => {
    const response = await request(app).post("/register").send({
      email: testEmail,
      password: "StrongPassword123",
    });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("This email is already registered :(");
  });
});

describe("GET /admin/users", () => {
  test("should return 403 for a regular user", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent.post("/login").send({
      email: loginTestEmail,
      password: loginTestPassword,
    });
    expect(loginResponse.status).toBe(200);

    const response = await agent.get("/admin/users");
    expect(response.status).toBe(403);
  });

  test("should allow an admin user to access admin users", async () => {
    const agent = request.agent(app);
    await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [
      loginTestEmail,
    ]);
    const loginResponse = await agent.post("/login").send({
      email: loginTestEmail,
      password: loginTestPassword,
    });
    expect(loginResponse.status).toBe(200);

    const response = await agent.get("/admin/users");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("results");
    expect(Array.isArray(response.body.results)).toBe(true);

    await pool.query("UPDATE users SET role = 'user' WHERE email = $1", [
      loginTestEmail,
    ]);
  });

  test("should return 401 without authentication", async () => {
    const response = await request(app).get("/admin/users");
    expect(response.status).toBe(401);
  });
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email IN ($1, $2)", [
    testEmail,
    loginTestEmail,
  ]);

  await pool.end();
});
