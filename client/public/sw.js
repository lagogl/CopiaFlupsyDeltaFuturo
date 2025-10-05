// Service Worker per FLUPSY PWA - Versione aggiornata 2025-10-05-critical-fix
const CACHE_NAME = 'flupsy-v2025-10-05-critical-fix';
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

  // Network First per file JS/CSS (sempre la versione più recente)
  const isJsOrCss = event.request.url.match(/\.(js|css|tsx|ts)(\?.*)?$/);
  
  if (isJsOrCss) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // Aggiorna la cache con la nuova versione
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(function() {
          // Se la rete fallisce, usa la cache come fallback
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache First per altre risorse statiche (immagini, manifest, etc.)
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(function(response) {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          var responseToCache = response.clone();
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