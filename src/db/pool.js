'use strict';

let pool;

 codex/corrigir-problemas-de-carregamento-w3uit8
async function initPool() {
  if (pool) return pool;

  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = require('pg');
      const pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      });
      await pgPool.query('SELECT 1');
      pool = pgPool;
      return pool;
    } catch (err) {
      console.warn('Postgres indisponível, usando banco em memória');
    }
  }

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
} else {
  const { newDb } = require('pg-mem');
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  pool = new Pool();
}
 main

  const { newDb } = require('pg-mem');
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  pool = new Pool();
  return pool;
}

function getPool() {
  if (!pool) throw new Error('Pool não inicializado');
  return pool;
}

module.exports = { initPool, getPool };
