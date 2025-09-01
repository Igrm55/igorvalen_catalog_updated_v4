'use strict';

const { Pool } = require('pg');

 codex/refactor-and-enhance-product-catalog-application-q7pjy2
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

module.exports = pool;
 main
