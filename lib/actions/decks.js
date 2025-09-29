"use server"

import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '../mongo'
import { ObjectId } from 'mongodb'
import { getUserFromToken, makeAuthenticatedAPICall } from './utils'

export async function getDecksAction() {
  try {
    const user = await getUserFromToken()
    
    const response = await makeAuthenticatedAPICall('/api/decks')
    
    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch decks')
    }

    const data = await response.json()
    const decks = Array.isArray(data) ? data : (data.decks || [])
    return { success: true, decks: decks }
  } catch (error) {
    console.error('Get decks error:', error)
    return { error: error.message || 'Failed to fetch decks' }
  }
}

export async function getSingleDeckAction(deckId) {
  try {
    const user = await getUserFromToken()
    
    const response = await makeAuthenticatedAPICall(`/api/decks/${deckId}`)

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch deck')
    }

    const data = await response.json()
    return { success: true, deck: data }
  } catch (error) {
    console.error('Get single deck error:', error)
    return { error: error.message || 'Failed to fetch deck' }
  }
}

export async function createDeckAction(formData) {
  try {
    const user = await getUserFromToken()
    const deckName = formData.get('deckName')
    const description = formData.get('description')
    
    if (!deckName || !deckName.trim()) {
      return { error: 'Deck name is required' }
    }

    const response = await makeAuthenticatedAPICall('/api/decks', {
      method: 'POST',
      body: JSON.stringify({ 
        deckName: deckName.trim(), 
        description: description || '', 
        cards: [] 
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to create deck')
    }

    const result = await response.json()
    revalidatePath('/decks')
    return { success: true, data: result }
  } catch (error) {
    console.error('Create deck error:', error)
    return { error: error.message || 'Failed to create deck' }
  }
}

export async function deleteDeckAction(formData) {
  try {
    const user = await getUserFromToken()
    const deckId = formData.get('deckId')
    
    if (!deckId) {
      return { error: 'Deck ID is required' }
    }
    
    const { db } = await connectToDatabase()
    const result = await db.collection('decks').deleteOne({
      _id: new ObjectId(deckId),
      owner: user._id
    })
    
    if (result.deletedCount === 0) {
      return { error: 'Deck not found or not authorized' }
    }
    
    revalidatePath('/decks')
    return { success: true, message: 'Deck deleted successfully' }
  } catch (error) {
    console.error('Delete deck error:', error)
    return { error: 'Failed to delete deck' }
  }
}

export async function uploadDeckBlobAction(formData) {
  try {
    const user = await getUserFromToken()
    
    // Extract deckId from formData
    const deckId = formData.get('deckId')
    if (!deckId) {
      throw new Error('Deck ID is required')
    }

    const response = await makeAuthenticatedAPICall(`/api/decks/${deckId}/blob/upload`, {
      method: 'POST',
      headers: {
        'X-Vercel-Blob-Store': 'true'
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Upload failed')
    }
    
    const result = await response.json()
    return { success: true, data: result }
  } catch (error) {
    console.error('Upload deck blob error:', error)
    return { error: error.message || 'Failed to upload deck image' }
  }
}

export async function uploadCardBlobAction(formData) {
  try {
    const user = await getUserFromToken()
    
    // Extract parameters from formData
    const deckId = formData.get('deckId')
    const cardName = formData.get('cardName')
    
    if (!deckId || !cardName) {
      throw new Error('Deck ID and card name are required')
    }

    const response = await makeAuthenticatedAPICall(`/api/decks/${deckId}/card/${encodeURIComponent(cardName)}/blob/upload`, {
      method: 'POST',
      headers: {
        'X-Vercel-Blob-Store': 'true'
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Upload failed')
    }
    
    const result = await response.json()
    return { success: true, data: result }
  } catch (error) {
    console.error('Upload card blob error:', error)
    return { error: error.message || 'Failed to upload card image' }
  }
}