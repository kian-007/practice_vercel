import { describe, expect, test, afterAll } from "vitest";
import request from "supertest";
const { pool } = require("../config/db");

const app = require("../app");
const testEmail = "vitest-user-004@example.com";

describe("GET /", () => {
  test("should return API is running", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("API is running");
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
  await pool.query("DELETE FROM users WHERE email = $1", [testEmail]);

  await pool.end();
});
