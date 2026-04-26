const CACHE = 'wc2026-v6';

self.addEventListener('install', e => {
    const base = self.registration.scope;
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll([
            base,
            base + 'manifest.json',
            base + 'icon.svg'
        ]))
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    // Network-first: always fetch fresh, fall back to cache when offline
    e.respondWith(
        fetch(e.request)
            .then(res => {
                if (res.ok && e.request.url.startsWith(self.registration.scope)) {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});
