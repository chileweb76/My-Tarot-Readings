"use client"
import { useState, useEffect } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export default function PushNotificationsIOS() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isPWAInstalled, setIsPWAInstalled] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  useEffect(() => {
    // Detect iOS
    const iosDetected = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(iosDetected)

    // Detect if PWA is installed (standalone mode)
    const pwaInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true
    setIsPWAInstalled(pwaInstalled)

    // Check push notification support
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      // iOS requires PWA to be installed for push notifications
      if (iosDetected && !pwaInstalled) {
        setIsSupported(false)
      } else {
        setIsSupported(true)
        checkSubscription()
      }
    }
  }, [])

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        setSubscription(subscription)
        setIsSubscribed(true)
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
  }

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const subscribeToPush = async () => {
    if (!VAPID_PUBLIC_KEY) {
      alert('VAPID public key not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable.')
      return
    }

    // iOS-specific check
    if (isIOS && !isPWAInstalled) {
      setShowIOSInstructions(true)
      return
    }

    setLoading(true)
    try {
      // Request notification permission first (required on iOS)
      const permission = await Notification.requestPermission()
      
      if (permission !== 'granted') {
        throw new Error('Notification permission denied')
      }

      const registration = await navigator.serviceWorker.ready
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...subscription,
          platform: isIOS ? 'ios' : 'other',
          userAgent: navigator.userAgent
        }),
      })

      if (response.ok) {
        setSubscription(subscription)
        setIsSubscribed(true)
        alert('Successfully subscribed to notifications!')
      } else {
        throw new Error('Failed to save subscription on server')
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      
      // iOS-specific error handling
      if (isIOS) {
        if (error.message.includes('permission')) {
          alert('Please allow notifications in your device settings and try again.')
        } else {
          alert('Make sure this app is installed to your home screen first, then try enabling notifications.')
        }
      } else {
        alert('Failed to subscribe to notifications. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const unsubscribeFromPush = async () => {
    setLoading(true)
    try {
      if (subscription) {
        await subscription.unsubscribe()
        
        // Notify server about unsubscription
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription),
        })

        setSubscription(null)
        setIsSubscribed(false)
        alert('Successfully unsubscribed from notifications!')
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      alert('Failed to unsubscribe. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        alert('Test notification sent!')
      } else {
        throw new Error('Failed to send test notification')
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      alert('Failed to send test notification.')
    }
  }

  // iOS PWA Installation Instructions
  const IOSInstructions = () => (
    <div className="alert alert-info">
      <strong>📱 iOS Setup Required</strong>
      <hr />
      <p>To receive push notifications on iOS, please:</p>
      <ol>
        <li>Tap the <strong>Share</strong> button in Safari</li>
        <li>Select <strong>"Add to Home Screen"</strong></li>
        <li>Tap <strong>"Add"</strong> to install the app</li>
        <li>Open the app from your home screen</li>
        <li>Return here to enable notifications</li>
      </ol>
      <button 
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setShowIOSInstructions(false)}
      >
        Got it
      </button>
    </div>
  )

  // Unsupported browser message
  if (!isSupported && !isIOS) {
    return (
      <div className="alert alert-warning">
        <strong>Push notifications are not supported</strong>
        <br />
        Your browser doesn't support push notifications.
      </div>
    )
  }

  // iOS without PWA installation
  if (isIOS && !isPWAInstalled) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">🔔 Push Notifications</h5>
        </div>
        <div className="card-body">
          <div className="alert alert-info">
            <strong>📱 iOS Device Detected</strong>
            <p className="mb-2">
              Push notifications on iOS require this app to be installed to your home screen first.
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowIOSInstructions(true)}
            >
              Show Installation Instructions
            </button>
          </div>
          
          {showIOSInstructions && <IOSInstructions />}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">
          🔔 Push Notifications 
          {isIOS && <span className="badge bg-info ms-2">iOS</span>}
        </h5>
      </div>
      <div className="card-body">
        <p className="card-text">
          Get notified about new insights, reading reminders, and tarot tips.
        </p>
        
        {isIOS && isPWAInstalled && (
          <div className="alert alert-success alert-sm mb-3">
            <small>✓ PWA installed - push notifications available</small>
          </div>
        )}
        
        <div className="d-flex gap-2 flex-wrap">
          {!isSubscribed ? (
            <button 
              className="btn btn-primary"
              onClick={subscribeToPush}
              disabled={loading}
            >
              {loading ? 'Subscribing...' : 'Enable Notifications'}
            </button>
          ) : (
            <>
              <button 
                className="btn btn-outline-secondary"
                onClick={unsubscribeFromPush}
                disabled={loading}
              >
                {loading ? 'Unsubscribing...' : 'Disable Notifications'}
              </button>
              <button 
                className="btn btn-outline-primary"
                onClick={sendTestNotification}
              >
                Send Test
              </button>
            </>
          )}
        </div>

        {isSubscribed && (
          <div className="mt-3">
            <small className="text-success">
              ✓ You're subscribed to push notifications
              {isIOS && ' (iOS PWA mode)'}
            </small>
          </div>
        )}
      </div>
    </div>
  )
}