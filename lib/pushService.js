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

    // We will send notifications only to users who have notificationEnabled === true
    // and whose `notificationTime` matches the current local time in their timezone.
    // For this we need to lookup users and map them to subscriptions.

    const { connectToDatabase } = await import('./mongo.js')
    const { db } = await connectToDatabase()

    // Get all active subscriptions documents (which may include endpoint and createdAt)
    const subDocs = await (async () => {
      try {
        const collection = db.collection('pushSubscriptions')
        return await collection.find({ isActive: true }).toArray()
      } catch (e) {
        // Fallback to subscriptionStore.getAll() if DB collection not present
        return (await subscriptionStore.getAll()).map(s => ({ subscription: s }))
      }
    })()

    if (!subDocs || subDocs.length === 0) {
      return { success: true, sent: 0, message: 'No subscribers' }
    }

    // Build payload once
    const payloadObj = {
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
    }

    let successful = 0
    let failed = 0
    const errors = []

    // Helper: check if given user prefers notification at current moment
    const userPrefersNow = (user) => {
      try {
        if (!user || !user.notificationEnabled) return false
        if (!user.notificationTime) return false
        const tz = user.notificationTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        // Create a date in user's timezone representing 'now' and extract HH:MM
        const nowStr = new Date().toLocaleString('en-GB', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' })
        // nowStr looks like 'HH:MM' or 'DD/MM/YYYY, HH:MM' — ensure we take the HH:MM portion
        const hhmm = nowStr.slice(-5)
        return hhmm === user.notificationTime
      } catch (e) {
        return false
      }
    }

    // For each subscription document, try to find an associated user (if stored), otherwise send to all
    for (const doc of subDocs) {
      const subscription = doc.subscription || doc.subscriptionId ? doc.subscription : doc

      // Attempt to find a user linked to this subscription
      // Priority:
      // 1) subscription document carries userId
      // 2) match users whose pushSubscriptionIds contains this subscriptionId
      let user = null
      try {
        if (doc.userId) {
          user = await db.collection('users').findOne({ _id: doc.userId })
        } else if (doc.subscriptionId || doc.endpoint) {
          const subscriptionId = doc.subscriptionId || Buffer.from(doc.endpoint || '').toString('base64').slice(0,50)
          user = await db.collection('users').findOne({ pushSubscriptionIds: subscriptionId })
        }
      } catch (e) {
        // ignore lookup errors and fall back to sending
      }

      // If we have a user, check preference; otherwise default to send
      if (user && !userPrefersNow(user)) {
        continue
      }

      const payload = JSON.stringify(payloadObj)
      try {
        await webpush.sendNotification(subscription, payload)
        successful++
      } catch (error) {
        failed++
        errors.push({ endpoint: subscription.endpoint, error: error.message })

        if (error.statusCode === 410 || error.statusCode === 404) {
          try { await subscriptionStore.markInactive(subscription) } catch (e) {}
        }
      }
    }

    return {
      success: true,
      sent: successful,
      failed,
      total: subDocs.length,
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
      body: 'Grab your cards! It\'s time for a daily reading!',
      url: '/reading',
      tag: 'daily-reading'
    })
  }
}

export default PushNotificationService