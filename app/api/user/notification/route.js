import { NextResponse } from 'next/server'
import { getUserFromToken } from '../../../../lib/actions/utils'
import { connectToDatabase } from '../../../../lib/mongo'

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { time, timezone, enabled } = body

    if (!time || typeof time !== 'string') {
      return NextResponse.json({ error: 'Invalid time' }, { status: 400 })
    }

    const user = await getUserFromToken()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { db } = await connectToDatabase()
    const update = {
      notificationTime: time,
      notificationTimezone: timezone || user.notificationTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
    if (typeof enabled === 'boolean') update.notificationEnabled = enabled

    await db.collection('users').updateOne({ _id: user._id }, { $set: update })

    // Return the updated user doc (minimal fields)
    const updated = await db.collection('users').findOne({ _id: user._id }, { projection: { password: 0 } })

    return NextResponse.json({ success: true, user: updated })
  } catch (error) {
    console.error('Error updating notification time:', error)
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 })
  }
}
