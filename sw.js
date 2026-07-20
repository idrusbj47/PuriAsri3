// NAIKKAN nomor versi ini (v2 -> v3 -> v4, dst) SETIAP KALI Anda update
// index.html, manifest.json, atau logo. Ini memaksa HP menghapus cache lama
// dan mengambil versi terbaru dari server.
const CACHE_NAME = 'pallet-app-v21';

const ASSETS = [
  './index.html',
  './manifest.json',
  './logoiosp3.png',
  './Logo RT11-1.png',
  './Logo RT11.png',
  './slide1.png',
  './slide2.png',
  './slide3.png',
  './slide4.png',
  './slide5.png',
  './slide6.png',
  './kas-umum.html',
  './Kematian.html',
  './pengeluaran-kas.html',
  './pengeluaran-kematian.html',
  './index2.html',
  './program-rt.html',
  './timeline-pa3.html',
  './progres-rt.html',
  './dokumentasiacara-rt.html',
  './inventaris-rt.html',
  './adart.html',
  './peta-lokasi.html',
  './poling.html',
  './hut-ri-17an.html'
];

// Halaman-halaman berisi data yang sering berubah (form / sinkron GSheet dll).
// Untuk file-file ini kita pakai STALE-WHILE-REVALIDATE juga (bukan cache-first
// murni), supaya begitu ada versi baru di server, halaman langsung ke-update
// di kunjungan berikutnya tanpa perlu delete cache manual.
const FRESH_PAGES = [
  '/index.html',
  '/manifest.json',
  '/kas-umum.html',
  '/Kematian.html',
  '/pengeluaran-kas.html',
  '/pengeluaran-kematian.html',
  '/index2.html',
  '/program-rt.html',
  '/timeline-pa3.html',
  '/progres-rt.html',
  '/dokumentasiacara-rt.html',
  '/inventaris-rt.html',
  '/adart.html',
  '/peta-lokasi.html',
  '/poling.html',
  '/hut-ri-17an.html'
];

// Pemasangan Service Worker
// PENTING: pakai cache.add() satu-satu (bukan cache.addAll sekaligus).
// Kalau salah SATU saja file di ASSETS tidak ada / typo nama filenya,
// cache.addAll() akan GAGAL TOTAL dan seluruh precache batal terpasang
// (jadi app selalu bergantung ke jaringan = kerasa lambat/lemot).
// Dengan cara ini, satu file gagal cuma di-skip (dicatat di console),
// file lain tetap berhasil di-cache.
self.addEventListener('install', (e) => {
  self.skipWaiting(); // Langsung aktifkan versi baru tanpa menunggu tab lama ditutup
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Gagal cache:', url, err);
          })
        )
      );
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
// - Request BEDA DOMAIN (Google Sheets/docs.google.com, Google Fonts, gtag,
//   dsb): TIDAK disentuh sama sekali oleh Service Worker, langsung dibiarkan
//   lewat ke jaringan (browser default). Ini WAJIB supaya data dari Google
//   Sheet SELALU realtime/terbaru dan tidak pernah ikut ke-cache oleh SW.
// - index.html, manifest.json, & halaman-halaman di FRESH_PAGES: STALE-WHILE-
//   REVALIDATE (langsung tampilkan versi di cache dulu biar app kebuka INSTAN,
//   sambil diam-diam ambil versi terbaru dari server di belakang layar untuk
//   dipakai saat buka berikutnya).
// - File lain (gambar, dll): CACHE-FIRST, dan kalau belum ada di cache, hasil
//   fetch-nya langsung disimpan juga supaya buka berikutnya sudah instan &
//   bisa offline.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Hanya proses request GET ke domain yang sama (origin sendiri).
  // Request beda domain (GSheet CSV, Google Fonts, gtag.js, dll) dilewatkan
  // begitu saja tanpa campur tangan SW, supaya selalu fresh dari server asli.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  const isFreshPage = FRESH_PAGES.some((p) => url.pathname.endsWith(p)) ||
                       url.pathname.endsWith('/');

  if (isFreshPage) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(e.request).then((cachedResponse) => {
          const networkFetch = fetch(e.request)
            .then((networkResponse) => {
              cache.put(e.request, networkResponse.clone());
              return networkResponse;
            })
            .catch(() => cachedResponse); // offline / gagal fetch -> pakai cache

          // ada di cache? tampilkan LANGSUNG (instan), update cache di belakang layar.
          // belum ada di cache? tunggu hasil network.
          return cachedResponse || networkFetch;
        })
      )
    );
  } else {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(e.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(e.request).then((networkResponse) => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        })
      )
    );
  }
});
