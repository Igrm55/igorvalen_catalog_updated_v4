'use strict';

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { loadCatalog, saveProduct, updateProduct, deleteProduct } = require('./db');

async function start() {
  try {
    console.log('[catalog] using database persistence');

    const app = express();
    const PORT = Number(process.env.PORT || 4000);

    const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });

    app.use(cors());
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true }));

    app.get('/healthz', (_req, res) => res.json({ ok: true }));

    app.use((req, res, next) => {
      if (req.path === '/' || req.path === '/index.html') {
        res.set('Cache-Control', 'no-store');
      }
      next();
    });

    app.use(express.static(path.join(__dirname, '..', 'public')));

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

    function normalizeNumber(val) {
      if (val === undefined || val === null || val === '') return null;
      if (typeof val === 'number') return val;
      const s = String(val).replace('.', '').replace(',', '.');
      const f = parseFloat(s);
      return Number.isNaN(f) ? null : f;
    }

    function getSettings() {
      return loadCatalog().settings;
    }

    // ---- Public API ----
    app.get('/api/catalog', (req, res) => {
      try {
        const { q, category } = req.query;
        const { products, settings } = loadCatalog();
        let list = products.filter(p => p.active !== false);
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
        res.json({ products: list, settings });
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
      const { products } = loadCatalog();
      const sorted = [...products].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      res.json(sorted);
    });

    app.get('/api/products/:id', (req, res) => {
      const id = Number(req.params.id);
      const { products } = loadCatalog();
      const item = products.find(p => p.id === id);
      if (!item) return res.status(404).json({ error: 'Not found' });
      res.json(item);
    });

    app.post('/api/products', upload.single('image'), (req, res) => {
      let newFile;
      try {
        const body = req.body || {};
        const { products } = loadCatalog();
        const sortOrder = products.reduce((max, p) => Math.max(max, p.sortOrder || 0), 0) + 1;

        const product = {
          name: body.name,
          category: body.category,
          codes: body.codes ?? null,
          flavors: body.flavors ?? null,
          priceUV: normalizeNumber(body.priceUV),
          priceUP: normalizeNumber(body.priceUP),
          priceFV: normalizeNumber(body.priceFV),
          priceFP: normalizeNumber(body.priceFP),
          active: true,
          sortOrder
        };

        if (req.file) {
          newFile = req.file.filename;
          product.imageUrl = `/uploads/${newFile}`;
        }

        const saved = saveProduct(product);
        res.json(saved);
      } catch (err) {
        console.error(err);
        if (newFile) fs.unlink(path.join(uploadDir, newFile), () => {});
        res.status(500).json({ error: 'Erro ao salvar produto' });
      }
    });

    app.put('/api/products/:id', upload.single('image'), (req, res) => {
      let oldProduct;
      let newFile;
      try {
        const id = Number(req.params.id);
        const { products } = loadCatalog();
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Not found' });

        oldProduct = { ...products[idx] };

        if (req.file) {
          newFile = req.file.filename;
        }

        const updates = {
          name: req.body.name,
          category: req.body.category,
          codes: req.body.codes ?? null,
          flavors: req.body.flavors ?? null,
          priceUV: normalizeNumber(req.body.priceUV),
          priceUP: normalizeNumber(req.body.priceUP),
          priceFV: normalizeNumber(req.body.priceFV),
          priceFP: normalizeNumber(req.body.priceFP),
          active: req.body.active === 'false' ? false : true
        };
        if (req.file) updates.imageUrl = `/uploads/${req.file.filename}`;

        const updated = updateProduct(id, updates);

        if (req.file && oldProduct.imageUrl && oldProduct.imageUrl.startsWith('/uploads/')) {
          fs.unlink(path.join(uploadDir, oldProduct.imageUrl.replace('/uploads/', '')), () => {});
        }

        res.json(updated);
      } catch (err) {
        console.error(err);
        if (newFile) fs.unlink(path.join(uploadDir, newFile), () => {});
        res.status(500).json({ error: 'Erro ao atualizar produto' });
      }
    });

    app.delete('/api/products/:id', (req, res) => {
      let removed;
      try {
        const id = Number(req.params.id);
        const { products } = loadCatalog();
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Not found' });
        removed = products[idx];
        deleteProduct(id);
        if (removed.imageUrl && removed.imageUrl.startsWith('/uploads/')) {
          fs.unlink(path.join(uploadDir, removed.imageUrl.replace('/uploads/', '')), () => {});
        }
        res.json({ ok: true });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir produto' });
      }
    });

    app.post('/api/products/reorder', (req, res) => {
      try {
        const ordered = req.body || [];
        for (let i = 0; i < ordered.length; i++) {
          const id = Number(ordered[i]);
          updateProduct(id, { sortOrder: i + 1 });
        }
        res.json({ ok: true });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao reordenar' });
      }
    });

    app.get('/api/settings', (_req, res) => {
      res.json(getSettings());
    });

    // Fallback SPA
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server up on :${PORT}`);
    });
  } catch (e) {
    console.error('[bootstrap error]', e);
    process.exit(1);
  }
}

start();
