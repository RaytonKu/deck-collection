const CACHE_NAME = 'cardcache-v3';
const urlsToCache = [
  './',
  './index.html',
  'https://unpkg.com/dexie@3.2.4/dist/dexie.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// 安裝 Service Worker 並強制立即激活
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// 清理舊版本的 Cache 快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 攔截請求並應用混合快取策略
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // 對於應用程式 Shell / HTML 導向採用 Network-First 策略，避免版本卡舊版
  if (event.request.mode === 'navigate' || requestUrl.origin === location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 對於第三方 CDN 靜態資源採用 Cache-First 策略
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});