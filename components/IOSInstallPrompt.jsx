"use client"
import { useState, useEffect } from 'react'

export default function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isPWAInstalled, setIsPWAInstalled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Detect iOS
    const iosDetected = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(iosDetected)

    // Detect if PWA is already installed
    const pwaInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true
    setIsPWAInstalled(pwaInstalled)

    // Check if user previously dismissed this prompt
    const dismissed = localStorage.getItem('ios-install-prompt-dismissed') === 'true'
    setIsDismissed(dismissed)

    // Show prompt if iOS, not installed, not dismissed, and after a short delay
    if (iosDetected && !pwaInstalled && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // Show after 3 seconds

      return () => clearTimeout(timer)
    }
  }, [])

  const dismissPrompt = () => {
    setShowPrompt(false)
    setIsDismissed(true)
    localStorage.setItem('ios-install-prompt-dismissed', 'true')
  }

  const showInstructions = () => {
    setShowPrompt(true)
  }

  if (!isIOS || isPWAInstalled || isDismissed) {
    return null
  }

  if (!showPrompt) {
    // Small install hint in corner
    return (
      <div 
        className="position-fixed bottom-0 end-0 m-3 d-none d-md-block"
        style={{ zIndex: 1050 }}
      >
        <button 
          className="btn btn-primary btn-sm"
          onClick={showInstructions}
          title="Install app for better experience"
        >
          📱 Install App
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
        style={{ zIndex: 1040 }}
        onClick={dismissPrompt}
      />
      
      {/* Install Prompt Modal */}
      <div 
        className="position-fixed top-50 start-50 translate-middle bg-white rounded shadow-lg p-4"
        style={{ zIndex: 1050, maxWidth: '90vw', width: '400px' }}
      >
        <div className="text-center">
          <div className="mb-3">
            <span style={{ fontSize: '3rem' }}>📱</span>
          </div>
          
          <h5 className="mb-3">Install My Tarot Readings</h5>
          
          <p className="text-muted mb-4">
            Install this app to your home screen for the best experience, including push notifications!
          </p>

          <div className="alert alert-info text-start mb-4">
            <strong>How to install:</strong>
            <ol className="mb-0 mt-2">
              <li>Tap the <strong>Share</strong> button <span className="badge bg-primary">⬆️</span> in Safari</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>"Add"</strong> to complete installation</li>
            </ol>
          </div>

          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-secondary flex-grow-1"
              onClick={dismissPrompt}
            >
              Maybe Later
            </button>
            <button 
              className="btn btn-primary flex-grow-1"
              onClick={() => {
                // On iOS, we can't programmatically trigger the install
                // but we can give detailed instructions
                alert("To install:\n1. Tap the Share button (���️) in Safari\n2. Scroll and tap 'Add to Home Screen'\n3. Tap 'Add'")
                dismissPrompt()
              }}
            >
              Show Me How
            </button>
          </div>
        </div>
      </div>
    </>
  )
}