'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { v2: cloudinary } = require('cloudinary');
const productService = require('./services/productService');

function normalizeNumber(val) {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return val;
  const s = String(val).replace(/\./g, '').replace(',', '.');
  const f = parseFloat(s);
  return Number.isNaN(f) ? null : f;
}

async function start() {
  await productService.initializeDatabase();

  const app = express();
  const PORT = Number(process.env.PORT || 4000);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "script-src": [
            "'self'",
            "'unsafe-inline'",
            "https://unpkg.com",
            "https://cdn.tailwindcss.com",
            "https://cdnjs.cloudflare.com"
          ],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
          "img-src": ["'self'", "data:", "*"]
        }
      }
    })
  );

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const storage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'catalog' },
  });
  const upload = multer({ storage });

  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/catalog', async (req, res) => {
    try {
      const { q, category } = req.query;
      let list = await productService.getAll();
      list = list.filter(p => p.active !== false);

      if (category) {
        const cat = String(category);
        list = list.filter(p => String(p.category || '') === cat);
      }

      if (q) {
        const s = String(q).toLowerCase();
        list = list.filter(p =>
          String(p.name || '').toLowerCase().includes(s) ||
          String(p.codes || '').toLowerCase().includes(s) ||
          String(p.category || '').toLowerCase().includes(s)
        );
      }

      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      const settings = await productService.getSettings();
      res.json({ products: list, settings });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao carregar catálogo' });
    }
  });

  app.post('/api/login', (req, res) => {
    const { password } = req.body || {};
    res.json({ ok: password === process.env.ADMIN_PASSWORD });
  });

  app.get('/api/admin/products', async (_req, res) => {
    try {
      const list = await productService.getAll();
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao listar produtos' });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    const id = Number(req.params.id);
    const item = await productService.getById(id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  });

  app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
      const body = req.body || {};
      const product = await productService.create({
        name: body.name,
        category: body.category,
        codes: body.codes ?? null,
        flavors: body.flavors ?? null,
        priceUV: normalizeNumber(body.priceUV),
        priceUP: normalizeNumber(body.priceUP),
        priceFV: normalizeNumber(body.priceFV),
        priceFP: normalizeNumber(body.priceFP),
        imageUrl: req.file ? req.file.path : null,        // secure_url do Cloudinary
        imagePublicId: req.file ? req.file.filename : null, // public_id do Cloudinary
        active: body.active === 'false' ? false : true,
      });
      res.status(201).json(product);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao criar produto' });
    }
  });

  app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    const id = Number(req.params.id);
    try {
      const old = await productService.getById(id);
      if (!old) return res.status(404).json({ error: 'Not found' });

      const updates = {
        name: req.body.name,
        category: req.body.category,
        codes: req.body.codes ?? null,
        flavors: req.body.flavors ?? null,
        priceUV: normalizeNumber(req.body.priceUV),
        priceUP: normalizeNumber(req.body.priceUP),
        priceFV: normalizeNumber(req.body.priceFV),
        priceFP: normalizeNumber(req.body.priceFP),
        active: req.body.active === 'false' ? false : true,
      };

      if (req.file) {
        updates.imageUrl = req.file.path;
        updates.imagePublicId = req.file.filename;
        if (old.imagePublicId) {
          cloudinary.uploader.destroy(old.imagePublicId).catch(() => {});
        }
      }

      const updated = await productService.update(id, updates);
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    const id = Number(req.params.id);
    try {
      const existing = await productService.getById(id);
      if (!existing) return res.status(404).json({ error: 'Not found' });

      if (existing.imagePublicId) {
        cloudinary.uploader.destroy(existing.imagePublicId).catch(() => {});
      }

      await productService.remove(id);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao excluir produto' });
    }
  });

  app.post('/api/products/reorder', async (req, res) => {
    const ordered = req.body || [];
    if (!Array.isArray(ordered)) return res.status(400).json({ error: 'Invalid payload' });
    try {
      await productService.reorder(ordered);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao reordenar' });
    }
  });

  app.get('/api/settings', async (_req, res) => {
    try {
      const settings = await productService.getSettings();
      res.json(settings);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
  });

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server up on :${PORT}`);
  });
}

start().catch(err => {
  console.error('[bootstrap error]', err);
  process.exit(1);
});