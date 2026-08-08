/* =========================================================
 * Service Worker — منصة الحَسَنَيْن
 * 1) Precache app shell (HTML/CSS/JS/icons) → app opens offline
 * 2) Runtime-cache Mushaf pages fetched from api.quran.com
 *    → any page the user reads once stays available offline
 * 3) Optional bulk "download whole Mushaf" is driven from the
 *    page (mshfDownloadOffline) — it just fetches every page,
 *    and this SW's fetch handler caches each response.
 * ========================================================= */

const SW_VERSION   = 'v2';
const SHELL_CACHE   = `hassanain-shell-${SW_VERSION}`;
const PAGES_CACHE    = `hassanain-mushaf-pages-${SW_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/auth.css',
  '/css/memorize.css',
  '/css/features.css',
  '/js/auth.js',
  '/js/script.js',
  '/js/memorize.js',
  '/js/features.js',
  '/assets/favicon.ico',
  '/assets/favicon-32x32.png',
  '/assets/apple-touch-icon.png',
];

// Requests to this host are individual Mushaf pages — cache them forever
// (text doesn't change), refreshing in the background when online.
const MUSHAF_API_HOST = 'api.quran.com';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // don't block install if one asset 404s
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== SHELL_CACHE && n !== PAGES_CACHE)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ---- 1) Mushaf page text from api.quran.com: cache-first, refresh in bg ----
  if (url.hostname === MUSHAF_API_HOST) {
    event.respondWith(
      caches.open(PAGES_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        // Serve cached instantly if we have it, else wait for network
        return cached || (await network) || new Response(
          JSON.stringify({ verses: [], offline: true }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // ---- 2) Same-origin app shell: cache-first, fall back to network ----
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => {
            // Offline + not cached + it's a navigation → show the app shell
            if (req.mode === 'navigate') return caches.match('/index.html');
            return new Response('', { status: 504 });
          });
      })
    );
    return;
  }

  // ---- 3) Everything else (fonts, Firebase, Groq…) → let the network handle it ----
});
