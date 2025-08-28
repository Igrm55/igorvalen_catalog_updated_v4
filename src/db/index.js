'use strict';

const Database = require('better-sqlite3');
const path = require('path');

// Resolve database path from DATABASE_URL (supporting sqlite: prefix)
const url = process.env.DATABASE_URL || 'sqlite:./catalog.db';
let dbPath = url;
if (url.startsWith('sqlite:')) {
  dbPath = url.replace('sqlite:', '');
}
// Ensure relative paths resolve from project root
if (!path.isAbsolute(dbPath)) {
  dbPath = path.join(__dirname, '..', '..', dbPath);
}

const db = new Database(dbPath);
// Basic migrations

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  category TEXT,
  codes TEXT,
  flavors TEXT,
  priceUV REAL,
  priceUP REAL,
  priceFV REAL,
  priceFP REAL,
  imageUrl TEXT,
  active INTEGER DEFAULT 1,
  sortOrder INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  categoriesOrder TEXT
);
`);

const hasSettings = db.prepare('SELECT id FROM settings WHERE id = 1').get();
if (!hasSettings) {
  db.prepare('INSERT INTO settings (id, categoriesOrder) VALUES (1, "[]")').run();
}

function getSettings() {
  const row = db.prepare('SELECT categoriesOrder FROM settings WHERE id = 1').get();
  return { categoriesOrder: row ? JSON.parse(row.categoriesOrder || '[]') : [] };
}

function updateSettingsCategory(cat) {
  if (!cat) return;
  const settings = getSettings();
  if (!settings.categoriesOrder.includes(cat)) {
    settings.categoriesOrder.push(cat);
    db.prepare('UPDATE settings SET categoriesOrder = ? WHERE id = 1').run(JSON.stringify(settings.categoriesOrder));
  }
}

function loadCatalog() {
  const products = db.prepare('SELECT * FROM products').all().map(p => ({ ...p, active: p.active === 1 }));
  const settings = getSettings();
  return { products, settings };
}

function saveProduct(product) {
  const stmt = db.prepare(`INSERT INTO products
    (name, category, codes, flavors, priceUV, priceUP, priceFV, priceFP, imageUrl, active, sortOrder)
    VALUES (@name, @category, @codes, @flavors, @priceUV, @priceUP, @priceFV, @priceFP, @imageUrl, @active, @sortOrder)`);
  const info = stmt.run({
    ...product,
    active: product.active === false ? 0 : 1
  });
  updateSettingsCategory(product.category);
  return { id: info.lastInsertRowid, ...product, id: info.lastInsertRowid };
}

function updateProduct(id, updates) {
  const fields = [];
  const params = { id };
  for (const key of ['name','category','codes','flavors','priceUV','priceUP','priceFV','priceFP','imageUrl','active','sortOrder']) {
    if (updates[key] !== undefined) {
      fields.push(`${key}=@${key}`);
      params[key] = key === 'active' ? (updates[key] ? 1 : 0) : updates[key];
    }
  }
  if (fields.length) {
    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id=@id`).run(params);
  }
  if (updates.category) updateSettingsCategory(updates.category);
  const row = db.prepare('SELECT * FROM products WHERE id=?').get(id);
  return row ? { ...row, active: row.active === 1 } : null;
}

function deleteProduct(id) {
  db.prepare('DELETE FROM products WHERE id=?').run(id);
}

module.exports = { loadCatalog, saveProduct, updateProduct, deleteProduct };
