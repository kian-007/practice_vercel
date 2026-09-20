const { Pool } = require("pg");
const knexFactory = require("knex");

const pool = new Pool({
  connectionString: process.env.CONNECTION_STRING, // 👈 از Neon
});

const knex = knexFactory({
  client: "pg",
  connection: process.env.CONNECTION_STRING,
});

module.exports = { pool, knex };
