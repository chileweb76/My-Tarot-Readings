import { NextResponse } from 'next/server'
import subscriptionStore from '../../../../lib/subscriptionStore.js'
import { connectToDatabase } from '../../../../lib/mongoConnection.js'

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = 'mytarotreadings'

export async function GET() {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      issues: [],
      statistics: {},
      configuration: {}
    }

    // Check VAPID configuration
    const hasVapidKeys = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
    health.configuration.vapid = hasVapidKeys ? 'configured' : 'missing'
    
    if (!hasVapidKeys) {
      health.issues.push('VAPID keys not configured')
      health.status = 'degraded'
    }

    // Check MongoDB connection and subscription statistics
    try {
      if (!MONGODB_URI) {
        health.issues.push('MongoDB URI not configured')
        health.status = 'degraded'
        health.statistics.storage = 'fallback-memory'
      } else {
        const { db } = await connectToDatabase(MONGODB_URI, DB_NAME)
        const collection = db.collection('pushSubscriptions')
        
        const stats = await collection.aggregate([
          {
            $facet: {
              active: [{ $match: { isActive: true } }, { $count: 'count' }],
              inactive: [{ $match: { isActive: false } }, { $count: 'count' }],
              recent: [
                { $match: { isActive: true, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
                { $count: 'count' }
              ]
            }
          }
        ]).toArray()

        health.statistics = {
          storage: 'mongodb',
          activeSubscriptions: stats[0]?.active[0]?.count || 0,
          inactiveSubscriptions: stats[0]?.inactive[0]?.count || 0,
          recentSubscriptions: stats[0]?.recent[0]?.count || 0,
          totalSubscriptions: (stats[0]?.active[0]?.count || 0) + (stats[0]?.inactive[0]?.count || 0)
        }
      }
    } catch (dbError) {
      health.issues.push(`Database error: ${dbError.message}`)
      health.status = 'degraded'
      health.statistics.storage = 'fallback-memory'
    }

    // Check web-push module availability
    try {
      await import('web-push')
      health.configuration.webPush = 'available'
    } catch (webPushError) {
      health.issues.push('web-push module not available')
      health.status = 'unhealthy'
      health.configuration.webPush = 'missing'
    }

    // Check cron secret for scheduled notifications
    health.configuration.cronSecret = process.env.CRON_SECRET ? 'configured' : 'missing'
    if (!process.env.CRON_SECRET) {
      health.issues.push('CRON_SECRET not configured - scheduled notifications may not work')
    }

    return NextResponse.json(health)
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error.message,
      issues: ['System error occurred']
    }, { status: 500 })
  }
}

// Admin endpoint to get detailed subscription information
export async function POST(request) {
  try {
    const { action } = await request.json()

    switch (action) {
      case 'cleanup-inactive':
        if (!MONGODB_URI) {
          return NextResponse.json({ error: 'Database not available' }, { status: 400 })
        }
        
        const { db } = await connectToDatabase(MONGODB_URI, DB_NAME)
        const collection = db.collection('pushSubscriptions')
        
        // Delete inactive subscriptions older than 7 days
        const result = await collection.deleteMany({
          isActive: false,
          deactivatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        })
        
        return NextResponse.json({
          success: true,
          deletedCount: result.deletedCount,
          message: `Cleaned up ${result.deletedCount} old inactive subscriptions`
        })

      case 'test-notification':
        const PushNotificationService = await import('../../../../lib/pushService.js')
        const testResult = await PushNotificationService.default.sendToAll({
          title: 'System Test 🔧',
          body: 'Push notification system is working correctly!',
          tag: 'system-test'
        })
        
        return NextResponse.json({
          success: true,
          ...testResult
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Health check admin action error:', error)
    return NextResponse.json(
      { error: 'Failed to execute admin action' },
      { status: 500 }
    )
  }
}