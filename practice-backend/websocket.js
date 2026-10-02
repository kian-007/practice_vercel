const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");

let wss;
const userSockets = new Map();

function getUserIdFromRequest(req) {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.token;

    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return String(decoded.id);
  } catch {
    return null;
  }
}

function addSocket(userId, socket) {
  const isFirstConnection = !userSockets.has(userId);
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socket);
  if (isFirstConnection) {
    broadcast({ type: "user_online", userId });
  }
}

function removeSocket(userId, socket) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  sockets.delete(socket);
  if (sockets.size === 0) {
    userSockets.delete(userId);
    broadcast({ type: "user_offline", userId });
  }
}

function setupWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (socket, req) => {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      socket.close(1008, "Unauthorized");
      return;
    }

    addSocket(userId, socket);
    console.log(`User ${userId} connected`);

    socket.send(
      JSON.stringify({
        type: "welcome",
        message: "Connected to WebSocket server",
      }),
    );

    socket.send(
      JSON.stringify({
        type: "online_users",
        userIds: Array.from(userSockets.keys()),
      }),
    );

    socket.on("close", () => {
      removeSocket(userId, socket);
      console.log(`User ${userId} disconnected`);
    });
  });

  return wss;
}

function broadcast(data) {
  if (!wss) return;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function sendToUser(userId, data) {
  const sockets = userSockets.get(String(userId));
  if (!sockets) return;

  sockets.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  });
}

module.exports = { setupWebSocket, broadcast, sendToUser };
