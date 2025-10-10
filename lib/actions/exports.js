"use server"

import { getUserFromToken, makeAuthenticatedAPICall } from './utils'

export async function exportReadingPDFAction(readingData) {
  try {
    // Basic validation: ensure caller provided either `reading` object or raw `html` string
    if (!readingData || (typeof readingData !== 'object')) {
      throw new Error('Invalid export payload: expected an object with `reading` or `html`')
    }
    if (!readingData.reading && !(readingData.html && typeof readingData.html === 'string')) {
      // Log locally so client-side diagnostics are easier to find in browser console
      console.error('exportReadingPDFAction called without `reading` or `html`:', readingData)
      throw new Error('Export payload missing `reading` object or `html` string')
    }

    const user = await getUserFromToken()

    const response = await makeAuthenticatedAPICall('/api/export/pdf', {
      method: 'POST',
      body: JSON.stringify(readingData)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to export PDF')
    }

    // Return the blob data for client-side download
    const blob = await response.arrayBuffer()
    return { 
      success: true, 
      data: {
        blob: Buffer.from(blob).toString('base64'),
        contentType: response.headers.get('content-type') || 'application/pdf'
      }
    }
  } catch (error) {
    console.error('Export PDF error:', error)
    return { error: error.message || 'Failed to export PDF' }
  }
}

export async function testConnectionAction() {
  try {
    const user = await getUserFromToken()

    const response = await makeAuthenticatedAPICall('/api/test-conn')

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Connection test failed')
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Test connection error:', error)
    return { error: error.message || 'Connection test failed' }
  }
}

// Alias for backward compatibility
export const exportPdfAction = exportReadingPDFAction