import subscriptionStore from './subscriptionStore.js'

// Utility for sending push notifications
export class PushNotificationService {
  
  static async sendToAll(notification) {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn('VAPID keys not configured - push notifications disabled')
      return { success: false, error: 'VAPID not configured' }
    }

    // Dynamic import to avoid issues if web-push is not available
    let webpush
    try {
      webpush = await import('web-push')
    } catch (error) {
      console.error('web-push module not available:', error)
      return { success: false, error: 'web-push not available' }
    }

    // Configure VAPID
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:your-email@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )

    const subscriptions = await subscriptionStore.getAll()
    
    if (subscriptions.length === 0) {
      return { success: true, sent: 0, message: 'No subscribers' }
    }

    const payload = JSON.stringify({
      title: notification.title || 'My Tarot Readings',
      body: notification.body || 'You have new content!',
      icon: notification.icon || '/icons/icon-192.png',
      badge: notification.badge || '/icons/icon-192.png',
      url: notification.url || '/',
      tag: notification.tag || 'tarot-notification',
      data: {
        url: notification.url || '/',
        timestamp: Date.now(),
        ...notification.data
      },
      actions: notification.actions || [
        { action: 'explore', title: 'Open App' },
        { action: 'close', title: 'Dismiss' }
      ]
    })

    let successful = 0
    let failed = 0
    const errors = []

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(subscription, payload)
        successful++
      } catch (error) {
        failed++
        errors.push({ endpoint: subscription.endpoint, error: error.message })
        
        // Remove invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          await subscriptionStore.markInactive(subscription)
        }
      }
    }

    return {
      success: true,
      sent: successful,
      failed,
      total: subscriptions.length,
      errors: failed > 0 ? errors : undefined
    }
  }

  // Convenience methods for common notification types
  static async sendReadingReminder(readingTitle, readingUrl) {
    return this.sendToAll({
      title: 'Tarot Reading Reminder 🔮',
      body: `Time to reflect on your reading: "${readingTitle}"`,
      url: readingUrl,
      tag: 'reading-reminder'
    })
  }

  static async sendNewInsight(insight) {
    return this.sendToAll({
      title: 'New Tarot Insight ✨',
      body: insight.message || 'A new insight is available for you!',
      url: '/insights',
      tag: 'new-insight'
    })
  }

  static async sendDailyReading() {
    return this.sendToAll({
      title: 'Daily Tarot Reading 🌅',
      body: 'Grab your cards it\'s time for a daily reading!',
      url: '/reading',
      tag: 'daily-reading'
    })
  }
}

export default PushNotificationService