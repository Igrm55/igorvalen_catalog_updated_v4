const STATIC_CACHE = 'iv-static-v1';
const DATA_CACHE   = 'iv-data-v1';
let offlineEnabled = false;

self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'ENABLE_OFFLINE') {
    offlineEnabled = true;
    event.waitUntil((async () => {
      try {
        const staticCache = await caches.open(STATIC_CACHE);
        await staticCache.addAll(['/', '/index.html', '/img/placeholder.png']);
        const dataCache = await caches.open(DATA_CACHE);
        await dataCache.add('/api/catalog');
        await dataCache.put('offline-enabled', new Response('true'));
      } catch (err) {
        offlineEnabled = false;
        console.error('Falha ao ativar offline:', err);
      }
    })());
  }
  if (msg.type === 'DISABLE_OFFLINE') {
    offlineEnabled = false;
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith('iv-')).map(k => caches.delete(k)));
    })());
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // /api/catalog -> stale-while-revalidate
  if (url.pathname === '/api/catalog') {
    event.respondWith((async () => {
      const cache = await caches.open(DATA_CACHE);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then(res => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (cached) { fetchPromise; return cached; }
      return fetchPromise;
    })());
    return;
  }

  // /api/* -> network-first, fallback se offlineEnabled
  if (url.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      const cache = await caches.open(DATA_CACHE);
      try {
        const res = await fetch(req);
        if (offlineEnabled && res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        if (offlineEnabled) {
          const cached = await cache.match(req);
          if (cached) return cached;
        }
        throw new Error('Network error');
      }
    })());
    return;
  }

  // imagens -> cache-first
  if (req.destination === 'image') {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })());
    return;
  }

  // demais GET -> network-first com fallback se offlineEnabled
  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    try {
      return await fetch(req);
    } catch {
      if (offlineEnabled) {
        const cached = await cache.match(req);
        if (cached) return cached;
      }
      throw new Error('Network error');
    }
  })());
});
