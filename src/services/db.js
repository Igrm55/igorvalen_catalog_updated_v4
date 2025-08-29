'use strict';

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbFile = path.join(dataDir, 'catalog.db');
fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(dbFile);

function init() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        category TEXT,
        codes TEXT,
        flavors TEXT,
        priceUV REAL,
        priceUP REAL,
        priceFV REAL,
        priceFP REAL,
        sortOrder INTEGER,
        active INTEGER DEFAULT 1,
        imageUrl TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        categoriesOrder TEXT
      )`, err => {
        if (err) reject(err); else resolve();
      });
    });
  });
}

function mapRow(row) {
  if (!row) return row;
  return { ...row, active: row.active !== 0 };
}

function getProducts() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM products`, (err, rows) => {
      if (err) reject(err); else resolve(rows.map(mapRow));
    });
  });
}

function getProduct(id) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM products WHERE id = ?`, [id], (err, row) => {
      if (err) reject(err); else resolve(mapRow(row));
    });
  });
}

function insertProduct(p) {
  return new Promise((resolve, reject) => {
    const stmt = `INSERT INTO products (name, category, codes, flavors, priceUV, priceUP, priceFV, priceFP, sortOrder, active, imageUrl)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [p.name, p.category, p.codes, p.flavors, p.priceUV, p.priceUP, p.priceFV, p.priceFP, p.sortOrder, p.active ? 1 : 0, p.imageUrl];
    db.run(stmt, params, function (err) {
      if (err) reject(err); else resolve(this.lastID);
    });
  });
}

function updateProduct(id, p) {
  return new Promise((resolve, reject) => {
    const stmt = `UPDATE products SET name=?, category=?, codes=?, flavors=?, priceUV=?, priceUP=?, priceFV=?, priceFP=?, sortOrder=?, active=?, imageUrl=? WHERE id=?`;
    const params = [p.name, p.category, p.codes, p.flavors, p.priceUV, p.priceUP, p.priceFV, p.priceFP, p.sortOrder, p.active ? 1 : 0, p.imageUrl, id];
    db.run(stmt, params, function (err) {
      if (err) reject(err); else resolve();
    });
  });
}

function deleteProduct(id) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM products WHERE id=?`, [id], err => {
      if (err) reject(err); else resolve();
    });
  });
}

function reorderProducts(order) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`UPDATE products SET sortOrder=? WHERE id=?`);
    db.serialize(() => {
      order.forEach((id, idx) => stmt.run([idx + 1, id]));
      stmt.finalize(err => {
        if (err) reject(err); else resolve();
      });
    });
  });
}

function getSettings() {
  return new Promise((resolve, reject) => {
    db.get(`SELECT categoriesOrder FROM settings WHERE id=1`, (err, row) => {
      if (err) reject(err); else {
        const val = row && row.categoriesOrder ? JSON.parse(row.categoriesOrder) : [];
        resolve(Array.isArray(val) ? val : []);
      }
    });
  });
}

function saveSettings(order) {
  return new Promise((resolve, reject) => {
    const val = JSON.stringify(order || []);
    db.run(`INSERT INTO settings (id, categoriesOrder) VALUES (1, ?)
            ON CONFLICT(id) DO UPDATE SET categoriesOrder=excluded.categoriesOrder`, [val], err => {
      if (err) reject(err); else resolve();
    });
  });
}

module.exports = {
  init,
  getProducts,
  getProduct,
  insertProduct,
  updateProduct,
  deleteProduct,
  reorderProducts,
  getSettings,
  saveSettings
};

