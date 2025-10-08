"use client"
import { useEffect } from 'react'
import logger from '../lib/logger'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swUrl = '/service-worker.js'
      const register = async () => {
        try {
          const reg = await navigator.serviceWorker.register(swUrl)
          logger.info('Service worker registered:', reg.scope)

          // Listen for updates and prompt when a new SW takes over
          reg.addEventListener && reg.addEventListener('updatefound', () => {
            const installing = reg.installing
            if (installing) {
              installing.addEventListener('statechange', () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available; you might want to notify the user
                  logger.info('New content available; please refresh.')
                }
              })
            }
          })
        } catch (err) {
          logger.error('Service worker registration failed:', err)
        }
      }

      // Register after page load to avoid blocking first paint
      if (document.readyState === 'complete') register()
      else window.addEventListener('load', register)
    }
  }, [])

  return null
}
