'use strict';

 codex/refactor-and-enhance-product-catalog-application-q7pjy2
const db = require('../db/pool');

function num(val) {
  return val === null || val === undefined ? null : Number(val);
}

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    codes: row.codes,
    flavors: row.flavors,
    priceUV: num(row.price_uv),
    priceUP: num(row.price_up),
    priceFV: num(row.price_fv),
    priceFP: num(row.price_fp),
    imageUrl: row.image_url,
    imagePublicId: row.image_public_id,
    sortOrder: row.sort_order,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function initializeDatabase() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      codes TEXT,
      flavors TEXT,
      price_uv NUMERIC(12,2),
      price_up NUMERIC(12,2),
      price_fv NUMERIC(12,2),
      price_fp NUMERIC(12,2),
      image_url TEXT,
      image_public_id TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_products_sort ON products(sort_order);');
  await db.query('CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);');
  await db.query('CREATE INDEX IF NOT EXISTS idx_products_name ON products((lower(name)));');
  await db.query('CREATE INDEX IF NOT EXISTS idx_products_category ON products((lower(category)));');

  await db.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id SMALLINT PRIMARY KEY DEFAULT 1,
      categories JSONB DEFAULT '[]'::jsonb,
      show_prices BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await db.query('INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;');
}

function mapSettings(row) {
  const categories = Array.isArray(row.categories) ? row.categories : [];
  const showPrices = row.show_prices !== false;
  return { categories, showPrices, categoriesOrder: categories };
}

async function getSettings() {
  const { rows } = await db.query('SELECT categories, show_prices FROM settings WHERE id=1');
  if (rows[0]) return mapSettings(rows[0]);
  return { categories: [], showPrices: true, categoriesOrder: [] };
}

async function upsertSettings(partial = {}) {
  const fields = [];
  const values = [];
  let idx = 1;
  if (partial.categories !== undefined) {
    fields.push(`categories=$${idx++}`);
    values.push(JSON.stringify(partial.categories));
  }
  if (partial.showPrices !== undefined) {
    fields.push(`show_prices=$${idx++}`);
    values.push(partial.showPrices);
  }
  if (!fields.length) return getSettings();
  const sql = `UPDATE settings SET ${fields.join(', ')}, updated_at=NOW() WHERE id=1 RETURNING *`;
  const { rows } = await db.query(sql, values);
  return mapSettings(rows[0]);
}

async function ensureCategory(cat) {
  if (!cat) return;
  const settings = await getSettings();
  if (!settings.categories.includes(cat)) {
    settings.categories.push(cat);
    await upsertSettings({ categories: settings.categories });
  }
}

async function getAll(filters = {}) {
  const values = [];
  const where = [];
  if (filters.q) {
    values.push(`%${filters.q.toLowerCase()}%`);
    where.push(`(LOWER(name) LIKE $${values.length} OR LOWER(codes) LIKE $${values.length} OR LOWER(category) LIKE $${values.length})`);
  }
  if (filters.category) {
    values.push(filters.category);
    where.push(`category = $${values.length}`);
  }
  const sql = `SELECT * FROM products${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY sort_order ASC, id ASC`;
  const { rows } = await db.query(sql, values);
  return rows.map(mapProduct);
}

async function getById(id) {
  const { rows } = await db.query('SELECT * FROM products WHERE id=$1', [id]);
  return mapProduct(rows[0]);
}

async function create(data) {
  const { rows: srows } = await db.query('SELECT COALESCE(MAX(sort_order)+1,0) AS next FROM products');
  const sortOrder = srows[0].next;
  const { rows } = await db.query(
    `INSERT INTO products
      (name, category, codes, flavors, price_uv, price_up, price_fv, price_fp, image_url, image_public_id, active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      data.name,
      data.category,
      data.codes,
      data.flavors,
      data.priceUV,
      data.priceUP,
      data.priceFV,
      data.priceFP,
      data.imageUrl,
      data.imagePublicId,
      data.active !== false,
      sortOrder,
    ]
  );
  await ensureCategory(data.category);
  return mapProduct(rows[0]);
}

async function update(id, updates) {

const pool = require('../db/pool');

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    codes: row.codes,
    flavors: row.flavors,
    priceUV: row.price_uv,
    priceUP: row.price_up,
    priceFV: row.price_fv,
    priceFP: row.price_fp,
    imageUrl: row.image_url,
    imagePublicId: row.image_public_id,
    active: row.active,
    sortOrder: row.sort_order
  };
}

async function initializeDatabase() {
  await pool.query(`CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT,
    category TEXT,
    codes TEXT,
    flavors TEXT,
    price_uv REAL,
    price_up REAL,
    price_fv REAL,
    price_fp REAL,
    image_url TEXT,
    image_public_id TEXT,
    active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    categories_order TEXT
  );`);
  await pool.query(`INSERT INTO settings (id, categories_order) VALUES (1, '[]')
    ON CONFLICT (id) DO NOTHING;`);
}

async function getSettings() {
  const { rows } = await pool.query('SELECT categories_order FROM settings WHERE id=1');
  if (rows[0]) {
    return { categoriesOrder: JSON.parse(rows[0].categories_order || '[]') };
  }
  return { categoriesOrder: [] };
}

async function updateSettingsCategory(cat) {
  if (!cat) return;
  const settings = await getSettings();
  if (!settings.categoriesOrder.includes(cat)) {
    settings.categoriesOrder.push(cat);
    await pool.query('UPDATE settings SET categories_order=$1 WHERE id=1', [JSON.stringify(settings.categoriesOrder)]);
  }
}

async function getAll() {
  const { rows } = await pool.query('SELECT * FROM products');
  return rows.map(mapProduct);
}

async function getById(id) {
  const { rows } = await pool.query('SELECT * FROM products WHERE id=$1', [id]);
  return mapProduct(rows[0]);
}

async function create(data) {
  const { rows: maxRows } = await pool.query('SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM products');
  const sortOrder = maxRows[0].next;
  const { rows } = await pool.query(
    `INSERT INTO products
      (name, category, codes, flavors, price_uv, price_up, price_fv, price_fp, image_url, image_public_id, active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      data.name,
      data.category,
      data.codes,
      data.flavors,
      data.priceUV,
      data.priceUP,
      data.priceFV,
      data.priceFP,
      data.imageUrl,
      data.imagePublicId,
      data.active !== false,
      sortOrder
    ]
  );
  await updateSettingsCategory(data.category);
  return mapProduct(rows[0]);
}

async function update(id, updates) {
  const fields = [];
  const values = [];
  let idx = 1;
 main
  const columns = {
    name: 'name',
    category: 'category',
    codes: 'codes',
    flavors: 'flavors',
    priceUV: 'price_uv',
    priceUP: 'price_up',
    priceFV: 'price_fv',
    priceFP: 'price_fp',
    imageUrl: 'image_url',
    imagePublicId: 'image_public_id',
    active: 'active',
 codex/refactor-and-enhance-product-catalog-application-q7pjy2
    sortOrder: 'sort_order',
  };
  const fields = [];
  const values = [];
  let idx = 1;
  for (const key of Object.keys(columns)) {
    if (updates[key] !== undefined) {
      fields.push(`${columns[key]}=$${idx}`);
      values.push(updates[key]);

    sortOrder: 'sort_order'
  };
  for (const key of Object.keys(columns)) {
    if (updates[key] !== undefined) {
      fields.push(`${columns[key]}=$${idx}`);
      if (key === 'active') {
        values.push(updates[key] === false ? false : true);
      } else {
        values.push(updates[key]);
      }
 main
      idx++;
    }
  }
  if (!fields.length) return getById(id);
 codex/refactor-and-enhance-product-catalog-application-q7pjy2
  fields.push('updated_at=NOW()');
  values.push(id);
  const sql = `UPDATE products SET ${fields.join(', ')} WHERE id=$${idx} RETURNING *`;
  const { rows } = await db.query(sql, values);
  const updated = mapProduct(rows[0]);
  if (updates.category) await ensureCategory(updates.category);
  return updated;
}

async function remove(id) {
  await db.query('DELETE FROM products WHERE id=$1', [id]);
}

async function reorder(ordered) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < ordered.length; i++) {
      await client.query('UPDATE products SET sort_order=$1 WHERE id=$2', [i, ordered[i]]);

  values.push(id);
  await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id=$${idx}`, values);
  if (updates.category) await updateSettingsCategory(updates.category);
  return getById(id);
}

async function remove(id) {
  await pool.query('DELETE FROM products WHERE id=$1', [id]);
}

async function reorder(ordered) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < ordered.length; i++) {
      await client.query('UPDATE products SET sort_order=$1 WHERE id=$2', [i + 1, ordered[i]]);
 main
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  initializeDatabase,
  getAll,
  getById,
  create,
  update,
  remove,
  reorder,
 codex/refactor-and-enhance-product-catalog-application-q7pjy2
  getSettings,
  upsertSettings,

  getSettings
 main
};

