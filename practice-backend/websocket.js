const WebSocket = require("ws");

let wss;
function setupWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (socket) => {
    console.log("Client connected");

    socket.send(
      JSON.stringify({
        type: "welcome",
        message: "Connected to WebSocket server",
      }),
    );

    socket.on("close", () => {
      console.log("Client disconnected");
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

module.exports = { setupWebSocket, broadcast };
