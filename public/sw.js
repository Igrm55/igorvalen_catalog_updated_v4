const STATIC_CACHE = 'iv-static-v1';
const DATA_CACHE = 'iv-data-v1';
let offlineEnabled = false;

// Recupera estado salvo do modo offline
caches.open(DATA_CACHE).then(cache => {
  cache.match('offline-enabled').then(res => { offlineEnabled = !!res; });
});

self.addEventListener('message', event => {
  const msg = event.data || {};
  if (msg.type === 'ENABLE_OFFLINE') {
    offlineEnabled = true;
    event.waitUntil((async () => {
      const staticCache = await caches.open(STATIC_CACHE);
 codex/fix-and-enhance-tablet-catalog-ui-x796zw
      const assets = ['/', '/index.html', '/img/placeholder.png'];
      await Promise.all(assets.map(a => staticCache.add(a).catch(()=>{})));

      await staticCache.addAll(['/', '/index.html', '/img/placeholder.png']);
 main
      const dataCache = await caches.open(DATA_CACHE);
      await dataCache.add('/api/catalog');
      await dataCache.put('offline-enabled', new Response('true'));
    })());
  }
  if (msg.type === 'DISABLE_OFFLINE') {
    offlineEnabled = false;
    event.waitUntil((async () => {
      await caches.delete(DATA_CACHE);
    })());
  }
});

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => {
      if (![STATIC_CACHE, DATA_CACHE].includes(k)) return caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Catálogo: stale-while-revalidate
  if (url.pathname === '/api/catalog') {
    event.respondWith((async () => {
      const cache = await caches.open(DATA_CACHE);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then(res => {
        if (offlineEnabled && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (cached) {
        fetchPromise;
        return cached;
      }
      return fetchPromise;
    })());
    return;
  }

 codex/fix-and-enhance-tablet-catalog-ui-x796zw
  // Demais APIs: network-first com fallback quando offlineEnabled

  // Demais APIs: network-first
 main
  if (url.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      const cache = await caches.open(DATA_CACHE);
      try {
        const res = await fetch(req);
        if (offlineEnabled && res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
 codex/fix-and-enhance-tablet-catalog-ui-x796zw
        if (offlineEnabled) {
          const cached = await cache.match(req);
          if (cached) return cached;
        }

        const cached = await cache.match(req);
        if (cached) return cached;
 main
        throw err;
      }
    })());
    return;
  }

  // Imagens: cache-first
  if (req.destination === 'image') {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        return cached;
      }
    })());
    return;
  }

 codex/fix-and-enhance-tablet-catalog-ui-x796zw
  // Demais requisições GET: network-first com cache somente se offlineEnabled

  // Demais requisições GET
 main
  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    try {
      const res = await fetch(req);
      if (offlineEnabled && res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
 codex/fix-and-enhance-tablet-catalog-ui-x796zw
      if (offlineEnabled) {
        const cached = await cache.match(req);
        if (cached) return cached;
      }

      const cached = await cache.match(req);
      if (cached) return cached;
 main
      throw err;
    }
  })());
});

