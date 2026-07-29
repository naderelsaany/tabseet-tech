const CACHE_NAME = 'tabseet-cache-v4';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    
    '/favicon.ico',
    '/icon-192.png',
    '/icon-512.png',

    '/about.html',
    '/contact.html',
    '/status.html',
    '/api-docs.html',
    '/tos.html',
    '/privacy.html',
    '/dmca.html',
    '/security.html',
    '/llms.txt'
];

// Install Event - Cache Core Assets
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching core static assets...');
            return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { credentials: 'omit' }))).catch(err => {
                console.warn('[Service Worker] Partial asset cache warning:', err);
            });
        })
    );
});

// Activate Event - Clean Up Old Caches & Take Control
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Hybrid Routing Strategy (Network-First for HTML/APIs, Stale-While-Revalidate for CSS/JS/Icons)
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Ignore non-GET requests, chrome-extension schemes, or external tracking/turnstile requests
    if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
        return;
    }

    // Do not cache API endpoints or Cloudflare turnstile widgets
    if (url.pathname.startsWith('/api/') || url.hostname.includes('cloudflare.com')) {
        return;
    }

    // Strategy 1: HTML Navigation & Document requests -> Network First, Fallback to Cache
    if (request.mode === 'navigate' || request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
            }).catch(async () => {
                const cachedResponse = await caches.match(request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Fallback to home page if navigating offline to an uncached URL
                return caches.match('/');
            })
        );
        return;
    }

    // Strategy 2: Static Assets (CSS, JS, Fonts, Images, SVGs) -> Stale-While-Revalidate (Instant Load + Background Update)
    if (
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'image' ||
        request.destination === 'font' ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.svg')
    ) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                const fetchPromise = fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }
                    return networkResponse;
                }).catch(() => {
                    // Ignore network error on background revalidation
                });

                // Return cached response immediately if available, while updating cache in background
                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // Default Fallback: Cache First, then Network
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            return cachedResponse || fetch(request);
        })
    );
});
