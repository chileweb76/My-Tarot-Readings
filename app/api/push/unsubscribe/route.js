import { NextResponse } from 'next/server'
import subscriptionStore from '../../../../lib/subscriptionStore.js'
import { getUserFromToken } from '../../../../lib/actions/utils'

export async function POST(request) {
  try {
    const subscription = await request.json()
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      )
    }

    // Remove the subscription
    const success = await subscriptionStore.remove(subscription)
    
    if (!success) {
      console.warn('Subscription not found or already removed:', subscription.endpoint)
    } else {
      console.log('Removed push subscription:', subscription.endpoint)
      // If user is authenticated, remove the subscription id from their array
      try {
        const user = await getUserFromToken()
        if (user) {
          const subscriptionId = subscriptionStore._generateSubscriptionId(subscription)
          const { connectToDatabase } = await import('../../../../lib/mongo')
          const { db } = await connectToDatabase()
          await db.collection('users').updateOne({ _id: user._id }, { $pull: { pushSubscriptionIds: subscriptionId } })
        }
      } catch (e) {
        // ignore unauthenticated or DB errors
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Unsubscribed successfully' 
    })
  } catch (error) {
    console.error('Error removing subscription:', error)
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    )
  }
}