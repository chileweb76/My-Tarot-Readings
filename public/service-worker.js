// Service worker for My Tarot Readings PWA with Server Action Support
const CACHE_NAME = 'mytarot-v4.0'
const OFFLINE_CACHE = 'mytarot-offline-v2.0'  
const READING_CACHE = 'mytarot-readings-v2.0'

const ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline',
]

// Core app routes for offline access
const APP_ROUTES = [
  '/',
  '/reading',
  '/insights', 
  '/about',
  '/settings',
  '/decks',
  '/auth'
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
      caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(APP_ROUTES.map(route => `${route}?_offline=true`))),
      caches.open(READING_CACHE) // For user readings
    ])
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.map((key) => key !== CACHE_NAME && caches.delete(key))
      )
      // Take control of all clients immediately
      await self.clients.claim()
    })()
  )
})

// Enhanced fetch handler with offline support (excludes Server Actions to prevent conflicts)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // Skip Server Actions entirely - let them be handled natively
  // This prevents "Request body is already used" errors and queuing failures
  if (event.request.method === 'POST') {
    // Check if this is a Server Action by looking for Next.js action indicators
    const isServerAction = event.request.headers.has('Next-Action') || 
                          url.pathname.includes('_next') ||
                          event.request.headers.get('content-type')?.includes('multipart/form-data')
    
    if (isServerAction) {
      // Let Server Actions pass through without service worker intervention
      return
    }
    
    // Handle other POST requests (like API calls) normally
    event.respondWith(
      fetch(event.request).catch((error) => {
        // SW POST request failed (error suppressed)
        return new Response(
          JSON.stringify({ error: 'Network error, please try again when online' }),
          { status: 503, headers: { 'Content-Type': 'application/json' }}
        )
      })
    )
    return
  }

  // Handle GET requests with caching strategy
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        // For app routes, always try network first to get fresh content
        if (APP_ROUTES.some(route => url.pathname.startsWith(route))) {
          return fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                // Cache successful responses
                const responseClone = response.clone()
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone))
              }
              return response
            })
            .catch(() => {
              // Fall back to cache if network fails
              return cached || caches.match('/offline')
            })
        }
        
        // For other resources, use cache-first strategy
        if (cached) return cached
        
        return fetch(event.request)
          .then((res) => {
            // Cache successful responses for static assets
            if (res && res.status === 200 && event.request.destination !== 'document') {
              const resClone = res.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone))
            }
            return res
          })
          .catch(() => {
            // When offline and asking for navigation, serve the cached root or offline page
            if (event.request.mode === 'navigate') {
              return caches.match('/') || caches.match('/offline')
            }
          })
      })
    )
  }
})

// Removed queueServerAction function - Server Actions now bypass service worker

// Push notification event handler
self.addEventListener('push', (event) => {
  const options = {
    body: 'You have a new tarot insight waiting for you!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/icons/icon-192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-192.png'
      }
    ]
  }

  let notificationData = {
    title: 'My Tarot Readings',
    ...options
  }

  if (event.data) {
    try {
      const payload = event.data.json()
      notificationData = {
        title: payload.title || 'My Tarot Readings',
        body: payload.body || options.body,
        icon: payload.icon || options.icon,
        badge: payload.badge || options.badge,
        data: payload.data || options.data,
        actions: payload.actions || options.actions,
        tag: payload.tag,
        requireInteraction: payload.requireInteraction || false
      }
    } catch (error) {
      // Push payload parse error (suppressed)
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  const urlToOpen = event.action === 'explore' ? '/' : '/'

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
