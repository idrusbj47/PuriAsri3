// NAIKKAN nomor versi ini (v2 -> v3 -> v4, dst) SETIAP KALI Anda update
// index.html, manifest.json, atau logo. Ini memaksa HP menghapus cache lama
// dan mengambil versi terbaru dari server.
const CACHE_NAME = 'pallet-app-v9';

const ASSETS = [
  './index.html',
  './manifest.json',
  './logoiosp3.png',
  './Logo RT11-1.png',
  './slide1.png',
  './slide2.png',
  './slide3.png',
  './slide5.png',
  './slide6.png'
];

// Pemasangan Service Worker
self.addEventListener('install', (e) => {
  self.skipWaiting(); // Langsung aktifkan versi baru tanpa menunggu tab lama ditutup
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Aktivasi & Pembersihan Cache Lama
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Langsung ambil alih halaman yang sedang terbuka
  );
});

// Strategi pengambilan data:
// - index.html & manifest.json: NETWORK-FIRST (selalu coba ambil versi terbaru dari
//   server dulu; kalau gagal/offline baru pakai cache). Ini mencegah tampilan/ikon
//   "nyangkut" di versi lama setelah Anda update file di server.
// - File lain (logo, dll): CACHE-FIRST seperti biasa, supaya tetap cepat & bisa offline.
self.addEventListener('fetch', (e) => {
  const isCriticalFile = e.request.url.endsWith('index.html') ||
                         e.request.url.endsWith('manifest.json') ||
                         e.request.url.endsWith('/') ;

  if (isCriticalFile) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        return cachedResponse || fetch(e.request);
      })
    );
  }
});
