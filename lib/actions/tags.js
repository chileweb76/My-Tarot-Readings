"use server"

import { getUserFromToken, makeAuthenticatedAPICall } from './utils'

export async function getTagsAction() {
  try {
    console.log('🔵 getTagsAction: Fetching tags')
    
    // Try authenticated call first, fall back to unauthenticated if auth fails
    let response
    try {
      const user = await getUserFromToken()
      response = await makeAuthenticatedAPICall('/api/tags')
      console.log('🔵 getTagsAction: Using authenticated call')
    } catch (authError) {
      console.log('🟡 getTagsAction: Auth failed, trying unauthenticated call:', authError.message)
      // Fall back to direct API call without authentication
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : (process.env.CLIENT_URL || 'http://localhost:3000')
      
      const url = `${baseUrl}/api/tags`
      console.log('🟡 getTagsAction: Using fallback URL:', url)
      
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
    }

    if (!response.ok) {
      const errorData = await response.text()
      console.error('🔴 getTagsAction: API error:', errorData)
      throw new Error(errorData || 'Failed to fetch tags')
    }

    const data = await response.json()
    console.log('🔵 getTagsAction: Raw response:', data)
    // Backend returns { ok: true, tags: [...] }
    const tags = data.tags || data.data || []
    console.log('🟢 getTagsAction: Successfully fetched tags:', tags.length)
    return { success: true, tags }
  } catch (error) {
    console.error('🔴 Get tags error:', error)
    return { error: error.message || 'Failed to fetch tags' }
  }
}

export async function createTagAction(formData) {
  try {
    const user = await getUserFromToken()
    const name = formData.get('name')

    if (!name || !name.trim()) {
      return { error: 'Tag name is required' }
    }

    const response = await makeAuthenticatedAPICall('/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim() }),
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to create tag')
    }

    const data = await response.json()
    return { success: true, tag: data }
  } catch (error) {
    console.error('Create tag error:', error)
    return { error: error.message || 'Failed to create tag' }
  }
}

export async function deleteTagAction(formData) {
  try {
    const user = await getUserFromToken()
    const tagId = formData.get('tagId')

    if (!tagId) {
      return { error: 'Tag ID is required' }
    }

    const response = await makeAuthenticatedAPICall(`/api/tags/${tagId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to delete tag')
    }

    return { success: true, message: 'Tag deleted successfully' }
  } catch (error) {
    console.error('Delete tag error:', error)
    return { error: error.message || 'Failed to delete tag' }
  }
}