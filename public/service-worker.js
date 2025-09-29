// Service worker for My Tarot Readings PWA with Enhanced Offline Support
const CACHE_NAME = 'mytarot-v3.0'
const OFFLINE_CACHE = 'mytarot-offline-v1.0'
const READING_CACHE = 'mytarot-readings-v1.0'

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

// Enhanced fetch handler with Server Actions support and offline functionality
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // Handle Server Actions (POST requests)
  if (event.request.method === 'POST') {
    // For Server Actions, try network first, queue if offline
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If successful, return response
          if (response.ok) {
            return response
          }
          throw new Error('Server Action failed')
        })
        .catch(async (error) => {
          // If offline or failed, queue the action for later sync
          console.log('[SW] Server Action failed, queuing for sync:', error)
          
          try {
            // Store failed Server Actions in IndexedDB for background sync
            const requestData = {
              url: event.request.url,
              method: event.request.method,
              headers: [...event.request.headers.entries()],
              body: await event.request.clone().text(),
              timestamp: Date.now()
            }
            
            // Queue for background sync
            await queueServerAction(requestData)
            
            // Return a synthetic response indicating offline queue
            return new Response(
              JSON.stringify({ 
                queued: true, 
                message: 'Action queued for sync when online' 
              }),
              { 
                status: 202, 
                headers: { 'Content-Type': 'application/json' }
              }
            )
          } catch (queueError) {
            console.error('[SW] Failed to queue Server Action:', queueError)
            return new Response(
              JSON.stringify({ error: 'Failed to queue offline action' }),
              { status: 500, headers: { 'Content-Type': 'application/json' }}
            )
          }
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

// Helper function to queue Server Actions for background sync
async function queueServerAction(requestData) {
  // In a real implementation, you would use IndexedDB
  // For now, we'll use a simple approach with postMessage to the client
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({
      type: 'QUEUE_SERVER_ACTION',
      data: requestData
    })
  })
}

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
      console.error('Error parsing push payload:', error)
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
