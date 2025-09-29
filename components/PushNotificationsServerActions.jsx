"use client"

import { useState, useActionState } from 'react'
import { subscribeToPushAction, unsubscribeFromPushAction } from '../lib/actions'

export default function PushNotificationsServerActions({ user }) {
  const [subscription, setSubscription] = useState(null)
  const [isSupported, setIsSupported] = useState(false)

  // Server Action states
  const [subscribeState, subscribeFormAction, subscribePending] = useActionState(async (prevState, formData) => {
    const result = await subscribeToPushAction(formData)
    if (result.success) {
      return { success: true, message: result.message }
    } else {
      return { error: result.error }
    }
  }, { success: false, error: null })

  const [unsubscribeState, unsubscribeFormAction, unsubscribePending] = useActionState(async (prevState, formData) => {
    const result = await unsubscribeFromPushAction(formData)
    if (result.success) {
      setSubscription(null)
      return { success: true, message: result.message }
    } else {
      return { error: result.error }
    }
  }, { success: false, error: null })

  // Check for push notification support
  useState(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
    }
  }, [])

  const handleSubscribe = async () => {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Notification permission denied')
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready
      
      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      })

      setSubscription(pushSubscription)

      // Create form data and submit
      const form = new FormData()
      form.append('subscription', JSON.stringify(pushSubscription))
      await subscribeFormAction(form)

    } catch (error) {
      console.error('Push subscription failed:', error)
    }
  }

  const handleUnsubscribe = async () => {
    if (!subscription) return

    try {
      // Unsubscribe from push manager
      await subscription.unsubscribe()
      
      // Create form data and submit
      const form = new FormData()
      form.append('endpoint', subscription.endpoint)
      await unsubscribeFormAction(form)

    } catch (error) {
      console.error('Push unsubscription failed:', error)
    }
  }

  if (!isSupported) {
    return (
      <div className="alert alert-info">
        <h5>Push Notifications</h5>
        <p>Push notifications are not supported in this browser.</p>
      </div>
    )
  }

  return (
    <div className="mb-5">
      <h4 className="mb-3">
        <i className="fas fa-bell me-2"></i>
        Push Notifications
      </h4>
      
      {subscribeState.error && (
        <div className="alert alert-danger">
          {subscribeState.error}
        </div>
      )}
      
      {subscribeState.success && (
        <div className="alert alert-success">
          {subscribeState.message}
        </div>
      )}
      
      {unsubscribeState.error && (
        <div className="alert alert-danger">
          {unsubscribeState.error}
        </div>
      )}
      
      {unsubscribeState.success && (
        <div className="alert alert-success">
          {unsubscribeState.message}
        </div>
      )}

      <div className="mb-3">
        <p className="card-text">
          Enable push notifications to receive reminders about your tarot practice, 
          new features, and other important updates.
        </p>
      </div>

      <div className="d-flex gap-2">
        {!subscription ? (
          <button 
            className="btn btn-primary"
            onClick={handleSubscribe}
            disabled={subscribePending}
          >
            {subscribePending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Subscribing...
              </>
            ) : (
              'Enable Notifications'
            )}
          </button>
        ) : (
          <button 
            className="btn btn-outline-secondary"
            onClick={handleUnsubscribe}
            disabled={unsubscribePending}
          >
            {unsubscribePending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Unsubscribing...
              </>
            ) : (
              'Disable Notifications'
            )}
          </button>
        )}
      </div>

      <div className="mt-2">
        <small className="text-muted">
          Status: {subscription ? 'Subscribed' : 'Not subscribed'}
        </small>
      </div>
    </div>
  )
}