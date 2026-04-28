const CACHE_NAME = 'mi-pwa-v2'; 

const urlsToCache = [
  './',              // El punto indica la carpeta actual
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json'  // Agregamos el manifest al cache
];

// Evento: Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache v2 abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento: Activación - limpiar caches antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento: Fetch - servir desde cache si existe, si no desde red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});