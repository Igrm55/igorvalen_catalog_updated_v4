const VERSION = 'v5';
const CORE = [
  '/',
  '/index.html',
  '/img/placeholder.png'
];

let OFFLINE_ENABLED = false;

self.addEventListener('message', (e)=>{
  if (e.data && e.data.type === 'offline') {
    OFFLINE_ENABLED = !!e.data.enabled;
  }
});

self.addEventListener('install', (e)=>{
  self.skipWaiting();
  e.waitUntil(caches.open('core-'+VERSION).then(c=>c.addAll(CORE)));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(keys.map(k=>{
      if (!k.endsWith(VERSION)) return caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  // Network-first for API
  if (url.pathname.startsWith('/api/')){
    e.respondWith(fetch(req).catch(()=>caches.match(req)));
    return;
  }
  e.respondWith((async ()=>{
    const cache = await caches.open('sw-'+VERSION);
    const cached = await cache.match(req);
    try {
      const res = await fetch(req);
      if (OFFLINE_ENABLED && res.ok) cache.put(req, res.clone());
      return res;
    } catch(err) {
      return cached;
    }
  })());
});
