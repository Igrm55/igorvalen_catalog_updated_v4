'use strict';

const fs = require('fs');
const path = require('path');

let cache = { products: [], settings: { categoriesOrder: [] } };

async function load() {
  return cache;
}

function getCache() {
  return cache;
}

async function save(next) {
  cache = JSON.parse(JSON.stringify(next));
  return cache;
}

async function uploadImage(localPath, fileName) {
  // noop for memory store
}

async function deleteImage(fileName) {
  const p = path.join(__dirname, '..', '..', 'public', 'uploads', fileName);
  try { await fs.promises.unlink(p); } catch {}
}

module.exports = { load, getCache, save, uploadImage, deleteImage };

