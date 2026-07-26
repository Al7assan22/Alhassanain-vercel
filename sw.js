/* Al-Hassanein Service Worker — Offline cache */
const CACHE = 'hassanein-v2';
const CORE = [
  '/', '/index.html',
  '/css/style.css', '/css/auth.css', '/css/memorize.css', '/css/features.css',
  '/js/script.js', '/js/auth.js', '/js/memorize.js', '/js/features.js',
  '/assets/favicon.ico', '/assets/favicon-32x32.png', '/assets/apple-touch-icon.png',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Network-first for APIs / streaming audio
  if (url.pathname.startsWith('/api/') || /\.(mp3|m3u8|aac)$/i.test(url.pathname) ||
      /api\.alquran\.cloud|mp3quran|radiojar|api\.aladhan/i.test(url.hostname)) {
    return; // let the network handle it
  }

  // Cache-first for static, fallback network then cache
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => cached))
  );
});
