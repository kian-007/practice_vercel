import { describe, expect, test, beforeAll, afterAll } from "vitest";
import request from "supertest";
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

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email IN ($1, $2)", [
    testEmail,
    loginTestEmail,
  ]);

  await pool.end();
});
