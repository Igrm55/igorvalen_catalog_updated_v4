'use strict';

let pool;
let poolPromise;

async function initPool() {
  if (pool) return pool;
  if (poolPromise) return poolPromise;

  poolPromise = (async () => {
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

    const { newDb } = await import('pg-mem');
    const db = newDb();
    const adapter = db.adapters.createPg();
    pool = new adapter.Pool();
    return pool;
  })();

  return poolPromise;
}

function getPool() {
  if (!pool) throw new Error('Pool não inicializado');
  return pool;
}

module.exports = { initPool, getPool };
