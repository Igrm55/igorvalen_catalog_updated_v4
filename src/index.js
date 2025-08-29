'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const db = require('./services/db');

async function start() {
  try {
    await db.init();
    console.log('[catalog] db ready');

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

    async function getSettings() {
      let order = await db.getSettings();
      if (!order.length) {
        const products = await db.getProducts();
        order = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
      }
      return { id: 1, categoriesOrder: order };
    }

    // ---- Public API ----
    app.get('/api/catalog', async (req, res) => {
      try {
        const { q, category } = req.query;
        let list = await db.getProducts();
        list = list.filter(p => p.active !== false);
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
        res.json({ products: list, settings: await getSettings() });
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

    app.get('/api/admin/products', async (_req, res) => {
      const products = await db.getProducts();
      const sorted = [...products].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      res.json(sorted);
    });

    app.get('/api/products/:id', async (req, res) => {
      const id = Number(req.params.id);
      const item = await db.getProduct(id);
      if (!item) return res.status(404).json({ error: 'Not found' });
      res.json(item);
    });

    app.post('/api/products', upload.single('image'), async (req, res) => {
      try {
        const body = req.body || {};
        const list = await db.getProducts();
        const order = await db.getSettings();

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const newProd = {
          name: body.name,
          category: body.category,
          codes: body.codes ?? null,
          flavors: body.flavors ?? null,
          priceUV: normalizeNumber(body.priceUV),
          priceUP: normalizeNumber(body.priceUP),
          priceFV: normalizeNumber(body.priceFV),
          priceFP: normalizeNumber(body.priceFP),
          sortOrder: list.length + 1,
          active: body.active === 'false' ? false : true,
          imageUrl
        };

        const id = await db.insertProduct(newProd);
        if (newProd.category && !order.includes(newProd.category)) {
          order.push(newProd.category);
          await db.saveSettings(order);
        }

        res.json(await db.getProduct(id));
      } catch (err) {
        console.error(err);
        if (req.file) {
          fs.promises.unlink(req.file.path).catch(() => {});
        }
        res.status(500).json({ error: 'Erro ao criar produto' });
      }
    });

    app.put('/api/products/:id', upload.single('image'), async (req, res) => {
      let newFile;
      let oldProduct;
      try {
        const id = Number(req.params.id);
        const body = req.body || {};
        const order = await db.getSettings();
        const existing = await db.getProduct(id);
        if (!existing) return res.status(404).json({ error: 'Not found' });

        oldProduct = { ...existing };

        if (req.file) {
          newFile = req.file.filename;
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
          sortOrder: existing.sortOrder,
          active: body.active === 'false' ? false : true,
          imageUrl: req.file ? `/uploads/${newFile}` : existing.imageUrl
        };

        await db.updateProduct(id, updates);
        if (updates.category && !order.includes(updates.category)) {
          order.push(updates.category);
          await db.saveSettings(order);
        }

        if (req.file && oldProduct.imageUrl && oldProduct.imageUrl.startsWith('/uploads/')) {
          fs.promises.unlink(path.join(uploadDir, path.basename(oldProduct.imageUrl))).catch(() => {});
        }

        res.json(await db.getProduct(id));
      } catch (err) {
        console.error(err);
        if (newFile) {
          fs.promises.unlink(path.join(uploadDir, newFile)).catch(() => {});
        }
        res.status(500).json({ error: 'Erro ao atualizar produto' });
      }
    });

    app.delete('/api/products/:id', async (req, res) => {
      try {
        const id = Number(req.params.id);
        const removed = await db.getProduct(id);
        if (!removed) return res.status(404).json({ error: 'Not found' });
        await db.deleteProduct(id);
        if (removed.imageUrl && removed.imageUrl.startsWith('/uploads/')) {
          fs.promises.unlink(path.join(uploadDir, path.basename(removed.imageUrl))).catch(() => {});
        }
        res.json({ ok: true });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir produto' });
      }
    });

    app.post('/api/products/reorder', async (req, res) => {
      try {
        const ordered = req.body || [];
        await db.reorderProducts(ordered.map(Number));
        res.json({ ok: true });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao reordenar' });
      }
    });

    app.get('/api/settings', async (_req, res) => {
      res.json(await getSettings());
    });

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
