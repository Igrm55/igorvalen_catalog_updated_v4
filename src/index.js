'use strict';

// server bootstrap entry point

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const productService = require('./services/productService');

async function start() {
  try {
    await productService.load();
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

    // ---- Public API ----
    app.get('/api/catalog', async (req, res) => {
      try {
        const { q, category } = req.query;
        let list = await productService.getAll();
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
        const settings = productService.getSettings();
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

    app.get('/api/admin/products', async (_req, res) => {
      const list = await productService.getAll();
      const sorted = [...list].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      res.json(sorted);
    });

    app.get('/api/products/:id', async (req, res) => {
      const id = Number(req.params.id);
      const item = await productService.getById(id);
      if (!item) return res.status(404).json({ error: 'Not found' });
      res.json(item);
    });

    app.post('/api/products', upload.single('image'), async (req, res) => {
      const body = req.body || {};
      if (!body.name || !body.category) {
        if (req.file) await productService.discardUpload(req.file.filename);
        return res.status(400).json({ error: 'Invalid payload' });
      }
      try {
        const data = await productService.create(body, req.file);
        res.status(201).json(data);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar produto' });
      }
    });

    app.put('/api/products/:id', upload.single('image'), async (req, res) => {
      const body = req.body || {};
      const id = Number(req.params.id);
      if (!body.name || !body.category) {
        if (req.file) await productService.discardUpload(req.file.filename);
        return res.status(400).json({ error: 'Invalid payload' });
      }
      try {
        const data = await productService.update(id, body, req.file);
        if (!data) {
          if (req.file) await productService.discardUpload(req.file.filename);
          return res.status(404).json({ error: 'Not found' });
        }
        res.json(data);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
      }
    });

    app.delete('/api/products/:id', async (req, res) => {
      const id = Number(req.params.id);
      try {
        const ok = await productService.remove(id);
        if (!ok) return res.status(404).json({ error: 'Not found' });
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

    // Settings endpoint
    app.get('/api/settings', (_req, res) => {
      res.json(productService.getSettings());
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

