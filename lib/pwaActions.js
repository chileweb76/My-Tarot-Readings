"use server"

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import connectToDatabase from './mongo'
import { ObjectId } from 'mongodb'

// PWA-specific Server Actions
export async function savePwaInstallDataAction(formData) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return { error: 'Authentication required' }
    }

    const { db } = await connectToDatabase()
    
    // Get user from token (simplified for demo)
    const installData = {
      userAgent: formData.get('userAgent') || '',
      platform: formData.get('platform') || '',
      installedAt: new Date(),
      source: formData.get('source') || 'manual'
    }

    // Save PWA installation tracking
    await db.collection('pwaInstalls').insertOne(installData)
    
    return { success: true, message: 'PWA installation tracked' }
  } catch (error) {
    console.error('PWA install tracking error:', error)
    return { error: 'Failed to track PWA installation' }
  }
}

export async function updatePwaPreferencesAction(formData) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return { error: 'Authentication required' }
    }

    const { db } = await connectToDatabase()
    
    const preferences = {
      autoSync: formData.get('autoSync') === 'on',
      offlineMode: formData.get('offlineMode') === 'on',
      cacheReadings: formData.get('cacheReadings') === 'on',
      updatedAt: new Date()
    }

    // Update user PWA preferences
    await db.collection('users').updateOne(
      { /* user filter */ },
      { $set: { pwaPreferences: preferences } }
    )
    
    revalidatePath('/settings')
    return { success: true, message: 'PWA preferences updated' }
  } catch (error) {
    console.error('PWA preferences update error:', error)
    return { error: 'Failed to update PWA preferences' }
  }
}

// Offline sync Server Action
export async function syncOfflineDataAction(formData) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return { error: 'Authentication required' }
    }

    const { db } = await connectToDatabase()
    
    // Parse offline data
    const offlineReadings = JSON.parse(formData.get('offlineReadings') || '[]')
    const offlineTags = JSON.parse(formData.get('offlineTags') || '[]')
    
    let syncedCount = 0
    
    // Sync offline readings
    for (const reading of offlineReadings) {
      if (reading.tempId) {
        // Remove temporary ID and insert
        delete reading.tempId
        reading.syncedAt = new Date()
        await db.collection('readings').insertOne(reading)
        syncedCount++
      }
    }
    
    // Sync offline tags
    for (const tag of offlineTags) {
      if (tag.tempId) {
        delete tag.tempId
        tag.syncedAt = new Date()
        await db.collection('tags').insertOne(tag)
        syncedCount++
      }
    }
    
    revalidatePath('/')
    return { 
      success: true, 
      message: `Synced ${syncedCount} items from offline storage`,
      syncedCount 
    }
  } catch (error) {
    console.error('Offline sync error:', error)
    return { error: 'Failed to sync offline data' }
  }
}

// Background sync for PWA
export async function scheduleBackgroundSyncAction(formData) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return { error: 'Authentication required' }
    }

    const syncType = formData.get('syncType') // 'readings', 'images', 'tags'
    const priority = formData.get('priority') || 'normal'
    
    const { db } = await connectToDatabase()
    
    // Schedule background sync job
    await db.collection('syncJobs').insertOne({
      type: syncType,
      priority,
      scheduledAt: new Date(),
      status: 'pending',
      userId: token // In real implementation, decode user ID
    })
    
    return { success: true, message: 'Background sync scheduled' }
  } catch (error) {
    console.error('Background sync scheduling error:', error)
    return { error: 'Failed to schedule background sync' }
  }
}