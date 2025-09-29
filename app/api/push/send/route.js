import { NextResponse } from 'next/server'
import PushNotificationService from '../../../../lib/pushService.js'

export async function POST(request) {
  try {
    const { type, data } = await request.json()

    let result
    
    switch (type) {
      case 'reading-reminder':
        result = await PushNotificationService.sendReadingReminder(
          data?.readingTitle || 'Your Reading',
          data?.readingUrl || '/reading'
        )
        break
        
      case 'new-insight':
        result = await PushNotificationService.sendNewInsight(data || {})
        break
        
      case 'daily-reading':
        result = await PushNotificationService.sendDailyReading()
        break
        
      case 'custom':
        result = await PushNotificationService.sendToAll(data || {})
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification: ' + error.message },
      { status: 500 }
    )
  }
}