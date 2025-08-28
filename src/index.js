"use strict";

// IgorValen catalog server bootstrap
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const store = require('./services/githubStore');

async function start() {
  try {
    await store.load();
    console.log('[catalog] cache loaded (github or memory fallback)');

    const app = express();
    const PORT = Number(process.env.PORT || 4000);

    // pasta de uploads
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });

    // middlewares
    app.use(cors());
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true }));

    // healthcheck
    app.get('/healthz', (_req, res) => res.json({ ok: true }));

    // Evitar cache do HTML principal (contra SW/asset antigo)
    app.use((req, res, next) => {
      if (req.path === '/' || req.path === '/index.html') {
        res.set('Cache-Control', 'no-store');
      }
      next();
    });

    // arquivos estáticos
    app.use(express.static(path.join(__dirname, '..', 'public')));

    // Upload (multer)
    const upload = multer({
      storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => {
          const ts = Date.now();
          const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
          cb(null, `${ts}-${safe}`);
        }
      })
    });

    // Helpers
    function normalizeNumber(val) {
      if (val === undefined || val === null || val === '') return null;
      if (typeof val === 'number') return val;
      const s = String(val).replace('.', '').replace(',', '.');
      const f = parseFloat(s);
      return Number.isNaN(f) ? null : f;
    }
    function getSettings() {
      const { settings } = store.getCache();
      const order = Array.isArray(settings?.categoriesOrder) ? settings.categoriesOrder : [];
      return { id: 1, categoriesOrder: order };
    }

    // ---- Public API ----
    app.get('/api/catalog', (req, res) => {
      try {
        const { q, category } = req.query;
        const { products } = store.getCache();
        let list = (products || []).filter(p => p.active !== false);
        if (category) list = list.filter(p => p.category === category);
        if (q) {
          const s = String(q).toLowerCase();
          list = list.filter(p =>
            (p.name || '').toLowerCase().includes(s) ||
            (p.codes || '').toLowerCase().includes(s) ||
            (p.category || '').toLowerCase().includes(s)
          );
        }
        list = list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        res.json({ products: list, settings: getSettings() });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao carregar catálogo' });
      }
    });

    // ---- Admin API ----
    app.post('/api/login', (req, res) => {
      const { password } = req.body || {};
      res.json({ ok: password === '1234' });
    });

    app.get('/api/admin/products', (_req, res) => {
      const { products } = store.getCache();
      const sorted = [...(products || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      res.json(sorted);
    });

    app.get('/api/products/:id', (req, res) => {
      const id = Number(req.params.id);
      const { products } = store.getCache();
      const item = (products || []).find(p => p.id === id);
      if (!item) return res.status(404).json({ error: 'Not found' });
      res.json(item);
    });

    app.post('/api/products', upload.single('image'), async (req, res) => {
      let nextId;
      try {
        const body = req.body || {};
        const catalog = store.getCache();
        const products = catalog.products || [];
        const settings = catalog.settings || {};
        const order = Array.isArray(settings.categoriesOrder) ? [...settings.categoriesOrder] : [];

        nextId = products.reduce((max, p) => Math.max(max, p.id || 0), 0) + 1;

        if (req.file) {
          await store.uploadImage(req.file.path, req.file.filename);
        }

        const data = {
          id: nextId,
          name: body.name || '',
          category: body.category || '',
          codes: body.codes || null,
          flavors: body.flavors || null,
          imageUrl: req.file ? `/uploads/${req.file.filename}` : (body.imageUrl || null),
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
        res.json(data);
      } catch (err) {
        console.error(err);
        // rollback if product was staged
        try {
          const catalog = store.getCache();
          const products = catalog.products || [];
          const idx = products.findIndex(p => p.id === nextId);
          if (idx !== -1) products.splice(idx, 1);
        } catch {}
        if (req.file) {
          try { await store.deleteImage(req.file.filename); } catch {}
        }
        res.status(500).json({ error: 'Erro ao criar produto' });
      }
    });

    app.put('/api/products/:id', upload.single('image'), async (req, res) => {
      let newFile = null;
      let oldProduct;
      try {
        const id = Number(req.params.id);
        const body = req.body || {};
        const catalog = store.getCache();
        const products = catalog.products || [];
        const settings = catalog.settings || {};
        const order = Array.isArray(settings.categoriesOrder) ? [...settings.categoriesOrder] : [];
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Not found' });

        oldProduct = { ...products[idx] };

        if (req.file) {
          newFile = req.file.filename;
          await store.uploadImage(req.file.path, newFile);
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
        if (req.file) updates.imageUrl = `/uploads/${req.file.filename}`;

        products[idx] = { ...products[idx], ...updates };
        if (updates.category && !order.includes(updates.category)) order.push(updates.category);

        await store.save({ products, settings: { ...settings, categoriesOrder: order } });

        if (req.file && oldProduct.imageUrl && oldProduct.imageUrl.startsWith('/uploads/')) {
          store.deleteImage(oldProduct.imageUrl.replace('/uploads/', '')).catch(() => {});
        }

        res.json(products[idx]);
      } catch (err) {
        console.error(err);
        try {
          const catalog = store.getCache();
          const products = catalog.products || [];
          if (oldProduct) {
            const idx = products.findIndex(p => p.id === oldProduct.id);
            if (idx !== -1) products[idx] = oldProduct;
          }
        } catch {}
        if (newFile) {
          try { await store.deleteImage(newFile); } catch {}
        }
        res.status(500).json({ error: 'Erro ao atualizar produto' });
      }
    });

    app.delete('/api/products/:id', async (req, res) => {
      let removed;
      let idx;
      try {
        const id = Number(req.params.id);
        const catalog = store.getCache();
        const products = catalog.products || [];
        idx = products.findIndex(p => p.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Not found' });
        removed = products.splice(idx, 1)[0];
        await store.save({ ...catalog, products });
        if (removed.imageUrl && removed.imageUrl.startsWith('/uploads/')) {
          store.deleteImage(removed.imageUrl.replace('/uploads/', '')).catch(() => {});
        }
        res.json({ ok: true });
      } catch (err) {
        console.error(err);
        if (removed) {
          const catalog = store.getCache();
          const products = catalog.products || [];
          products.splice(idx, 0, removed);
        }
        res.status(500).json({ error: 'Erro ao excluir produto' });
      }
    });

    app.post('/api/products/reorder', async (req, res) => {
      try {
        const ordered = req.body || [];
        const catalog = store.getCache();
        const products = catalog.products || [];
        for (let i = 0; i < ordered.length; i++) {
          const id = Number(ordered[i]);
          const p = products.find(prod => prod.id === id);
          if (p) p.sortOrder = i + 1;
        }
        await store.save({ ...catalog, products });
        res.json({ ok: true });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao reordenar' });
      }
    });

    // Settings endpoint
    app.get('/api/settings', (_req, res) => {
      res.json(getSettings());
    });

    // Fallback SPA
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    // Bind 0.0.0.0 p/ deploy
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server up on :${PORT}`);
    });
  } catch (e) {
    console.error('[bootstrap error]', e);
    process.exit(1);
  }
}

start();
