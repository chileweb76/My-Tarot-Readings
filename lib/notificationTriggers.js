// Notification trigger utilities for frontend
export const NotificationTriggers = {
  
  // Trigger notification after reading is created
  async onReadingCreated(readingData) {
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reading-reminder',
          data: {
            readingTitle: `${readingData.spread || 'New'} Reading for ${readingData.querent || 'yourself'}`,
            readingUrl: `/reading/${readingData._id}`
          }
        })
      })
      
      if (!response.ok) {
        console.warn('Failed to send reading created notification')
      } else {
        const result = await response.json()
        console.log('Reading notification sent to', result.sent, 'subscribers')
      }
    } catch (error) {
      console.error('Error sending reading notification:', error)
    }
  },

  // Trigger insight notification
  async onInsightGenerated(insight) {
    try {
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new-insight',
          data: {
            message: insight.message || 'New tarot insight available!'
          }
        })
      })
    } catch (error) {
      console.error('Error sending insight notification:', error)
    }
  },

  // Trigger daily reading reminder
  async sendDailyReminder() {
    try {
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'daily-reading'
        })
      })
    } catch (error) {
      console.error('Error sending daily reminder:', error)
    }
  },

  // Custom notification sender
  async sendCustom(title, body, url, tag) {
    try {
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          data: { title, body, url, tag }
        })
      })
    } catch (error) {
      console.error('Error sending custom notification:', error)
    }
  }
}