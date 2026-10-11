const { Pool } = require("pg");
const knexFactory = require("knex");

const pool = new Pool({
  // connectionString: process.env.CONNECTION_STRING_NEON, // 👈 از Neon
  connectionString: process.env.CONNECTION_STRING,
});

const knex = knexFactory({
  client: "pg",
  // connection: process.env.CONNECTION_STRING_NEON,
  connection: process.env.CONNECTION_STRING,
});

module.exports = { pool, knex };
