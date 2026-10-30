// public/sw.js
// A minimal service worker to enable PWA installation

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // We are not caching anything for now, just intercepting the fetch
  // to make the browser happy so it allows installation.
});
