const app = require("./app");
const { pool } = require("./config/db");

// ---------- ساخت جدول و راه‌اندازی سرور ----------
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT
    )
  `);
  // console.log("users table is ready");

  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
  `);

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

  app.listen(5000, () => console.log("backend run at port:5000"));
})();
