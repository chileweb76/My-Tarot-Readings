import { NextResponse } from 'next/server'
import subscriptionStore from '../../../../lib/subscriptionStore.js'

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