const CACHE = 'ju-smile-v2-1';
self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(cache=> cache.addAll([
    './','./index.html','./styles.css','./app.js','./manifest.json',
    './icon-192.png','./icon-512.png','./privacy.html','./404.html'
  ])));
  self.skipWaiting();
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e)=>{
  e.respondWith(caches.match(e.request).then(resp=> resp || fetch(e.request)));
});
