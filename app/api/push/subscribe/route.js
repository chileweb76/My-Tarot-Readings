import { NextResponse } from 'next/server'
import subscriptionStore from '../../../../lib/subscriptionStore.js'

export async function POST(request) {
  try {
    const subscription = await request.json()
    
    // Validate the subscription object
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      )
    }

    // Store the subscription in MongoDB
    const success = await subscriptionStore.add(subscription)
    
    if (!success) {
      throw new Error('Failed to save subscription')
    }
    
    console.log('New push subscription saved:', subscription.endpoint)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Subscription saved successfully' 
    })
  } catch (error) {
    console.error('Error saving subscription:', error)
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    )
  }
}

// Get all subscriptions (for admin use)
export async function GET() {
  try {
    const subscriptionList = await subscriptionStore.getAll()
    const count = await subscriptionStore.getCount()
    
    return NextResponse.json({
      subscriptions: subscriptionList,
      count: count
    })
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}