"use server"

import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '../mongo'
import { ObjectId } from 'mongodb'
import { put } from '@vercel/blob'
import { getUserFromToken, makeAuthenticatedAPICall } from './utils'

export async function saveReadingAction(formData) {
  try {
    const user = await getUserFromToken()
    
    const readingData = {
      date: formData.get('date'),
      querent: formData.get('querent'),
      spread: formData.get('spread'),
      deck: formData.get('deck'),
      question: formData.get('question'),
      cards: JSON.parse(formData.get('cards') || '[]'),
      interpretation: formData.get('interpretation'),
      outcome: formData.get('outcome')
    }
    
    // Handle image upload if present
    const imageFile = formData.get('image')
    if (imageFile && imageFile.size > 0) {
      const filename = `reading-${user._id}-${Date.now()}.${imageFile.type.split('/')[1]}`
      const blob = await put(filename, imageFile, {
        access: 'public',
        addRandomSuffix: true
      })
      readingData.image = blob.url
    }
    
    const readingId = formData.get('readingId')
    
    let response
    if (readingId) {
      // Update existing reading
      response = await makeAuthenticatedAPICall(`/api/readings/${readingId}`, {
        method: 'PUT',
        body: JSON.stringify(readingData)
      })
    } else {
      // Create new reading
      response = await makeAuthenticatedAPICall('/api/readings', {
        method: 'POST',
        body: JSON.stringify(readingData)
      })
    }
    
    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to save reading')
    }
    
    const result = await response.json()
    
    revalidatePath('/reading')
    return { 
      success: true, 
      readingId: result._id || readingId,
      message: readingId ? 'Reading updated' : 'Reading saved'
    }
  } catch (error) {
    console.error('Save reading error:', error)
    return { error: 'Failed to save reading' }
  }
}

export async function getReadingAction(readingId) {
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    
    const reading = await db.collection('readings').findOne({
      _id: new ObjectId(readingId),
      userId: user._id
    })
    
    if (!reading) {
      return { error: 'Reading not found' }
    }
    
    return { success: true, reading }
  } catch (error) {
    console.error('Get reading error:', error)
    return { error: 'Failed to load reading' }
  }
}

export async function deleteReadingAction(formData) {
  try {
    const user = await getUserFromToken()
    const readingId = formData.get('readingId')
    
    if (!readingId) {
      return { error: 'Reading ID is required' }
    }
    
    const { db } = await connectToDatabase()
    const result = await db.collection('readings').deleteOne({
      _id: new ObjectId(readingId),
      userId: user._id
    })
    
    if (result.deletedCount === 0) {
      return { error: 'Reading not found or not authorized' }
    }
    
    revalidatePath('/reading')
    return { success: true, message: 'Reading deleted' }
  } catch (error) {
    console.error('Delete reading error:', error)
    return { error: 'Failed to delete reading' }
  }
}

export async function createReadingAction(formData) {
  try {
    const user = await getUserFromToken()
    const readingData = JSON.parse(formData.get('readingData'))
    
    const { db } = await connectToDatabase()
    const reading = {
      ...readingData,
      userId: user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await db.collection('readings').insertOne(reading)
    reading._id = result.insertedId
    
    revalidatePath('/reading')
    return { success: true, reading }
  } catch (error) {
    console.error('Create reading error:', error)
    return { error: 'Failed to create reading' }
  }
}

export async function getUserReadingsAction() {
  try {
    const user = await getUserFromToken()
    
    const response = await makeAuthenticatedAPICall('/api/readings/user')
    
    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch readings')
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get user readings error:', error)
    return { error: error.message || 'Failed to fetch readings' }
  }
}

export async function getSingleReadingAction(readingId) {
  try {
    const user = await getUserFromToken()
    
    const response = await makeAuthenticatedAPICall(`/api/readings/${readingId}`)

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch reading')
    }

    const data = await response.json()
    const reading = data.reading || data
    return { success: true, data: reading }
  } catch (error) {
    console.error('Get single reading error:', error)
    return { error: error.message || 'Failed to fetch reading' }
  }
}

export async function updateReadingAction(readingId, updateData) {
  try {
    const user = await getUserFromToken()

    const response = await makeAuthenticatedAPICall(`/api/readings/${readingId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to update reading')
    }

    const result = await response.json()
    return { success: true, data: result }
  } catch (error) {
    console.error('Update reading error:', error)
    return { error: error.message || 'Failed to update reading' }
  }
}