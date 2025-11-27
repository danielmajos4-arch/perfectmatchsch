/**
 * Service Worker for PerfectMatchSchools PWA
 * 
 * Cache Strategies:
 * - Static assets (JS, CSS, fonts): Cache First
 * - API calls: Network First with fallback
 * - Images: Cache First with expiration
 * - HTML: Network First with cache fallback
 */

// Service Worker for PerfectMatchSchools PWA
// Version: Update this when deploying new versions
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `perfectmatch-v${CACHE_VERSION}`;
const STATIC_CACHE = `perfectmatch-static-${CACHE_VERSION}`;
const API_CACHE = `perfectmatch-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `perfectmatch-images-${CACHE_VERSION}`;
const OFFLINE_CACHE = `perfectmatch-offline-${CACHE_VERSION}`;

// Maximum cache size (50MB in bytes)
const MAX_CACHE_SIZE = 50 * 1024 * 1024;

// Cache expiration times (in milliseconds)
const IMAGE_CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const API_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Pre-cache critical assets on install
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Cache critical static assets
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('[Service Worker] Failed to cache some static assets:', err);
        // Continue even if some assets fail to cache
      });
    }).then(() => {
      console.log('[Service Worker] Pre-cached', urlsToCache.length, 'assets');
    })
  );
  
  // Force activation of new service worker immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...', CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old caches that don't match current version
              return (
                cacheName.startsWith('perfectmatch-') &&
                cacheName !== STATIC_CACHE &&
                cacheName !== API_CACHE &&
                cacheName !== IMAGE_CACHE &&
                cacheName !== OFFLINE_CACHE
              );
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Take control of all pages immediately
      self.clients.claim(),
      // Clean up expired cache entries
      cleanupExpiredCaches(),
    ])
  );
  
  console.log('[Service Worker] Activated and ready');
});

// Fetch event - implement cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle different resource types with appropriate strategies
  if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImage(request.url)) {
    event.respondWith(cacheFirstWithExpiry(request, IMAGE_CACHE));
  } else if (isAPIRequest(request.url)) {
    event.respondWith(networkFirstWithFallback(request, API_CACHE));
  } else if (isHTML(request.url)) {
    event.respondWith(networkFirstWithOfflineFallback(request));
  } else {
    // Default: Network first with cache fallback
    event.respondWith(networkFirstWithFallback(request, STATIC_CACHE));
  }
});

// Helper functions to categorize requests
function isStaticAsset(url) {
  return (
    url.includes('/assets/') ||
    url.endsWith('.js') ||
    url.endsWith('.css') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com') ||
    url.includes('/icons/') ||
    url.endsWith('.woff') ||
    url.endsWith('.woff2') ||
    url.endsWith('.ttf') ||
    url.endsWith('.eot')
  );
}

function isImage(url) {
  return (
    url.endsWith('.png') ||
    url.endsWith('.jpg') ||
    url.endsWith('.jpeg') ||
    url.endsWith('.gif') ||
    url.endsWith('.webp') ||
    url.endsWith('.svg') ||
    url.endsWith('.ico')
  );
}

function isAPIRequest(url) {
  return (
    url.includes('/rest/v1/') || // Supabase REST API
    url.includes('/auth/v1/') || // Supabase Auth API
    url.includes('/realtime/v1/') || // Supabase Realtime
    url.includes('/storage/v1/') || // Supabase Storage
    url.includes('/functions/v1/') || // Supabase Edge Functions
    url.includes('supabase.co') ||
    url.includes('supabase.io')
  );
}

function isHTML(url) {
  return (
    url.endsWith('.html') ||
    (!url.includes('.') && !isAPIRequest(url) && !isImage(url))
  );
}

// Cache First Strategy - for static assets
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache First error:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Cache First with Expiry - for images
async function cacheFirstWithExpiry(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Check if cached response has expiry metadata
      const cachedDate = cachedResponse.headers.get('sw-cached-date');
      if (cachedDate) {
        const cacheAge = Date.now() - parseInt(cachedDate);
        if (cacheAge < IMAGE_CACHE_EXPIRY) {
          return cachedResponse;
        }
      } else {
        // If no expiry metadata, use cached response
        return cachedResponse;
      }
    }
    
    // Fetch fresh image
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Add expiry metadata to response
      const responseClone = networkResponse.clone();
      const newHeaders = new Headers(responseClone.headers);
      newHeaders.set('sw-cached-date', Date.now().toString());
      
      const newResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: newHeaders,
      });
      
      cache.put(request, newResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache First with Expiry error:', error);
    // Return cached response even if expired, if available
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Image unavailable', { status: 503 });
  }
}

// Network First with Fallback - for API calls
async function networkFirstWithFallback(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseClone = networkResponse.clone();
      
      // Add expiry metadata for API responses
      const newHeaders = new Headers(responseClone.headers);
      newHeaders.set('sw-cached-date', Date.now().toString());
      
      const newResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: newHeaders,
      });
      
      cache.put(request, newResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', error);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Check if cached API response is still valid
      const cachedDate = cachedResponse.headers.get('sw-cached-date');
      if (cachedDate) {
        const cacheAge = Date.now() - parseInt(cachedDate);
        if (cacheAge < API_CACHE_EXPIRY) {
          return cachedResponse;
        }
      } else {
        // If no expiry metadata, use cached response
        return cachedResponse;
      }
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No internet connection' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Network First with Offline Fallback - for HTML pages
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, serving offline page:', error);
    
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Serve offline fallback page
    const offlineCache = await caches.open(OFFLINE_CACHE);
    const offlinePage = await offlineCache.match('/offline.html');
    
    if (offlinePage) {
      return offlinePage;
    }
    
    // Last resort: return basic offline message
    return new Response(
      `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Offline - PerfectMatchSchools</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #00BCD4 0%, #E91E8C 100%);
              color: white;
              text-align: center;
              padding: 20px;
            }
            .container {
              max-width: 400px;
            }
            h1 { font-size: 2rem; margin-bottom: 1rem; }
            p { font-size: 1.1rem; opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

// Cleanup expired cache entries
async function cleanupExpiredCaches() {
  try {
    const cacheNames = await caches.keys();
    const currentCaches = [STATIC_CACHE, API_CACHE, IMAGE_CACHE, OFFLINE_CACHE];
    
    for (const cacheName of cacheNames) {
      if (!currentCaches.includes(cacheName) && cacheName.startsWith('perfectmatch-')) {
        console.log('[Service Worker] Cleaning up old cache:', cacheName);
        await caches.delete(cacheName);
      }
    }
    
    // Check cache sizes and clean up if needed
    await enforceCacheSizeLimits();
  } catch (error) {
    console.error('[Service Worker] Error during cache cleanup:', error);
  }
}

// Enforce cache size limits
async function enforceCacheSizeLimits() {
  try {
    let totalSize = 0;
    const cacheNames = [STATIC_CACHE, API_CACHE, IMAGE_CACHE];
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }
    
    if (totalSize > MAX_CACHE_SIZE) {
      console.warn('[Service Worker] Cache size exceeds limit, cleaning up oldest entries');
      // Remove oldest entries from image cache first (least critical)
      await cleanupOldestEntries(IMAGE_CACHE, totalSize - MAX_CACHE_SIZE);
    }
  } catch (error) {
    console.error('[Service Worker] Error enforcing cache size limits:', error);
  }
}

// Clean up oldest cache entries
async function cleanupOldestEntries(cacheName, bytesToFree) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const entries = [];
    
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.blob();
        const cachedDate = response.headers.get('sw-cached-date');
        entries.push({
          key,
          size: blob.size,
          date: cachedDate ? parseInt(cachedDate) : 0,
        });
      }
    }
    
    // Sort by date (oldest first)
    entries.sort((a, b) => a.date - b.date);
    
    let freed = 0;
    for (const entry of entries) {
      if (freed >= bytesToFree) break;
      await cache.delete(entry.key);
      freed += entry.size;
      console.log('[Service Worker] Deleted old cache entry:', entry.key);
    }
  } catch (error) {
    console.error('[Service Worker] Error cleaning up oldest entries:', error);
  }
}

// Message handler for cache updates and communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Received SKIP_WAITING message');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      }).then(() => {
        console.log('[Service Worker] Cached additional URLs:', event.data.urls);
      })
    );
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        console.log('[Service Worker] All caches cleared');
        event.ports[0]?.postMessage({ success: true });
      })
    );
  }
});

