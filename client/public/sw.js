// Service Worker per FLUPSY PWA - Versione aggiornata 2025-08-17-fix
const CACHE_NAME = 'flupsy-v2025-08-17-cache-fix';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png'
];

// Installazione del Service Worker
self.addEventListener('install', function(event) {
  console.log('[SW] Installing Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Attivazione del Service Worker
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating Service Worker');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercettazione delle richieste di rete
self.addEventListener('fetch', function(event) {
  // Non cachare richieste API o POST
  if (event.request.url.includes('/api/') || event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Restituisce la risorsa dalla cache se disponibile
        if (response) {
          return response;
        }
        
        // Altrimenti effettua la richiesta di rete
        return fetch(event.request).then(function(response) {
          // Controlla se la risposta è valida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clona la risposta
          var responseToCache = response.clone();

          // Aggiunge la risorsa alla cache solo per risorse statiche
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      }
    )
  );
});

// Gestione delle notifiche push (per future implementazioni)
self.addEventListener('push', function(event) {
  console.log('[SW] Push received');
  const options = {
    body: 'Nuova operazione FLUPSY completata',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-72.png'
  };

  event.waitUntil(
    self.registration.showNotification('FLUPSY Delta Futuro', options)
  );
});