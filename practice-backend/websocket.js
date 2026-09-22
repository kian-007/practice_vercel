const WebSocket = require("ws");

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (socket) => {
    console.log("Client connected");

    socket.send(
      JSON.stringify({
        type: "welcome",
        message: "Connected to WebSocket server",
      }),
    );

    socket.on("message", (message) => {
      console.log("Message:", message.toString());
    });

    socket.on("close", () => {
      console.log("Client disconnected");
    });
  });

  return wss;
}

module.exports = setupWebSocket;
