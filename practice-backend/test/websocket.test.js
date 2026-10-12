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
  afterAll(async () => {
    wss.clients.forEach((socket) => socket.terminate());
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections?.();
    });
  });
});
