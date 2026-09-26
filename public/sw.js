// Misfits Cavern — offline-first service worker.
// Strategy: every visited route is cached (network-first, cache fallback), and
// hashed /_next/static assets are cache-first (immutable). Cross-origin calls
// (Supabase, Spotify, Openverse) are never intercepted, so a missing network
// surfaces as an ordinary failure rather than a cached lie.
//
// v2: navigations only cache plain 200 pages (never auth redirects), and a
// failed navigation falls back to that same page's cache or an offline notice —
// never to the cached home page, which rewrote the URL to "/" and made sign-in
// look like it dropped the user on the landing page.
const CACHE = 'mc-shell-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];

const OFFLINE_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Misfits Cavern</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#080808;color:#e0ddae;font-family:monospace;text-align:center;padding:24px">
<div><p style="letter-spacing:4px;text-transform:uppercase;font-size:12px">You're offline</p><p style="opacity:.6;font-size:12px">This page hasn't been opened on this device yet. Reconnect and try again.</p>
<button onclick="location.reload()" style="margin-top:12px;background:#d7340b;color:#080808;border:0;padding:10px 18px;font-family:monospace;letter-spacing:2px;cursor:pointer">RETRY</button></div></body></html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase/Spotify/Openverse: leave alone

  // Whole-page navigations: network-first, fall back to this page's cached copy.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && res.type === 'basic' && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then(
            (m) => m || new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
          ),
        ),
    );
    return;
  }

  // Immutable, hashed build assets: cache-first.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        });
      }),
    );
    return;
  }

  // Images and fonts: stale-while-revalidate.
  if (url.pathname.startsWith('/_next/image/') || /\.(png|jpe?g|svg|webp|gif|woff2?|ttf)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }

  // Same-origin API routes (/api/*): network-only, not cached.
});
