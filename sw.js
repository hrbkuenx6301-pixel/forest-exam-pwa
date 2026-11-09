const CACHE_NAME = 'forest-exam-v1.9.0';
const IMAGE_CACHE = 'forest-exam-images-v1';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('forest-exam-v') && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, {cache:'no-store'});
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return (await cache.match(request)) || (await cache.match('./index.html'));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function remoteImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response) cache.put(request, response.clone()).catch(()=>{});
    return response;
  } catch (err) {
    return (await cache.match(request)) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin) {
    if (event.request.mode === 'navigate') event.respondWith(networkFirst(event.request));
    else event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  if (url.hostname === 'cbtbank.kr' && event.request.destination === 'image') {
    event.respondWith(remoteImage(event.request));
  }
});
