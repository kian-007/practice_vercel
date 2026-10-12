import { describe, expect, test, beforeAll, afterAll } from "vitest";
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const http = require("http");

const { setupWebSocket } = require("../websocket");

let server;
let wss;
let port;

function connect(token) {
  return new WebSocket(`ws://127.0.0.1:${port}`, {
    headers: token ? { Cookie: `token=${token}` } : {},
  });
}

function waitForMessage(socket, type, userId) {
  return new Promise((resolve, reject) => {
    function onMessage(rawData) {
      const data = JSON.parse(rawData);

      if (
        data.type === type &&
        (userId === undefined || data.userId === userId)
      ) {
        socket.off("message", onMessage);
        resolve(data);
      }
    }

    socket.on("message", onMessage);
    socket.once("error", reject);
  });
}

describe("WebSocket authentication", () => {
  beforeAll(async () => {
    server = http.createServer();
    wss = setupWebSocket(server);

    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });

    port = server.address().port;
  });

  test("should connect with a valid token", async () => {
    const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET, {
      expiresIn: "1m",
    });
    const socket = connect(token);
    try {
      const message = await new Promise((resolve, reject) => {
        socket.on("message", (rawData) => {
          const data = JSON.parse(rawData);
          if (data.type === "welcome") {
            resolve(data);
          }
        });
        socket.once("error", reject);
      });
      expect(message.type).toBe("welcome");
    } finally {
      if (socket.readyState !== WebSocket.CLOSED) {
        socket.terminate();
      }
    }
  });

  test("should reject a connection without a token", async () => {
    const socket = connect(null);
    const code = await new Promise((resolve, reject) => {
      socket.once("close", (closeCode) => resolve(closeCode));
      socket.once("error", reject);
    });
    expect(code).toBe(1008);
  });

  test("should broadcast user_offline when user disconnects", async () => {
    const token1 = jwt.sign({ id: 1 }, process.env.JWT_SECRET);
    const token2 = jwt.sign({ id: 2 }, process.env.JWT_SECRET);

    const user1 = connect(token1);
    const user2 = connect(token2);

    try {
      // منتظر اتصال کامل هر دو کاربر می‌مانیم
      await Promise.all([
        waitForMessage(user1, "welcome"),
        waitForMessage(user2, "welcome"),
      ]);
      // قبل از قطع اتصال، منتظر رویداد آفلاین می‌شویم
      const offlinePromise = waitForMessage(user2, "user_offline", "1");
      user1.close();
      const message = await offlinePromise;

      expect(message.type).toBe("user_offline");
      expect(message.userId).toBe("1");
    } finally {
      if (user1.readyState !== WebSocket.CLOSED) {
        user1.terminate();
      }

      if (user2.readyState !== WebSocket.CLOSED) {
        user2.terminate();
      }
    }
  });

  afterAll(async () => {
    wss.clients.forEach((socket) => socket.terminate());
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections?.();
    });
  });
});
