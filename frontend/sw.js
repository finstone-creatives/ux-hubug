/* ════════════════════════════════════════════════════════
   NXT-DOOR Service Worker — Offline & PWA Support
════════════════════════════════════════════════════════ */
const CACHE = 'nxtdoor-v1';
const STATIC = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/assets/css/main.css',
  '/assets/js/app.js',
  '/assets/js/layout.js',
  '/assets/js/pwa.js',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API — network only
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ success: false, message: 'You are offline.' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // External CDN — network first
  if (url.origin !== self.location.origin) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Nxt-door', {
      body: data.body || 'You have a new notification.',
      icon: '/assets/icons/icon-192.svg',
      badge: '/assets/icons/icon-192.svg',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
      tag: data.tag || 'nxtdoor-notif',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
