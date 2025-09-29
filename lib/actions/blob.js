"use server"

import { getUserFromToken, makeAuthenticatedAPICall } from './utils'

export async function uploadBlobAction(formData) {
  try {
    const user = await getUserFromToken()
    
    const response = await makeAuthenticatedAPICall('/api/blob-upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to upload blob')
    }

    const data = await response.json()
    return { success: true, ...data }
  } catch (error) {
    console.error('Upload blob error:', error)
    return { error: error.message || 'Failed to upload blob' }
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