const VERSION = 'v4';
const CORE = [
  '/',
  '/index.html',
  '/img/placeholder.png'
];

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
  // Stale-while-revalidate for others
  e.respondWith((async ()=>{
    const cache = await caches.open('sw-'+VERSION);
    const cached = await cache.match(req);
    const fetched = fetch(req).then(r=>{
      if (r.ok) cache.put(req, r.clone());
      return r;
    }).catch(()=>cached);
    return cached || fetched;
  })());
});
