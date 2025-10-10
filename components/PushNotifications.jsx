"use client"
import { useState, useEffect, useCallback } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export default function PushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkSubscription()
    }

    // Listen for programmatic prompt requests (e.g., after PWA install)
    const handler = () => subscribeToPush()
    window.addEventListener('promptEnableNotifications', handler)

    return () => {
      window.removeEventListener('promptEnableNotifications', handler)
    }
  }, [subscribeToPush])

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

  const subscribeToPush = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      alert('VAPID public key not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable.')
      return
    }

    setLoading(true)
    try {
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
        body: JSON.stringify(subscription),
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
      alert('Failed to subscribe to notifications. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

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

  if (!isSupported) {
    return (
      <div className="alert alert-warning">
        <strong>Push notifications are not supported</strong>
        <br />
        Your browser doesn&apos;t support push notifications.
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">🔔 Push Notifications</h5>
      </div>
      <div className="card-body">
        <p className="card-text">
          Get reading reminders.
        </p>
        
        <div className="d-flex gap-2 flex-wrap">
          {!isSubscribed ? (
            <button 
              type="button"
              className="btn btn-primary"
              onClick={subscribeToPush}
              disabled={loading}
            >
              {loading ? 'Subscribing...' : 'Enable Notifications'}
            </button>
          ) : (
            <>
              <button 
                type="button"
                className="btn btn-outline-secondary"
                onClick={unsubscribeFromPush}
                disabled={loading}
              >
                {loading ? 'Unsubscribing...' : 'Disable Notifications'}
              </button>
              {/* Send Test button removed from production settings */}
            </>
          )}
        </div>

        {isSubscribed && (
          <div className="mt-3">
            <small className="text-success">
              ✓ You're subscribed to push notifications
            </small>
          </div>
        )}
      </div>
    </div>
  )
}