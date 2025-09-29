import { NextResponse } from 'next/server'
import PushNotificationService from '../../../../lib/pushService.js'

export async function GET(request) {
  try {
    // Verify the request is from Vercel Cron (optional security)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Send daily reading notifications
    const result = await PushNotificationService.sendDailyReading()

    return NextResponse.json({
      success: true,
      message: 'Daily notifications sent',
      ...result
    })
  } catch (error) {
    console.error('Error sending daily notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send daily notifications' },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request) {
  try {
    const { type = 'daily-reading' } = await request.json().catch(() => ({}))

    let result
    switch (type) {
      case 'daily-reading':
        result = await PushNotificationService.sendDailyReading()
        break
      case 'weekly-insights':
        result = await PushNotificationService.sendToAll({
          title: 'Weekly Tarot Insights 📅',
          body: 'Check out this week\'s tarot trends and insights!',
          url: '/insights',
          tag: 'weekly-insights'
        })
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `${type} notifications sent`,
      ...result
    })
  } catch (error) {
    console.error('Error sending scheduled notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}