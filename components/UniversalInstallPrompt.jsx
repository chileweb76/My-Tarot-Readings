"use client"
import { useState, useEffect } from 'react'

export default function UniversalInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [browserInfo, setBrowserInfo] = useState({ name: 'Unknown', isSupported: false })
  const [isPWAInstalled, setIsPWAInstalled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstructions, setShowInstructions] = useState(false)

  // Detect browser type and PWA support
  useEffect(() => {
    const detectBrowser = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isIOS = /ipad|iphone|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      
      if (isIOS) {
        const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent)
        return {
          name: 'iOS Safari',
          isSupported: isSafari,
          instructions: 'ios'
        }
      }
      
      if (/chrome|chromium|crios/.test(userAgent) && !/edg/.test(userAgent)) {
        return {
          name: 'Chrome',
          isSupported: true,
          instructions: 'chrome'
        }
      }
      
      if (/firefox|fxios/.test(userAgent)) {
        return {
          name: 'Firefox',
          isSupported: true,
          instructions: 'firefox'
        }
      }
      
      if (/edg/.test(userAgent)) {
        return {
          name: 'Edge',
          isSupported: true,
          instructions: 'edge'
        }
      }
      
      if (/safari/.test(userAgent) && !/chrome|crios/.test(userAgent)) {
        return {
          name: 'Safari',
          isSupported: false,
          instructions: 'safari'
        }
      }
      
      return {
        name: 'Other',
        isSupported: 'beforeinstallprompt' in window,
        instructions: 'generic'
      }
    }

    setBrowserInfo(detectBrowser())

    // Detect if PWA is already installed (enhanced iOS detection)
    const pwaInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true ||
                        // Additional iOS detection
                        (window.navigator.standalone !== undefined && window.navigator.standalone) ||
                        // Check if launched from home screen on iOS
                        (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches)
    
    console.log('PWA Installation Status:', {
      displayMode: window.matchMedia('(display-mode: standalone)').matches,
      navigatorStandalone: window.navigator.standalone,
      detected: pwaInstalled,
      userAgent: navigator.userAgent
    })
    
    setIsPWAInstalled(pwaInstalled)

    // Check if user previously dismissed this prompt
    const dismissed = localStorage.getItem('universal-install-prompt-dismissed') === 'true'
    setIsDismissed(dismissed)
    
    // For iOS, also check if user manually marked as installed
    const manuallyMarkedInstalled = localStorage.getItem('pwa-manually-installed') === 'true'
    if (manuallyMarkedInstalled && !pwaInstalled) {
      setIsPWAInstalled(true)
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Show prompt if not dismissed and not installed
      if (!dismissed && !pwaInstalled) {
        const timer = setTimeout(() => {
          setShowPrompt(true)
        }, 2000)
        return () => clearTimeout(timer)
      }
    }

    // Only add event listener if beforeinstallprompt is supported
    if ('beforeinstallprompt' in window) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }

    return () => {
      if ('beforeinstallprompt' in window) {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
    }
  }, [])

  const dismissPrompt = () => {
    setShowPrompt(false)
    setIsDismissed(true)
    localStorage.setItem('universal-install-prompt-dismissed', 'true')
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Chrome/Edge native install
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setShowPrompt(false)
        setDeferredPrompt(null)
      }
    } else {
      // Show manual instructions
      setShowInstructions(true)
    }
  }

  const getInstructions = () => {
    switch (browserInfo.instructions) {
      case 'chrome':
        return (
          <div className="instructions">
            <h6>Install on Chrome:</h6>
            <ol>
              <li>Click the <strong>Install App</strong> button above, or</li>
              <li>Look for the <strong>⊕ Install</strong> icon in the address bar</li>
              <li>Click <strong>&quot;Install&quot;</strong> in the popup</li>
              <li>The app will be added to your desktop and app menu</li>
            </ol>
          </div>
        )
      
      case 'edge':
        return (
          <div className="instructions">
            <h6>Install on Edge:</h6>
            <ol>
              <li>Click the <strong>Install App</strong> button above, or</li>
              <li>Click the <strong>⊕</strong> icon in the address bar</li>
              <li>Select <strong>&quot;Install this site as an app&quot;</strong></li>
              <li>Click <strong>&quot;Install&quot;</strong></li>
            </ol>
          </div>
        )
      
      case 'firefox':
        return (
          <div className="instructions">
            <h6>Install on Firefox:</h6>
            <ol>
              <li>Click the <strong>☰ Menu</strong> button</li>
              <li>Select <strong>&quot;Install this site as an app&quot;</strong></li>
              <li>Choose a name and click <strong>&quot;Install&quot;</strong></li>
              <li>The app will open in its own window</li>
            </ol>
          </div>
        )
      
      case 'ios':
        return (
          <div className="instructions">
            <h6>Install on iOS Safari:</h6>
            <ol>
              <li>Tap the <strong>Share</strong> button <span style={{fontSize: '1.2em'}}>⤴️</span></li>
              <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></li>
              <li>Tap <strong>&quot;Add&quot;</strong></li>
              <li>The app icon will appear on your home screen</li>
            </ol>
            <div className="mt-3">
              <button 
                className="btn btn-success btn-sm"
                onClick={() => {
                  localStorage.setItem('pwa-manually-installed', 'true')
                  setIsPWAInstalled(true)
                  setShowPrompt(false)
                }}
              >
                ✓ I've completed installation
              </button>
            </div>
          </div>
        )
      
      case 'safari':
        return (
          <div className="instructions">
            <h6>Safari Desktop:</h6>
            <p>Safari desktop has limited PWA support. For the best experience:</p>
            <ul>
              <li>Use <strong>Chrome</strong> or <strong>Edge</strong> for full PWA features</li>
              <li>Or bookmark this page for quick access</li>
            </ul>
          </div>
        )
      
      default:
        return (
          <div className="instructions">
            <h6>Install Instructions:</h6>
            <p>Look for an <strong>Install</strong> or <strong>Add to Home Screen</strong> option in your browser&apos;s menu or address bar.</p>
          </div>
        )
    }
  }

  // Don't show if already installed or not supported
  if (isPWAInstalled || isDismissed || (!browserInfo.isSupported && !deferredPrompt)) {
    return null
  }

  if (!showPrompt) {
    // Small install hint for supported browsers
    if (deferredPrompt || browserInfo.isSupported) {
      return (
        <div 
          className="position-fixed bottom-0 end-0 m-3 p-2 bg-primary text-white rounded-2 cursor-pointer small"
          style={{ fontSize: '0.8rem', zIndex: 1050 }}
          onClick={() => setShowPrompt(true)}
        >
          <i className="fas fa-download me-1"></i>
          Install App
        </div>
      )
    }
    return null
  }

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
         style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
      <div className="card" style={{ maxWidth: '400px', margin: '0 20px' }}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-mobile-alt me-2"></i>
            Install App
          </h5>
          <button 
            type="button" 
            className="btn-close" 
            onClick={dismissPrompt}
            aria-label="Close"
          ></button>
        </div>
        <div className="card-body">
          <p className="mb-3">
            <strong>Get the full experience!</strong> Install My Tarot Readings as an app for:
          </p>
          <ul className="mb-3">
            <li>📱 Faster loading and better performance</li>
            <li>🔄 Work offline with your readings</li>
            <li>🔔 Push notifications for daily insights</li>
            <li>🎨 Full-screen app experience</li>
          </ul>
          
          <div className="d-flex gap-2 mb-3">
            {deferredPrompt ? (
              <button 
                className="btn btn-primary"
                onClick={handleInstallClick}
              >
                <i className="fas fa-download me-1"></i>
                Install Now
              </button>
            ) : (
              <button 
                className="btn btn-primary"
                onClick={() => setShowInstructions(!showInstructions)}
              >
                <i className="fas fa-info-circle me-1"></i>
                Show Instructions
              </button>
            )}
            
            <button 
              className="btn btn-outline-secondary"
              onClick={dismissPrompt}
            >
              Maybe Later
            </button>
          </div>
          
          {showInstructions && (
            <div className="alert alert-info">
              {getInstructions()}
            </div>
          )}
          
          <small className="text-muted">
            Detected: <strong>{browserInfo.name}</strong>
            {!browserInfo.isSupported && ' (Limited PWA support)'}
          </small>
        </div>
      </div>
    </div>
  )
}