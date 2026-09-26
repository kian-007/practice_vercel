const app = require("./app");
const http = require("http");
const { setupWebSocket } = require("./websocket");
const { pool } = require("./config/db");

// ---------- ساخت جدول و راه‌اندازی سرور ----------
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
setupWebSocket(server);

(async () => {
  //-------- USERS ---------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT
    )
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
  `);

  //--------- REFRESH TOKENS ---------
  await pool.query(`
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW()
  )
`);
  await pool.query(`
  ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS user_agent TEXT
`);
  await pool.query(`
  ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP DEFAULT NOW()
`);
  //--------- RESET TOKENS --------
  await pool.query(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`);
  await pool.query(`
  ALTER TABLE password_reset_tokens
  ALTER COLUMN expires_at TYPE TIMESTAMPTZ
  USING expires_at AT TIME ZONE 'UTC';
`);
  //--------- SHORT URLS --------
  await pool.query(`
  CREATE TABLE IF NOT EXISTS short_urls (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    short_code VARCHAR(20) UNIQUE NOT NULL,
    clicks INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`);

  // app.listen(5000, () => console.log("backend run at port:5000"));
  server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
})();
