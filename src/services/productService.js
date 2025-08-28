'use strict';

const fs = require('fs');
const path = require('path');
const store = require('./githubStore');

const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');

function normalizeNumber(val) {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return val;
  const s = String(val).replace('.', '').replace(',', '.');
  const f = parseFloat(s);
  return Number.isNaN(f) ? null : f;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getSettings() {
  const { settings } = store.getCache();
  const order = Array.isArray(settings?.categoriesOrder) ? settings.categoriesOrder : [];
  return { id: 1, categoriesOrder: order };
}

async function discardUpload(fileName) {
  if (!fileName) return;
  try { await fs.promises.unlink(path.join(uploadDir, fileName)); } catch {}
}

async function getAll() {
  const { products } = store.getCache();
  return products || [];
}

async function getById(id) {
  const list = await getAll();
  return list.find(p => p.id === id);
}

async function create(body, file) {
  const catalog = store.getCache();
  const original = clone(catalog);
  const products = catalog.products || [];
  const settings = catalog.settings || {};
  const order = Array.isArray(settings.categoriesOrder) ? [...settings.categoriesOrder] : [];
  const nextId = products.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1;

  let uploaded = false;
  try {
    let image = null;
    if (file) {
      await store.uploadImage(file.path, file.filename);
      uploaded = true;
      image = { filename: file.filename, path: `/uploads/${file.filename}` };
    }

    const data = {
      id: nextId,
      name: body.name || '',
      category: body.category || '',
      codes: body.codes || null,
      flavors: body.flavors || null,
      imageUrl: image ? image.path : (body.imageUrl || null),
      image,
      priceUV: normalizeNumber(body.priceUV),
      priceUP: normalizeNumber(body.priceUP),
      priceFV: normalizeNumber(body.priceFV),
      priceFP: normalizeNumber(body.priceFP),
      sortOrder: Number(body.sortOrder || products.length + 1),
      active: body.active === 'false' ? false : true
    };

    const updatedProducts = [...products, data];
    if (data.category && !order.includes(data.category)) order.push(data.category);

    await store.save({ products: updatedProducts, settings: { ...settings, categoriesOrder: order } });
    return data;
  } catch (err) {
    await store.save(original).catch(() => {});
    if (uploaded) {
      await store.deleteImage(file.filename).catch(() => {});
      await discardUpload(file.filename);
    }
    throw err;
  }
}

async function update(id, body, file) {
  const catalog = store.getCache();
  const original = clone(catalog);
  const products = catalog.products || [];
  const settings = catalog.settings || {};
  const order = Array.isArray(settings.categoriesOrder) ? [...settings.categoriesOrder] : [];
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return null;

  const oldProduct = { ...products[idx] };
  let uploaded = false;
  try {
    if (file) {
      await store.uploadImage(file.path, file.filename);
      uploaded = true;
      products[idx].imageUrl = `/uploads/${file.filename}`;
      products[idx].image = { filename: file.filename, path: `/uploads/${file.filename}` };
    }

    const updates = {
      name: body.name,
      category: body.category,
      codes: body.codes ?? null,
      flavors: body.flavors ?? null,
      priceUV: normalizeNumber(body.priceUV),
      priceUP: normalizeNumber(body.priceUP),
      priceFV: normalizeNumber(body.priceFV),
      priceFP: normalizeNumber(body.priceFP),
      active: body.active === 'false' ? false : true
    };

    products[idx] = { ...products[idx], ...updates };
    if (updates.category && !order.includes(updates.category)) order.push(updates.category);

    await store.save({ products, settings: { ...settings, categoriesOrder: order } });

    if (file && oldProduct.image?.filename) {
      store.deleteImage(oldProduct.image.filename).catch(() => {});
      await discardUpload(oldProduct.image.filename);
    }

    return products[idx];
  } catch (err) {
    await store.save(original).catch(() => {});
    if (uploaded) {
      await store.deleteImage(file.filename).catch(() => {});
      await discardUpload(file.filename);
    }
    return Promise.reject(err);
  }
}

async function remove(id) {
  const catalog = store.getCache();
  const original = clone(catalog);
  const products = catalog.products || [];
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return false;
  const removed = products.splice(idx, 1)[0];

  try {
    await store.save({ ...catalog, products });
    if (removed.image?.filename) {
      store.deleteImage(removed.image.filename).catch(() => {});
      await discardUpload(removed.image.filename);
    }
    return true;
  } catch (err) {
    products.splice(idx, 0, removed);
    await store.save(original).catch(() => {});
    throw err;
  }
}

async function reorder(ordered) {
  const catalog = store.getCache();
  const original = clone(catalog);
  const products = catalog.products || [];
  try {
    for (let i = 0; i < ordered.length; i++) {
      const id = Number(ordered[i]);
      const p = products.find(prod => prod.id === id);
      if (p) p.sortOrder = i + 1;
    }
    await store.save({ ...catalog, products });
  } catch (err) {
    await store.save(original).catch(() => {});
    throw err;
  }
}

module.exports = {
  load: store.load,
  getAll,
  getById,
  create,
  update,
  remove,
  reorder,
  getSettings,
  discardUpload
};

