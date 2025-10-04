"use server"

import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '../mongo'
import { ObjectId } from 'mongodb'
import { getUserFromToken, makeAuthenticatedAPICall } from './utils'

export async function getDecksAction() {
  try {
    // Try to get current user first to determine if we should use authenticated endpoint
    let user = null
    let authError = null
    
    try {
      const authResult = await getCurrentUserAction()
      if (authResult.success) {
        user = authResult.user
      } else {
        authError = authResult.error
      }
    } catch (err) {
      authError = err
    }

    // Use the appropriate endpoint based on authentication
    let url
    if (user) {
      // Use Next.js API route (server-side with cookies)
      url = '/api/decks'
    } else {
      // Direct backend call (no auth, global decks only)
      const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'https://mytarotreadingsserver.vercel.app'
      url = `${apiBaseUrl}/api/decks/global`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: user ? 'include' : 'omit'
    })

    if (!response.ok) {
      const errorData = await response.text()
      return { success: false, error: `Failed to fetch decks: ${response.status}` }
    }

    const data = await response.json()
    const rawDecks = data.decks || data || []

    // Normalize the deck data
    const decks = rawDecks.map(deck => ({
      _id: String(deck._id || ''),
      deckName: deck.deckName || deck.name || 'Unknown Deck',
      image: deck.image || null,
      owner: String(deck.owner || ''),
      isGlobal: !deck.owner || deck.owner === 'global' || deck.isGlobal === true
    }))

    return { success: true, decks }
  } catch (error) {
    return { success: false, error: error.message }
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
    // Normalize single deck object
    const deck = {
      ...data,
      _id: data._id?.toString ? data._id.toString() : data._id,
      createdAt: data.createdAt ? (new Date(data.createdAt)).toISOString() : undefined,
      updatedAt: data.updatedAt ? (new Date(data.updatedAt)).toISOString() : undefined
    }
    return { success: true, deck }
  } catch (error) {
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
    return { error: error.message || 'Failed to upload card image' }
  }
}