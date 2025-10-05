"use client"

import { useState, useEffect, useActionState } from 'react'
import { savePwaInstallDataAction, updatePwaPreferencesAction, syncOfflineDataAction } from '../lib/pwaActions'

export default function PWAEnhancements() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [onlineStatus, setOnlineStatus] = useState(true)
  const [offlineData, setOfflineData] = useState({ readings: [], tags: [] })
  const [browserInfo, setBrowserInfo] = useState({ name: 'Unknown', canInstall: false })

  // Server Action states
  const [installState, installFormAction, installPending] = useActionState(async (prevState, formData) => {
    const result = await savePwaInstallDataAction(formData)
    if (result.success) {
      return { success: true, message: result.message }
    } else {
      return { error: result.error }
    }
  }, { success: false, error: null })

  const [preferencesState, preferencesFormAction, preferencesPending] = useActionState(async (prevState, formData) => {
    const result = await updatePwaPreferencesAction(formData)
    if (result.success) {
      return { success: true, message: result.message }
    } else {
      return { error: result.error }
    }
  }, { success: false, error: null })

  const [syncState, syncFormAction, syncPending] = useActionState(async (prevState, formData) => {
    const result = await syncOfflineDataAction(formData)
    if (result.success) {
      // Clear offline data after successful sync
      setOfflineData({ readings: [], tags: [] })
      localStorage.removeItem('offlineReadings')
      localStorage.removeItem('offlineTags')
      return { success: true, message: result.message, syncedCount: result.syncedCount }
    } else {
      return { error: result.error }
    }
  }, { success: false, error: null })

  // PWA installation detection
  useEffect(() => {
    // Detect browser type
    const detectBrowser = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      
      if (/chrome|chromium|crios/.test(userAgent) && !/edg/.test(userAgent)) {
        return { name: 'Chrome', canInstall: true, instructions: 'Look for the install icon in the address bar' }
      }
      if (/edg/.test(userAgent)) {
        return { name: 'Edge', canInstall: true, instructions: 'Click the + icon in the address bar' }
      }
      if (/firefox|fxios/.test(userAgent)) {
        return { name: 'Firefox', canInstall: true, instructions: 'Use menu → Install this site as an app' }
      }
      if (/safari/.test(userAgent) && !/chrome|crios/.test(userAgent)) {
        const isIOS = /ipad|iphone|ipod/.test(userAgent)
        if (isIOS) {
          return { name: 'iOS Safari', canInstall: true, instructions: 'Use Share → Add to Home Screen' }
        } else {
          return { name: 'Safari', canInstall: false, instructions: 'Limited PWA support - use Chrome or Edge' }
        }
      }
      
      return { name: 'Unknown', canInstall: 'beforeinstallprompt' in window, instructions: 'Check browser menu for install option' }
    }
    
    setBrowserInfo(detectBrowser())

    // Check if app is installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      setIsStandalone(true)
      setIsInstalled(true)
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      
      // Track installation via Server Action
      const form = new FormData()
      form.append('userAgent', navigator.userAgent)
      form.append('platform', navigator.platform)
      form.append('source', 'browser_prompt')
      installFormAction(form)
    }

    if ('beforeinstallprompt' in window) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      if ('beforeinstallprompt' in window) {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [installFormAction])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true)
    const handleOffline = () => setOnlineStatus(false)

    setOnlineStatus(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load offline data
  useEffect(() => {
    const offlineReadings = JSON.parse(localStorage.getItem('offlineReadings') || '[]')
    const offlineTags = JSON.parse(localStorage.getItem('offlineTags') || '[]')
    setOfflineData({ readings: offlineReadings, tags: offlineTags })
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  // Expose a global trigger for other UI (or modals) that may instruct the user
  // to "click the Install App button above" — some modals are rendered elsewhere
  // and we inject a real button into them via MutationObserver below.
  useEffect(() => {
    window.triggerPwaInstall = async () => {
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt()
          const { outcome } = await deferredPrompt.userChoice
          if (outcome === 'accepted') setDeferredPrompt(null)
        } catch (e) {
          // ignore
        }
      } else {
        // No beforeinstallprompt available; do nothing (instructions explain manual install)
      }
    }

    // Observe for modals titled 'Install App' and inject an Install button if missing
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes || [])) {
          try {
            if (!(node instanceof HTMLElement)) continue
            const modalTitles = node.querySelectorAll && node.querySelectorAll('.modal-title')
            if (!modalTitles) continue
            modalTitles.forEach(titleEl => {
              if (titleEl && /install app/i.test(titleEl.textContent || '')) {
                const header = titleEl.closest('.modal-content')?.querySelector('.modal-header')
                if (header && !header.querySelector('.pwa-install-btn')) {
                  const btn = document.createElement('button')
                  btn.type = 'button'
                  btn.className = 'btn btn-primary btn-sm ms-2 pwa-install-btn'
                  btn.textContent = 'Install App'
                  btn.addEventListener('click', () => {
                    if (window.triggerPwaInstall) window.triggerPwaInstall()
                  })
                  header.appendChild(btn)
                }
              }
            })
          } catch (e) {
            // safe-ignore
          }
        }
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      try { delete window.triggerPwaInstall } catch (e) {}
    }
  }, [deferredPrompt])

  const handleSyncOfflineData = () => {
    const form = new FormData()
    form.append('offlineReadings', JSON.stringify(offlineData.readings))
    form.append('offlineTags', JSON.stringify(offlineData.tags))
    syncFormAction(form)
  }

  const offlineItemCount = offlineData.readings.length + offlineData.tags.length

  return (
    <div className="pwa-enhancements mb-5">
      <h4 className="mb-3">
        <i className="fas fa-mobile-alt me-2"></i>
        Progressive Web App
      </h4>

      {/* Installation Status */}
      <div className="mb-3">
        <div className="d-flex align-items-center mb-2">
          <span className={`badge ${isInstalled ? 'bg-success' : 'bg-secondary'} me-2`}>
            {isInstalled ? 'Installed' : 'Not Installed'}
          </span>
          {isStandalone && <span className="badge bg-info">Standalone Mode</span>}
        </div>

        {!isInstalled && (
          <div className="mb-3">
            {deferredPrompt ? (
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleInstallClick}
              >
                <i className="fas fa-plus me-1"></i>
                Install App
              </button>
            ) : (
              <div className="text-muted">
                <small>
                  <i className="fas fa-info-circle me-1"></i>
                  <strong>{browserInfo.name}</strong>: {browserInfo.instructions}
                </small>
              </div>
            )}
            <div className="form-text">Add this app to your home screen for a better experience</div>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="mb-3">
        <div className="d-flex align-items-center mb-2">
          <span className={`badge ${onlineStatus ? 'bg-success' : 'bg-warning'} me-2`}>
            {onlineStatus ? 'Online' : 'Offline'}
          </span>
          {!onlineStatus && (
            <small className="text-muted">Working in offline mode</small>
          )}
        </div>
      </div>

      {/* Offline Data Sync */}
      {offlineItemCount > 0 && (
        <div className="mb-3">
          <div className="alert alert-info">
            <h6>
              <i className="fas fa-sync-alt me-1"></i>
              Offline Data Available
            </h6>
            <p className="mb-2">
              You have {offlineItemCount} items saved offline:
              {offlineData.readings.length > 0 && <span className="d-block">• {offlineData.readings.length} readings</span>}
              {offlineData.tags.length > 0 && <span className="d-block">• {offlineData.tags.length} tags</span>}
            </p>
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={handleSyncOfflineData}
              disabled={!onlineStatus || syncPending}
            >
              {syncPending ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Syncing...
                </>
              ) : (
                <>
                  <i className="fas fa-cloud-upload-alt me-1"></i>
                  Sync to Cloud
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* PWA Preferences Form */}
      <div className="mb-3">
        <h6>App Preferences</h6>
        <form action={preferencesFormAction}>
          <div className="mb-2">
            <div className="form-check">
              <input 
                className="form-check-input" 
                type="checkbox" 
                name="autoSync"
                id="autoSync"
                defaultChecked
              />
              <label className="form-check-label" htmlFor="autoSync">
                Auto-sync when online
              </label>
            </div>
          </div>
          <div className="mb-2">
            <div className="form-check">
              <input 
                className="form-check-input" 
                type="checkbox" 
                name="offlineMode"
                id="offlineMode"
                defaultChecked
              />
              <label className="form-check-label" htmlFor="offlineMode">
                Enable offline mode
              </label>
            </div>
          </div>
          <div className="mb-3">
            <div className="form-check">
              <input 
                className="form-check-input" 
                type="checkbox" 
                name="cacheReadings"
                id="cacheReadings"
                defaultChecked
              />
              <label className="form-check-label" htmlFor="cacheReadings">
                Cache readings for offline access
              </label>
            </div>
          </div>
          <button 
            type="submit" 
            className="btn btn-sm btn-outline-primary"
            disabled={preferencesPending}
          >
            {preferencesPending ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>
      </div>

      {/* Status Messages */}
      {installState.success && (
        <div className="alert alert-success alert-sm">
          {installState.message}
        </div>
      )}
      
      {preferencesState.success && (
        <div className="alert alert-success alert-sm">
          {preferencesState.message}
        </div>
      )}
      
      {syncState.success && (
        <div className="alert alert-success alert-sm">
          {syncState.message}
        </div>
      )}

      {(installState.error || preferencesState.error || syncState.error) && (
        <div className="alert alert-danger alert-sm">
          {installState.error || preferencesState.error || syncState.error}
        </div>
      )}
    </div>
  )
}