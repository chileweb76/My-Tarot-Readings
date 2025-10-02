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
      dateTime: formData.get('date') || new Date().toISOString(),
      querent: formData.get('querent'),
      spread: formData.get('spread'),
      deck: formData.get('deck'),
      question: formData.get('question'),
      drawnCards: JSON.parse(formData.get('cards') || '[]'),
      interpretation: formData.get('interpretation'),
      outcome: formData.get('outcome'),
      selectedTags: JSON.parse(formData.get('tags') || '[]'),
      image: formData.get('imageUrl') || null // Add image URL from blob upload
    }
    
    console.log('🔵 saveReadingAction: Reading data prepared', {
      hasSelectedTags: !!readingData.selectedTags,
      selectedTagsCount: readingData.selectedTags?.length || 0,
      selectedTags: readingData.selectedTags
    })
    
    // Skip image upload in Server Action (handle separately to avoid large file issues)
    const imageFile = formData.get('image')
    console.log('🔵 saveReadingAction: Image file check', {
      hasImageFile: !!imageFile,
      fileSize: imageFile?.size,
      fileType: imageFile?.type
    })
    
    // Don't include image in reading data for now - will be handled separately
    // This prevents Server Action timeouts with large files
    
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
    
    console.log('🔵 saveReadingAction: API response result', {
      resultKeys: Object.keys(result),
      resultId: result._id,
      resultReadingId: result.reading?._id,
      fullResult: result
    })
    
    revalidatePath('/reading')
    
    // Extract reading ID based on response format
    // Backend POST returns: { success: true, reading: { _id: "..." } }
    // Backend PUT returns: { success: true, reading: { _id: "..." } }
    const extractedReadingId = result.reading?._id || result._id || readingId
    
    console.log('🔵 saveReadingAction: Extracted reading ID:', extractedReadingId)
    
    return { 
      success: true, 
      readingId: extractedReadingId,
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
    console.log('🔵 createReadingAction: Starting reading creation')
    
    // Try to get user for validation, but don't fail if token issues exist
    let user = null
    try {
      user = await getUserFromToken()
      console.log('🔵 createReadingAction: Got user:', user?._id)
    } catch (tokenError) {
      console.warn('🟡 createReadingAction: Token validation failed, proceeding with API call:', tokenError.message)
    }
    
    const readingData = JSON.parse(formData.get('readingData'))
    console.log('🔵 createReadingAction: Parsed reading data:', {
      hasSelectedTags: !!readingData.selectedTags,
      selectedTagsLength: Array.isArray(readingData.selectedTags) ? readingData.selectedTags.length : 0,
      selectedTags: readingData.selectedTags
    })
    
    // Use the backend API to create the reading with proper authentication
    const response = await makeAuthenticatedAPICall('/api/readings', {
      method: 'POST',
      body: JSON.stringify(readingData)
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('🔴 createReadingAction: Backend API error:', errorData)
      throw new Error(errorData || 'Failed to create reading')
    }

    const result = await response.json()
    console.log('🟢 createReadingAction: Reading created successfully:', result._id || result.reading?._id)
    
    revalidatePath('/reading')
    return { success: true, reading: result.reading || result }
  } catch (error) {
    console.error('🔴 createReadingAction error:', error)
    return { error: 'Failed to create reading: ' + error.message }
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