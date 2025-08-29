'use strict';

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dataFile = path.join(dataDir, 'catalog.json');

let cache = null;

function ensureShape(obj) {
  return {
    products: Array.isArray(obj?.products) ? obj.products : [],
    settings: {
      categoriesOrder: Array.isArray(obj?.settings?.categoriesOrder)
        ? obj.settings.categoriesOrder
        : []
    }
  };
}

async function load() {
  await fs.promises.mkdir(dataDir, { recursive: true });
  try {
    const raw = await fs.promises.readFile(dataFile, 'utf8');
    cache = ensureShape(JSON.parse(raw));
  } catch {
    cache = { products: [], settings: { categoriesOrder: [] } };
    await save(cache);
  }
  return cache;
}

function getCache() {
  if (!cache) throw new Error('Catalog not loaded');
  return cache;
}

async function save(next) {
  cache = ensureShape(next);
  await fs.promises.writeFile(dataFile, JSON.stringify(cache, null, 2));
  return cache;
}

module.exports = { load, getCache, save };
