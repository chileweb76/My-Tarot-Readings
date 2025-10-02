"use server"

import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '../mongo'
import { ObjectId } from 'mongodb'
import { getUserFromToken, makeAuthenticatedAPICall } from './utils'

export async function getDecksAction() {
  try {
    console.log('🔵 getDecksAction: Fetching decks')
    
    // Try authenticated call first, fall back to unauthenticated if auth fails
    let response
    try {
      const user = await getUserFromToken()
      response = await makeAuthenticatedAPICall('/api/decks')
      console.log('🔵 getDecksAction: Using authenticated call')
    } catch (authError) {
      console.log('🟡 getDecksAction: Auth failed, trying direct backend call:', authError.message)
      // Fall back to direct backend call without authentication
      let apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'https://mytarotreadingsserver.vercel.app'
      
      // Ensure apiBaseUrl is defined
      if (!apiBaseUrl || typeof apiBaseUrl !== 'string') {
        apiBaseUrl = 'https://mytarotreadingsserver.vercel.app'
      }
      
      const url = `${apiBaseUrl}/api/decks`
      console.log('🟡 getDecksAction: Using direct backend URL:', url)
      
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MyTarotReadings-ServerAction/1.0'
        }
      })
    }
    
    if (!response.ok) {
      const errorData = await response.text()
      console.error('🔴 getDecksAction: API error:', errorData)
      throw new Error(errorData || 'Failed to fetch decks')
    }

    const data = await response.json()
    console.log('🔵 getDecksAction: Raw backend response:', data)
    const rawDecks = Array.isArray(data) ? data : (data.decks || [])
    // Convert MongoDB documents to plain serializable objects
    const decks = rawDecks.map(d => ({
      ...d,
      _id: d._id?.toString ? d._id.toString() : d._id,
      createdAt: d.createdAt ? (new Date(d.createdAt)).toISOString() : undefined,
      updatedAt: d.updatedAt ? (new Date(d.updatedAt)).toISOString() : undefined
    }))
    console.log('🟢 getDecksAction: Successfully processed decks:', decks.length)
    return { success: true, decks }
  } catch (error) {
    console.error('🔴 Get decks error:', error)
    return { error: error.message || 'Failed to fetch decks' }
  }
}

export async function getSingleDeckAction(deckId) {
  try {
    const user = await getUserFromToken()
    
    console.log('getSingleDeckAction: Fetching deck with ID:', deckId)
    console.log('getSingleDeckAction: ID type and length:', typeof deckId, deckId?.length)
    console.log('getSingleDeckAction: Full URL will be:', `/api/decks/${deckId}`)
    
    const response = await makeAuthenticatedAPICall(`/api/decks/${deckId}`)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('getSingleDeckAction: Response not OK')
      console.error('getSingleDeckAction: Status:', response.status)
      console.error('getSingleDeckAction: Status Text:', response.statusText)
      console.error('getSingleDeckAction: Error Data:', errorData)
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
    console.log('getSingleDeckAction: SUCCESS! Received data:', deck)
    return { success: true, deck }
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