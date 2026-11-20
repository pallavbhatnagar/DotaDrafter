// Service worker: offline app shell + cached hero/item images.
// Bump VERSION when you change the list of shell files.
const VERSION = 'v62';
const SHELL = `dcb-shell-${VERSION}`;
const RUNTIME = 'dcb-runtime-v1';
const SHELL_FILES = [
  './', './index.html', './css/app.css', './js/app.js', './js/data.js', './js/engine.js', './js/rules.js',
  './manifest.webmanifest', './icons/favicon-64.png', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dcb-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App files: network first so updates arrive on the next open, cache when offline.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }) // always revalidate: GitHub Pages caches files for 10 min
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
    );
    return;
  }

  // Hero portraits, item icons and fonts: cache first (they rarely change).
  if (/steamstatic\.com$|fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.open(RUNTIME).then((cache) =>
        cache.match(req).then((hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
            return res;
          }),
        ),
      ),
    );
  }
  // OpenDota API calls go straight to the network; the app caches them itself.
});
