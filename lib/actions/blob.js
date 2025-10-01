"use server"

import { getUserFromToken, makeAuthenticatedAPICall } from './utils'

export async function uploadBlobAction(formData) {
  try {
    // Extract the readingId from formData to construct the correct endpoint
    const readingId = formData.get('readingId')
    if (!readingId) {
      throw new Error('Reading ID is required for blob upload')
    }
    
    // Check if image file is present
    const imageFile = formData.get('image')
    if (!imageFile || imageFile.size === 0) {
      throw new Error('No image file found in form data')
    }
    
    console.log('🔵 uploadBlobAction: Starting blob upload', {
      readingId,
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type
    })
    
    // Call backend API directly since the blob upload route doesn't require auth
    const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'https://mytarotreadingsserver.vercel.app'
    const url = `${apiBaseUrl}/api/readings/${readingId}/blob/upload`
    console.log('🔵 uploadBlobAction: Using direct backend URL:', url)
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'MyTarotReadings-BlobUpload/1.0'
        // Let fetch set Content-Type with boundary for FormData
      }
    })
    console.log('🔵 uploadBlobAction: Direct backend response', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('🔴 Backend blob upload failed:', errorData)
      throw new Error(errorData || 'Failed to upload blob')
    }

    const data = await response.json()
    console.log('🟢 uploadBlobAction: Blob upload successful:', { url: data.url || data.image })
    return { success: true, ...data }
  } catch (error) {
    console.error('🔴 Upload blob error:', error)
    return { error: error.message || 'Failed to upload blob' }
  }
}

// Separate action for uploading reading images that updates the reading record
export async function uploadReadingImageAction(readingId, imageFile) {
  try {
    console.log('🔵 uploadReadingImageAction: Starting image upload for reading:', readingId)
    
    const formData = new FormData()
    formData.append('image', imageFile)
    formData.append('readingId', readingId)
    
    // Call the blob upload action
    const uploadResult = await uploadBlobAction(formData)
    
    if (uploadResult.success && uploadResult.url) {
      console.log('🟢 uploadReadingImageAction: Image uploaded successfully:', uploadResult.url)
      return { success: true, imageUrl: uploadResult.url }
    } else {
      throw new Error(uploadResult.error || 'Upload failed')
    }
  } catch (error) {
    console.error('🔴 uploadReadingImageAction error:', error)
    return { error: error.message || 'Failed to upload reading image' }
  }
}

// Image retrieval actions for the image service
export async function getCardImageAction(formData) {
  try {
    const user = await getUserFromToken()
    const cardId = formData.get('cardId')
    
    if (!cardId) {
      return { error: 'Card ID is required' }
    }

    const response = await makeAuthenticatedAPICall(`/api/images/card/${cardId}`)

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch card image')
    }

    const data = await response.json()
    return { success: true, ...data }
  } catch (error) {
    console.error('Get card image error:', error)
    return { error: error.message || 'Failed to fetch card image' }
  }
}

export async function getDeckImageAction(formData) {
  try {
    const user = await getUserFromToken()
    const deckId = formData.get('deckId')
    
    if (!deckId) {
      return { error: 'Deck ID is required' }
    }

    const response = await makeAuthenticatedAPICall(`/api/images/deck/${deckId}`)

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch deck image')
    }

    const data = await response.json()
    return { success: true, ...data }
  } catch (error) {
    console.error('Get deck image error:', error)
    return { error: error.message || 'Failed to fetch deck image' }
  }
}

export async function getReadingImageAction(formData) {
  try {
    const user = await getUserFromToken()
    const readingId = formData.get('readingId')
    
    if (!readingId) {
      return { error: 'Reading ID is required' }
    }

    const response = await makeAuthenticatedAPICall(`/api/images/reading/${readingId}`)

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch reading image')
    }

    const data = await response.json()
    return { success: true, ...data }
  } catch (error) {
    console.error('Get reading image error:', error)
    return { error: error.message || 'Failed to fetch reading image' }
  }
}

export async function getQuerentImageAction(formData) {
  try {
    const user = await getUserFromToken()
    const querentId = formData.get('querentId')
    
    if (!querentId) {
      return { error: 'Querent ID is required' }
    }

    const response = await makeAuthenticatedAPICall(`/api/images/querent/${querentId}`)

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch querent image')
    }

    const data = await response.json()
    return { success: true, ...data }
  } catch (error) {
    console.error('Get querent image error:', error)
    return { error: error.message || 'Failed to fetch querent image' }
  }
}