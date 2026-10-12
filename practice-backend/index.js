const app = require("./app");
const http = require("http");
const { setupWebSocket } = require("./websocket");
const { initDatabase } = require("./db-init/init");

// ---------- ساخت جدول و راه‌اندازی سرور ----------
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
setupWebSocket(server);

(async () => {
  await initDatabase();
  console.log("kir");
  // app.listen(5000, () => console.log("backend run at port:5000"));
  server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
})();
