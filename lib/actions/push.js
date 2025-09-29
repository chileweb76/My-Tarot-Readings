"use server"

import { getUserFromToken, makeAuthenticatedAPICall } from './utils'

export async function subscribeToPushAction(formData) {
  try {
    const user = await getUserFromToken()
    const subscription = formData.get('subscription')
    
    if (!subscription) {
      return { error: 'Subscription data is required' }
    }

    let parsedSubscription
    try {
      parsedSubscription = JSON.parse(subscription)
    } catch (e) {
      return { error: 'Invalid subscription format' }
    }

    const response = await makeAuthenticatedAPICall('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: parsedSubscription }),
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to subscribe to push notifications')
    }

    const data = await response.json()
    return { success: true, message: data.message || 'Successfully subscribed to push notifications' }
  } catch (error) {
    console.error('Subscribe to push error:', error)
    return { error: error.message || 'Failed to subscribe to push notifications' }
  }
}

export async function unsubscribeFromPushAction(formData) {
  try {
    const user = await getUserFromToken()
    const subscription = formData.get('subscription')
    
    if (!subscription) {
      return { error: 'Subscription data is required' }
    }

    let parsedSubscription
    try {
      parsedSubscription = JSON.parse(subscription)
    } catch (e) {
      return { error: 'Invalid subscription format' }
    }

    const response = await makeAuthenticatedAPICall('/api/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: parsedSubscription }),
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to unsubscribe from push notifications')
    }

    const data = await response.json()
    return { success: true, message: data.message || 'Successfully unsubscribed from push notifications' }
  } catch (error) {
    console.error('Unsubscribe from push error:', error)
    return { error: error.message || 'Failed to unsubscribe from push notifications' }
  }
}