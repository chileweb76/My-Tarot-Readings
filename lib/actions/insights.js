"use server"

import { getUserFromToken, makeAuthenticatedAPICall } from './utils'

export async function getInsightsCountAction(params) {
  try {
    const user = await getUserFromToken()
    
    const queryString = new URLSearchParams(params).toString()

    const response = await makeAuthenticatedAPICall(`/api/insights/count?${queryString}`)

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch insights count')
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get insights count error:', error)
    return { error: error.message || 'Failed to fetch insights count' }
  }
}

export async function getInsightsSuitsAction(params) {
  try {
    const user = await getUserFromToken()
    
    const queryString = new URLSearchParams(params).toString()

    const response = await makeAuthenticatedAPICall(`/api/insights/suits?${queryString}`)

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch insights suits')
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get insights suits error:', error)
    return { error: error.message || 'Failed to fetch insights suits' }
  }
}

export async function getInsightsCardsAction(params) {
  try {
    const user = await getUserFromToken()
    
    const queryString = new URLSearchParams(params).toString()

    const response = await makeAuthenticatedAPICall(`/api/insights/cards?${queryString}`)

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch insights cards')
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get insights cards error:', error)
    return { error: error.message || 'Failed to fetch insights cards' }
  }
}