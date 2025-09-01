'use strict';

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
      idx++;
    }
  }
  if (!fields.length) return getById(id);
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
  getSettings
};

