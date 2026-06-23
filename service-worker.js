const CACHE_NAME = 'gasolineras2-v7';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './src/styles/base.css',
  './src/styles/layout.css',
  './src/styles/components.css',
  './src/app.js',
  './src/router.js',
  './src/config/constants.js',
  './src/config/fuels.js',
  './src/services/api.js',
  './src/services/location.js',
  './src/services/leafletLoader.js',
  './src/state/storage.js',
  './src/state/fuelStore.js',
  './src/state/favoritesStore.js',
  './src/state/themeStore.js',
  './src/utils/dom.js',
  './src/utils/format.js',
  './src/utils/geo.js',
  './src/components/appShell.js',
  './src/components/themeToggle.js',
  './src/components/bottomNav.js',
  './src/components/priceRadar.js',
  './src/components/locationBadge.js',
  './src/components/breadcrumbs.js',
  './src/components/emptyState.js',
  './src/components/fuelToggle.js',
  './src/components/mapView.js',
  './src/components/searchBox.js',
  './src/components/sortToggle.js',
  './src/components/stationCard.js',
  './src/components/stationList.js',
  './src/components/statsGrid.js',
  './src/components/trendCard.js',
  './src/pages/homePage.js',
  './src/pages/municipalityPage.js',
  './src/pages/notFoundPage.js',
  './src/pages/provincePage.js',
  './src/pages/stationPage.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.endsWith('/config.js')) {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => caches.match(request)));
    return;
  }

  if (url.hostname.includes('alon.one')) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      return response;
    }))
  );
});
