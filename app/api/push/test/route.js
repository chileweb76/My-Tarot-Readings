import { NextResponse } from 'next/server'
import webpush from 'web-push'
import subscriptionStore from '../../../../lib/subscriptionStore.js'

// Configure web-push with VAPID keys
const vapidDetails = {
  subject: process.env.VAPID_SUBJECT || 'mailto:your-email@example.com',
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
}

if (vapidDetails.publicKey && vapidDetails.privateKey) {
  webpush.setVapidDetails(
    vapidDetails.subject,
    vapidDetails.publicKey,
    vapidDetails.privateKey
  )
}

export async function POST(request) {
  try {
    // Check if VAPID keys are configured
    if (!vapidDetails.publicKey || !vapidDetails.privateKey) {
      return NextResponse.json(
        { 
          error: 'Push notifications not configured. Please set VAPID environment variables.',
          missingVars: [
            !vapidDetails.publicKey && 'VAPID_PUBLIC_KEY',
            !vapidDetails.privateKey && 'VAPID_PRIVATE_KEY'
          ].filter(Boolean)
        },
        { status: 500 }
      )
    }

    const { title, body, url, tag } = await request.json().catch(() => ({}))

    const payload = JSON.stringify({
      title: title || 'My Tarot Readings',
      body: body || 'You have new tarot insights waiting for you! ✨',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      url: url || '/',
      tag: tag || 'tarot-notification',
      requireInteraction: false,
      data: {
        url: url || '/',
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'explore',
          title: 'Open App'
        },
        {
          action: 'close',
          title: 'Dismiss'
        }
      ]
    })

    // Get stored subscriptions from MongoDB
    const subscriptions = await subscriptionStore.getAll()

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No subscriptions found',
        sent: 0
      })
    }

    // Send notifications to all subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload)
        return { success: true, endpoint: subscription.endpoint }
      } catch (error) {
        console.error('Error sending to subscription:', error)
        return { success: false, endpoint: subscription.endpoint, error: error.message }
      }
    })

    const results = await Promise.all(sendPromises)
    const successful = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      message: `Test notification sent to ${successful}/${subscriptions.length} subscribers`,
      sent: successful,
      total: subscriptions.length,
      results
    })

  } catch (error) {
    console.error('Error sending test notification:', error)
    return NextResponse.json(
      { error: 'Failed to send test notification: ' + error.message },
      { status: 500 }
    )
  }
}