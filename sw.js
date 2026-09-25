// Service worker for Woodshed.
//
// Everything on this origin is fetched network-first, so an edit to any file shows up on the next open with
// signal, and the last good copy is served when there is none (a basement, a plane, a practice room). The one
// exception is the piano samples: big, and never edited in place, so they come from the cache first.
// Bump CACHE_VERSION only when you rename or remove files, or change the font URL.
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'woodshed-' + CACHE_VERSION;
// Piano recordings never change once published (a new recording gets a new name), so they are fetched once and kept
// in their own cache, which survives app updates and CACHE_VERSION bumps.
const SAMPLE_CACHE = 'woodshed-samples-1';

const PRECACHE = [
  './', './index.html', './manifest.json', './css/app.css',
  './js/theory.js', './js/glyphs.js', './js/staff.js', './js/audio.js', './js/keyboard.js', './js/songs.js',
  './js/app.js', './js/view-chords.js', './js/view-keys.js', './js/view-sheet.js', './js/view-train.js', './js/view-play.js',
  './js/view-study.js', './js/tuner.js', './js/view-trombone.js', './js/tutor.js',
  './fonts/accidentals.otf', './icons/icon-192.png', './icons/icon-512.png'
];

// Keep identical to the font <link> in index.html.
const FONT_CSS = [
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE).then(() => precacheFonts(cache)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('woodshed-') && k !== CACHE_NAME && k !== SAMPLE_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.includes('/samples/')) { event.respondWith(sampleFirst(url.origin + url.pathname)); return; }
    const key = url.origin + (url.pathname.endsWith('/index.html') ? url.pathname.slice(0, -10) : url.pathname);
    event.respondWith(networkFirst(key));
    return;
  }
  if (FONT_HOSTS.includes(url.hostname)) event.respondWith(cacheFirst(request));
  // Anything else (the Claude API above all) goes straight to the network and is never cached.
});

// Best effort. A font problem must not stop the app from installing.
function precacheFonts(cache) {
  return Promise.all(FONT_CSS.map(sheet => fetch(sheet, { mode: 'cors' })
    .then(response => {
      if (!response.ok) throw new Error('stylesheet returned ' + response.status);
      const copy = response.clone();
      return response.text().then(css => {
        const files = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g) || [])];
        return Promise.all([cache.put(sheet, copy), cache.addAll(files)]);
      });
    })
    .catch(err => console.warn('Fonts not precached:', err.message))));
}

function networkFirst(key) {
  return fetch(key, { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(key, copy));
      return response;
    })
    .catch(() => caches.match(key).then(cached => cached || Response.error()));
}

function sampleFirst(key) {
  return caches.open(SAMPLE_CACHE).then(cache => cache.match(key).then(hit => hit || fetch(key).then(response => {
    if (response.ok) cache.put(key, response.clone());
    return response;
  })));
}

function cacheFirst(request) {
  return caches.match(request.url).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response.ok || response.type === 'opaque') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request.url, copy));
      }
      return response;
    });
  });
}
