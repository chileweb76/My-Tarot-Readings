"use server"

import { getUserFromToken, makeAuthenticatedAPICall } from './utils'

export async function createSpreadAction(spreadData) {
  try {
    const user = await getUserFromToken()

    const response = await makeAuthenticatedAPICall('/api/spreads', {
      method: 'POST',
      body: JSON.stringify(spreadData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to create spread')
    }

    const result = await response.json()
    return { success: true, data: result }
  } catch (error) {
    console.error('Create spread error:', error)
    return { error: error.message || 'Failed to create spread' }
  }
}

export async function uploadSpreadBlobAction(formData) {
  try {
    const user = await getUserFromToken()
    
    // Extract spreadId from formData
    const spreadId = formData.get('spreadId')
    if (!spreadId) {
      throw new Error('Spread ID is required')
    }

    const response = await makeAuthenticatedAPICall(`/api/spreads/${spreadId}/blob/upload`, {
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
    console.error('Upload spread blob error:', error)
    return { error: error.message || 'Failed to upload spread image' }
  }
}

export async function getSpreadsAction() {
  try {
    console.log('🔵 getSpreadsAction: Fetching spreads via frontend API proxy')
    
    // Use frontend API proxy instead of calling backend directly
    const response = await fetch('/api/spreads', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!response.ok) {
      const errorData = await response.text()
      console.error('🔴 getSpreadsAction: Frontend API proxy error:', errorData)
      throw new Error(errorData || 'Failed to fetch spreads')
    }

    const data = await response.json()
    console.log('🟢 getSpreadsAction: Successfully fetched spreads:', data?.length || 'unknown count')
    return { success: true, data }
  } catch (error) {
    console.error('Get spreads error:', error)
    return { error: error.message || 'Failed to fetch spreads' }
  }
}

export async function deleteSpreadAction(formData) {
  try {
    const user = await getUserFromToken()
    const spreadId = formData.get('spreadId')

    if (!spreadId) {
      return { error: 'Spread ID is required' }
    }

    const response = await makeAuthenticatedAPICall(`/spreads/${spreadId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to delete spread')
    }

    return { success: true, message: 'Spread deleted successfully' }
  } catch (error) {
    console.error('Delete spread error:', error)
    return { error: error.message || 'Failed to delete spread' }
  }
}