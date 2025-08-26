 codex/add-github-storage-service-for-catalog-bcr19m
'use strict';

=======
 codex/add-github-storage-service-for-catalog-63wtfu
'use strict';
// server bootstrap entry point

=======
 codex/add-github-storage-service-for-catalog-r0klsc
'use strict';
// server bootstrap entry point

=======
codex/add-github-storage-service-for-catalog-ylqm88
'use strict';
// server bootstrap entrypoint

 codex/add-github-storage-service-for-catalog-ymiwro
'use strict';
// server bootstrap entrypoint


 codex/add-github-storage-service-for-catalog-6t7hvp
'use strict';


 main
 main
 main
 main
 main
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const store = require('./services/githubStore');

async function start() {
  try {
 codex/add-github-storage-service-for-catalog-bcr19m
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
      try {
        const body = req.body || {};
        const catalog = store.getCache();
        const products = catalog.products || [];
        const nextId = products.reduce((max, p) => Math.max(max, p.id || 0), 0) + 1;
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
        products.push(data);
        await store.save({ ...catalog, products });
        res.json(data);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar produto' });
      }
    });

    app.put('/api/products/:id', upload.single('image'), async (req, res) => {
      try {
        const id = Number(req.params.id);
        const body = req.body || {};
        const catalog = store.getCache();
        const products = catalog.products || [];
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Not found' });

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
        await store.save({ ...catalog, products });
        res.json(products[idx]);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
      }
    });

    app.delete('/api/products/:id', async (req, res) => {
      try {
        const id = Number(req.params.id);
        const catalog = store.getCache();
        const products = catalog.products || [];
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Not found' });
        products.splice(idx, 1);
        await store.save({ ...catalog, products });
        res.json({ ok: true });
      } catch (err) {
        console.error(err);
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

    // Fallback SPA
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    // Bind 0.0.0.0 p/ Render
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server up on :${PORT}`);
    });
  } catch (e) {
    console.error('[bootstrap error]', e);
    process.exit(1);
  }
}

start();
=======
 codex/add-github-storage-service-for-catalog-63wtfu
    console.log('[bootstrap] start');
    await store.load();
    console.log('[catalog] loaded from GitHub');
=======
    console.log('[bootstrap] initializing');
    await store.load();
    console.log('[catalog] loaded from GitHub');
 codex/add-github-storage-service-for-catalog-r0klsc
=======
    await store.load();
    console.log('[catalog] loaded from GitHub');
 codex/add-github-storage-service-for-catalog-ymiwro

 codex/add-github-storage-service-for-catalog-6t7hvp

 codex/add-github-storage-service-for-catalog-d0sknz
 main
 main
 main
 main

    const app = express();
    const PORT = process.env.PORT || 4000;
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });

    app.use(cors());
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true, limit: '2mb' }));

    app.get('/healthz', (_req, res) => res.json({ ok: true }));

  // Evitar cache do HTML principal (ajuda contra SW/asset antigo)
  app.use((req,res,next)=>{
    if (req.path === '/' || req.path === '/index.html'){
      res.set('Cache-Control','no-store');
 codex/add-github-storage-service-for-catalog-63wtfu
=======
 codex/add-github-storage-service-for-catalog-r0klsc
=======

 codex/add-github-storage-service-for-catalog-ymiwro
 main
 main
    }
    next();
  });

  // Arquivos estáticos
  app.use(express.static(path.join(__dirname,'..','public')));

  // Multer (upload de imagens)
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req,file,cb)=> cb(null, uploadDir),
      filename: (req,file,cb)=> {
        const ts = Date.now();
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_');
        cb(null, `${ts}-${safe}`);
      }
    })
  });

  // Helpers
  function normalizeNumber(val){
    if (val===undefined || val===null || val==='') return null;
    if (typeof val === 'number') return val;
    // Aceita "4,70" ou "4.70"
    const s = String(val).replace('.', '').replace(',', '.');
    const f = parseFloat(s);
    return isNaN(f) ? null : f;
  }

  function getSettings(){
    const { settings } = store.getCache();
    const order = settings?.categoriesOrder ? settings.categoriesOrder : [];
    return { id: 1, categoriesOrder: order };
  }
 codex/add-github-storage-service-for-catalog-63wtfu

=======
 codex/add-github-storage-service-for-catalog-r0klsc

=======


  // ---- Public API ----
  app.get('/api/catalog', (req,res)=>{
    try{
      const { q, category } = req.query;
      const { products } = store.getCache();
      let list = products.filter(p=>p.active);
      if (category) list = list.filter(p=>p.category === category);
      if (q){
        const s = String(q).toLowerCase();
        list = list.filter(p=>
          (p.name||'').toLowerCase().includes(s) ||
          (p.codes||'').toLowerCase().includes(s) ||
          (p.category||'').toLowerCase().includes(s)
        );
      }
      list = list.sort((a,b)=> (a.sortOrder||0) - (b.sortOrder||0));
      res.json({ products: list, settings: getSettings() });
    }catch(err){
      console.error(err);
      res.status(500).json({ error:'Erro ao carregar catálogo'});
    }
  });

  // ---- Admin API ----
  app.post('/api/login', (req,res)=>{
    const { password } = req.body || {};
    res.json({ ok: password === '1234' });
  });

  app.get('/api/admin/products', (req,res)=>{
    const { products } = store.getCache();
    const sorted = [...products].sort((a,b)=> (a.sortOrder||0) - (b.sortOrder||0));
    res.json(sorted);
  });

  app.get('/api/products/:id', (req,res)=>{
    const id = Number(req.params.id);
    const { products } = store.getCache();
    const item = products.find(p=>p.id === id);
    if (!item) return res.status(404).json({ error:'Not found' });
    res.json(item);
  });

  app.post('/api/products', upload.single('image'), async (req,res)=>{
    try{
      const body = req.body || {};
      const catalog = store.getCache();
      const products = catalog.products || [];
      const nextId = products.reduce((max,p)=> Math.max(max, p.id||0), 0) + 1;
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
        sortOrder: Number(body.sortOrder || 0),
        active: body.active === 'false' ? false : true,
      };
      const nextOrder = products.length + 1;
      if (!data.sortOrder) data.sortOrder = nextOrder;
      products.push(data);
      await store.save({ ...catalog, products });
      res.json(data);
    }catch(err){
      console.error(err);
      res.status(500).json({ error:'Erro ao criar produto' });
    }
  });

  app.put('/api/products/:id', upload.single('image'), async (req,res)=>{
    try{
      const id = Number(req.params.id);
      const body = req.body || {};
      const catalog = store.getCache();
      const products = catalog.products || [];
      const idx = products.findIndex(p=>p.id === id);
      if (idx === -1) return res.status(404).json({ error:'Not found' });
      const updates = {
        name: body.name,
        category: body.category,
        codes: body.codes ?? null,
        flavors: body.flavors ?? null,
        priceUV: normalizeNumber(body.priceUV),
        priceUP: normalizeNumber(body.priceUP),
        priceFV: normalizeNumber(body.priceFV),
        priceFP: normalizeNumber(body.priceFP),
        active: body.active === 'false' ? false : true,
      };
      if (req.file){
        updates.imageUrl = `/uploads/${req.file.filename}`;
      }
      products[idx] = { ...products[idx], ...updates };
      await store.save({ ...catalog, products });
      res.json(products[idx]);
    }catch(err){
      console.error(err);
      res.status(500).json({ error:'Erro ao atualizar produto' });
    }
  });

  app.delete('/api/products/:id', async (req,res)=>{
    try{
      const id = Number(req.params.id);
      const catalog = store.getCache();
      const products = catalog.products || [];
      const idx = products.findIndex(p=>p.id === id);
      if (idx === -1) return res.status(404).json({ error:'Not found' });
      products.splice(idx,1);
      await store.save({ ...catalog, products });
      res.json({ ok:true });
    }catch(err){
      console.error(err);
      res.status(500).json({ error:'Erro ao excluir produto' });
    }
  });


 codex/add-github-storage-service-for-catalog-6t7hvp
    }
    next();
  });

  // Arquivos estáticos
  app.use(express.static(path.join(__dirname,'..','public')));

  // Multer (upload de imagens)
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req,file,cb)=> cb(null, uploadDir),
      filename: (req,file,cb)=> {
        const ts = Date.now();
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_');
        cb(null, `${ts}-${safe}`);
      }
    })
  });

  // Helpers
  function normalizeNumber(val){
    if (val===undefined || val===null || val==='') return null;
    if (typeof val === 'number') return val;
    // Aceita "4,70" ou "4.70"
    const s = String(val).replace('.', '').replace(',', '.');
    const f = parseFloat(s);
    return isNaN(f) ? null : f;
  }

  function getSettings(){
    const { settings } = store.getCache();
    const order = settings?.categoriesOrder ? settings.categoriesOrder : [];
    return { id: 1, categoriesOrder: order };
  }

  // ---- Public API ----
  app.get('/api/catalog', (req,res)=>{
    try{
      const { q, category } = req.query;
      const { products } = store.getCache();
      let list = products.filter(p=>p.active);
      if (category) list = list.filter(p=>p.category === category);
      if (q){
        const s = String(q).toLowerCase();
        list = list.filter(p=>
          (p.name||'').toLowerCase().includes(s) ||
          (p.codes||'').toLowerCase().includes(s) ||
          (p.category||'').toLowerCase().includes(s)
        );
      }
      list = list.sort((a,b)=> (a.sortOrder||0) - (b.sortOrder||0));
      res.json({ products: list, settings: getSettings() });
    }catch(err){
      console.error(err);
      res.status(500).json({ error:'Erro ao carregar catálogo'});
    }
  });

  // ---- Admin API ----
  app.post('/api/login', (req,res)=>{
    const { password } = req.body || {};
    res.json({ ok: password === '1234' });
  });

  app.get('/api/admin/products', (req,res)=>{
    const { products } = store.getCache();
    const sorted = [...products].sort((a,b)=> (a.sortOrder||0) - (b.sortOrder||0));
    res.json(sorted);
  });

  app.get('/api/products/:id', (req,res)=>{
    const id = Number(req.params.id);
    const { products } = store.getCache();
    const item = products.find(p=>p.id === id);
    if (!item) return res.status(404).json({ error:'Not found' });
    res.json(item);
  });

  app.post('/api/products', upload.single('image'), async (req,res)=>{
    try{
      const body = req.body || {};
      const catalog = store.getCache();
      const products = catalog.products || [];
      const nextId = products.reduce((max,p)=> Math.max(max, p.id||0), 0) + 1;
      const data = {
        id: nextId,
        name: body.name || '',
        category: body.category || '',
        codes: body.codes || null,
        flavors: body.flavors || null,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : (body.imageUrl || null),

    }
    next();
  });

  // Arquivos estáticos
  app.use(express.static(path.join(__dirname,'..','public')));

  // Multer (upload de imagens)
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req,file,cb)=> cb(null, uploadDir),
      filename: (req,file,cb)=> {
        const ts = Date.now();
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_');
        cb(null, `${ts}-${safe}`);
      }
    })
  });

  // Helpers
  function normalizeNumber(val){
    if (val===undefined || val===null || val==='') return null;
    if (typeof val === 'number') return val;
    // Aceita "4,70" ou "4.70"
    const s = String(val).replace('.', '').replace(',', '.');
    const f = parseFloat(s);
    return isNaN(f) ? null : f;
  }

  function getSettings(){
    const { settings } = store.getCache();
    const order = settings?.categoriesOrder ? settings.categoriesOrder : [];
    return { id: 1, categoriesOrder: order };
  }

 main
 main
  // ---- Public API ----
  app.get('/api/catalog', (req,res)=>{
    try{
      const { q, category } = req.query;
      const { products } = store.getCache();
      let list = products.filter(p=>p.active);
      if (category) list = list.filter(p=>p.category === category);
      if (q){
        const s = String(q).toLowerCase();
        list = list.filter(p=>
          (p.name||'').toLowerCase().includes(s) ||
          (p.codes||'').toLowerCase().includes(s) ||
          (p.category||'').toLowerCase().includes(s)
        );
      }
      list = list.sort((a,b)=> (a.sortOrder||0) - (b.sortOrder||0));
      res.json({ products: list, settings: getSettings() });
    }catch(err){
      console.error(err);
      res.status(500).json({ error:'Erro ao carregar catálogo'});
    }
  });

  // ---- Admin API ----
  app.post('/api/login', (req,res)=>{
    const { password } = req.body || {};
    res.json({ ok: password === '1234' });
  });

  app.get('/api/admin/products', (req,res)=>{
    const { products } = store.getCache();
    const sorted = [...products].sort((a,b)=> (a.sortOrder||0) - (b.sortOrder||0));
    res.json(sorted);
  });

  app.get('/api/products/:id', (req,res)=>{
    const id = Number(req.params.id);
    const { products } = store.getCache();
    const item = products.find(p=>p.id === id);
    if (!item) return res.status(404).json({ error:'Not found' });
    res.json(item);
  });

  app.post('/api/products', upload.single('image'), async (req,res)=>{
    try{
      const body = req.body || {};
      const catalog = store.getCache();
      const products = catalog.products || [];
      const nextId = products.reduce((max,p)=> Math.max(max, p.id||0), 0) + 1;
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
        sortOrder: Number(body.sortOrder || 0),
        active: body.active === 'false' ? false : true,
      };
      const nextOrder = products.length + 1;
      if (!data.sortOrder) data.sortOrder = nextOrder;
      products.push(data);
      await store.save({ ...catalog, products });
      res.json(data);
    }catch(err){
      console.error(err);
      res.status(500).json({ error:'Erro ao criar produto' });
    }
  });

  app.put('/api/products/:id', upload.single('image'), async (req,res)=>{
    try{
      const id = Number(req.params.id);
      const body = req.body || {};
      const catalog = store.getCache();
      const products = catalog.products || [];
      const idx = products.findIndex(p=>p.id === id);
      if (idx === -1) return res.status(404).json({ error:'Not found' });
      const updates = {
        name: body.name,
        category: body.category,
        codes: body.codes ?? null,
        flavors: body.flavors ?? null,
 codex/add-github-storage-service-for-catalog-63wtfu
=======
 codex/add-github-storage-service-for-catalog-r0klsc
=======
 main
 main
        priceUV: normalizeNumber(body.priceUV),
        priceUP: normalizeNumber(body.priceUP),
        priceFV: normalizeNumber(body.priceFV),
        priceFP: normalizeNumber(body.priceFP),
 codex/add-github-storage-service-for-catalog-r0klsc
=======

 codex/add-github-storage-service-for-catalog-6t7hvp
        sortOrder: Number(body.sortOrder || 0),
        active: body.active === 'false' ? false : true,
      };
      const nextOrder = products.length + 1;
      if (!data.sortOrder) data.sortOrder = nextOrder;
      products.push(data);
      await store.save({ ...catalog, products });
      res.json(data);
    }catch(err){
      console.error(err);
      res.status(500).json({ error:'Erro ao criar produto' });
    }
  });

  app.put('/api/products/:id', upload.single('image'), async (req,res)=>{
    try{
      const id = Number(req.params.id);
      const body = req.body || {};

 main
        active: body.active === 'false' ? false : true,
      };
      if (req.file){
        updates.imageUrl = `/uploads/${req.file.filename}`;
      }
      products[idx] = { ...products[idx], ...updates };
      await store.save({ ...catalog, products });
      res.json(products[idx]);
    }catch(err){
      console.error(err);
      res.status(500).json({ error:'Erro ao atualizar produto' });
    }
  });

  app.delete('/api/products/:id', async (req,res)=>{
    try{
      const id = Number(req.params.id);
 codex/add-github-storage-service-for-catalog-r0klsc
=======
 main
 main
      const catalog = store.getCache();
      const products = catalog.products || [];
      const idx = products.findIndex(p=>p.id === id);
      if (idx === -1) return res.status(404).json({ error:'Not found' });
 codex/add-github-storage-service-for-catalog-r0klsc
=======

 codex/add-github-storage-service-for-catalog-6t7hvp
      const updates = {
        name: body.name,
        category: body.category,
        codes: body.codes ?? null,
        flavors: body.flavors ?? null,
 main
        priceUV: normalizeNumber(body.priceUV),
        priceUP: normalizeNumber(body.priceUP),
        priceFV: normalizeNumber(body.priceFV),
        priceFP: normalizeNumber(body.priceFP),
        active: body.active === 'false' ? false : true,
      };
      if (req.file){
        updates.imageUrl = `/uploads/${req.file.filename}`;
      }
      products[idx] = { ...products[idx], ...updates };
      await store.save({ ...catalog, products });
      res.json(products[idx]);
    }catch(err){
      console.error(err);
      res.status(500).json({ error:'Erro ao atualizar produto' });
    }
  });

  app.delete('/api/products/:id', async (req,res)=>{
    try{
      const id = Number(req.params.id);
      const catalog = store.getCache();
      const products = catalog.products || [];
      const idx = products.findIndex(p=>p.id === id);
      if (idx === -1) return res.status(404).json({ error:'Not found' });
      products.splice(idx,1);
 codex/add-github-storage-service-for-catalog-63wtfu
=======


 main
      products.splice(idx,1);
 main
      await store.save({ ...catalog, products });
      res.json({ ok:true });
    }catch(err){
      console.error(err);
      res.status(500).json({ error:'Erro ao excluir produto' });
    }
  });

  app.post('/api/products/reorder', async (req,res)=>{
    try{
      const ordered = req.body || [];
      const catalog = store.getCache();
      const products = catalog.products || [];
      for (let i=0;i<ordered.length;i++){
        const id = Number(ordered[i]);
        const p = products.find(prod=>prod.id === id);
        if (p) p.sortOrder = i+1;
      }
 codex/add-github-storage-service-for-catalog-63wtfu
=======
 codex/add-github-storage-service-for-catalog-r0klsc
=======

 main
 main
      await store.save({ ...catalog, products });
      res.json({ ok:true });
    }catch(err){
      console.error(err);
 codex/add-github-storage-service-for-catalog-63wtfu
      res.status(500).json({ error:'Erro ao reordenar' });
=======

 codex/add-github-storage-service-for-catalog-6t7hvp
      res.status(500).json({ error:'Erro ao excluir produto' });
    }
  });

 main
  app.post('/api/products/reorder', async (req,res)=>{
    try{
      const ordered = req.body || [];
      const catalog = store.getCache();
      const products = catalog.products || [];
      for (let i=0;i<ordered.length;i++){
        const id = Number(ordered[i]);
        const p = products.find(prod=>prod.id === id);
        if (p) p.sortOrder = i+1;
      }
 main
      await store.save({ ...catalog, products });
      res.json({ ok:true });
    }catch(err){
      console.error(err);
      res.status(500).json({ error:'Erro ao reordenar' });
 codex/add-github-storage-service-for-catalog-r0klsc
=======
 codex/add-github-storage-service-for-catalog-ymiwro
    }
  });

  // Settings endpoint
  app.get('/api/settings', (req,res)=>{
    res.json(getSettings());
  });

  // Fallback SPA
  app.get('*', (req,res)=>{
    res.sendFile(path.join(__dirname,'..','public','index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => console.log(`Server up on :${PORT}`));

    }
  });

  // Settings endpoint
  app.get('/api/settings', (req,res)=>{
    res.json(getSettings());
  });

  // Fallback SPA
  app.get('*', (req,res)=>{
    res.sendFile(path.join(__dirname,'..','public','index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => console.log(`Server up on :${PORT}`));

      res.status(500).json({ error:'Erro ao reordenar' });
 main
 main
    }
  });

  // Settings endpoint
  app.get('/api/settings', (req,res)=>{
    res.json(getSettings());
  });

  // Fallback SPA
  app.get('*', (req,res)=>{
    res.sendFile(path.join(__dirname,'..','public','index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => console.log(`Server up on :${PORT}`));
  } catch (e) {
    console.error('[bootstrap error]', e);
    process.exit(1);
  }
}

 codex/add-github-storage-service-for-catalog-63wtfu
start();
=======
 codex/add-github-storage-service-for-catalog-r0klsc
start();
=======

    console.log('[catalog] using GitHub storage');

    const app = express();
    const PORT = process.env.PORT || 4000;

    // pasta de uploads
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });

    // middlewares
    app.use(cors());
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true }));

    // healthcheck
    app.get('/healthz', (_req, res) => res.json({ ok: true }));

    // Evitar cache do HTML principal
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
          const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
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
      const order = settings?.categoriesOrder ? settings.categoriesOrder : [];
      return { id: 1, categoriesOrder: order };
    }

    // ---- Public API ----
    app.get('/api/catalog', (req, res) => {
      try {
        const { q, category } = req.query;
        const { products } = store.getCache();
        let list = (products || []).filter(p => p.active);
        if (category) list = list.filter(p => p.category === category);
        if (q) {
          const s = String(q).toLowerCase();
          list = list.filter(p =>
            (p.name || '').toLowerCase().includes(s) ||
            (p.codes || '').toLowerCase().includes(s) ||
            (p.category || '').toLowerCase().includes(s)
          );
        }
        list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
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
      const sorted = [...(products || [])].sort(
        (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
      );
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
      try {
        const body = req.body || {};
        const catalog = store.getCache();
        const products = catalog.products || [];
        const nextId = products.reduce((max, p) => Math.max(max, p.id || 0), 0) + 1;
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
          sortOrder: Number(body.sortOrder || 0),
          active: body.active === 'false' ? false : true,
        };
        const nextOrder = products.length + 1;
        if (!data.sortOrder) data.sortOrder = nextOrder;
        products.push(data);
        await store.save({ ...catalog, products });
        res.json(data);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar produto' });
      }
    });

    app.put('/api/products/:id', upload.single('image'), async (req, res) => {
      try {
        const id = Number(req.params.id);
        const body = req.body || {};
        const catalog = store.getCache();
        const products = catalog.products || [];
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Not found' });
        const updates = {
          name: body.name,
          category: body.category,
          codes: body.codes ?? null,
          flavors: body.flavors ?? null,
          priceUV: normalizeNumber(body.priceUV),
          priceUP: normalizeNumber(body.priceUP),
          priceFV: normalizeNumber(body.priceFV),
          priceFP: normalizeNumber(body.priceFP),
          active: body.active === 'false' ? false : true,
        };
        if (req.file) updates.imageUrl = `/uploads/${req.file.filename}`;
        products[idx] = { ...products[idx], ...updates };
        await store.save({ ...catalog, products });
        res.json(products[idx]);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
      }
    });

    app.delete('/api/products/:id', async (req, res) => {
      try {
        const id = Number(req.params.id);
        const catalog = store.getCache();
        const products = catalog.products || [];
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Not found' });
        products.splice(idx, 1);
        await store.save({ ...catalog, products });
        res.json({ ok: true });
      } catch (err) {
        console.error(err);
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
 main
 main
  } catch (e) {
    console.error('[bootstrap error]', e);
    process.exit(1);
  }
}

 codex/add-github-storage-service-for-catalog-ymiwro
 codex/add-github-storage-service-for-catalog-6t7hvp

 main
 main
 main
start();
 main
 main
 main
