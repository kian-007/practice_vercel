const { Pool } = require("pg");
const knexFactory = require("knex");

const pool = new Pool({
  // connectionString: process.env.CONNECTION_STRING, // 👈 از Neon
  connectionString: process.env.CONNECTION_STRING_DOCKERPSQL,
});

const knex = knexFactory({
  client: "pg",
  // connection: process.env.CONNECTION_STRING,
  connection: process.env.CONNECTION_STRING_DOCKERPSQL,
});

module.exports = { pool, knex };
