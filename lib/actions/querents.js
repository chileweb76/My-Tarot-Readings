"use server"

import { getUserFromToken, makeAuthenticatedAPICall } from './utils'

export async function getQuerentsAction() {
  try {
    const user = await getUserFromToken()

    const response = await makeAuthenticatedAPICall('/api/querents')

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch querents')
    }

    const data = await response.json()
    // Backend returns { querents: [...] }
    const querents = data.querents || data.data || []
    return { success: true, querents }
  } catch (error) {
    console.error('Get querents error:', error)
    return { error: error.message || 'Failed to fetch querents' }
  }
}

export async function createQuerentAction(formData) {
  try {
    const user = await getUserFromToken()
    const name = formData.get('name')

    if (!name || !name.trim()) {
      return { error: 'Querent name is required' }
    }

    const response = await makeAuthenticatedAPICall('/api/querents', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim() }),
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to create querent')
    }

    const data = await response.json()
    return { success: true, querent: data }
  } catch (error) {
    console.error('Create querent error:', error)
    return { error: error.message || 'Failed to create querent' }
  }
}

export async function deleteQuerentAction(formData) {
  try {
    const user = await getUserFromToken()
    const querentId = formData.get('querentId')

    if (!querentId) {
      return { error: 'Querent ID is required' }
    }

    const response = await makeAuthenticatedAPICall(`/api/querents/${querentId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to delete querent')
    }

    return { success: true, message: 'Querent deleted successfully' }
  } catch (error) {
    console.error('Delete querent error:', error)
    return { error: error.message || 'Failed to delete querent' }
  }
}