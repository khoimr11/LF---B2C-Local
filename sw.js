// Living Furniture dashboard service worker: makes the site installable and usable offline.
// App shell is cached; data/data.enc.json is always fetched fresh first (cached copy only when offline).
const CACHE = 'lf-v8';
const SHELL = ['./', 'index.html', 'assets/styles.css?v=8', 'assets/app.js?v=8', 'assets/logo.png', 'assets/favicon.png', 'assets/icon-192.png', 'assets/icon-512.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const fresh = u.pathname.endsWith('data.enc.json') || e.request.mode === 'navigate';
  if (fresh) { e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(u.pathname.endsWith('data.enc.json') ? 'data/data.enc.json' : e.request, c)); return r; }).catch(() => caches.match(u.pathname.endsWith('data.enc.json') ? 'data/data.enc.json' : e.request).then(m => m || caches.match('index.html')))); return; }
  e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })));
});
