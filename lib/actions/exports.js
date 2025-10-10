"use server"

import { getUserFromToken, makeAuthenticatedAPICall } from './utils'

export async function exportReadingPDFAction(readingData) {
  try {
    // Accept either a plain object or a FormData instance (some callers may
    // post a FormData with a `reading` JSON string and other fields). Normalize
    // to a plain object before validation and forwarding.
    let payload = readingData
    // Detect FormData (in server environment FormData may be present)
    if (typeof FormData !== 'undefined' && readingData instanceof FormData) {
      payload = {}
      for (const [k, v] of readingData.entries()) {
        if (k === 'reading' && typeof v === 'string') {
          try { payload.reading = JSON.parse(v) } catch (e) { payload.reading = v }
        } else {
          payload[k] = v
        }
      }
    } else if (readingData && typeof readingData === 'object' && typeof readingData.get === 'function') {
      // Some FormData-like objects (polyfills) expose .get/.entries
      try {
        const maybeReading = readingData.get('reading')
        if (maybeReading) {
          payload = {}
          for (const [k, v] of readingData.entries()) {
            if (k === 'reading' && typeof v === 'string') {
              try { payload.reading = JSON.parse(v) } catch (e) { payload.reading = v }
            } else {
              payload[k] = v
            }
          }
        }
      } catch (e) {
        // ignore and fall back to original readingData
      }
    }

    // Basic validation: ensure caller provided either `reading` object or raw `html` string
    if (!payload || (typeof payload !== 'object')) {
      throw new Error('Invalid export payload: expected an object with `reading` or `html`')
    }
    if (!payload.reading && !(payload.html && typeof payload.html === 'string')) {
      // Log locally so client-side diagnostics are easier to find in browser console
      console.error('exportReadingPDFAction called without `reading` or `html`:', readingData)
      throw new Error('Export payload missing `reading` object or `html` string')
    }

    const user = await getUserFromToken()

    const response = await makeAuthenticatedAPICall('/api/export/pdf', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to export PDF')
    }

    // Return the blob data for client-side download
    const blob = await response.arrayBuffer()
    // Quick sanity check: PDF files start with "%PDF-". If the response is not a PDF
    // (for example an HTML error page returned with 200), detect and fail fast with
    // a helpful diagnostic message rather than returning a corrupted PDF.
    try {
      const bytes = new Uint8Array(blob)
      // Accept any header starting with %PDF (e.g. %PDF-1.4) — check first 4 bytes
      const header = String.fromCharCode.apply(null, bytes.subarray(0, 5))
      if (!header.startsWith('%PDF')) {
        // Provide both a small text preview and a numeric byte preview for diagnostics
        let previewText = null
        try { previewText = new TextDecoder().decode(bytes.subarray(0, 1024)) } catch (e) { previewText = '<unable to decode preview>' }
        const bytePreview = Array.prototype.slice.call(bytes.subarray(0, 120))
        console.error('Export PDF: response did not contain a PDF. Text preview:', previewText)
        console.error('Export PDF: response first bytes preview:', JSON.stringify(bytePreview).slice(0,2000))
        throw new Error('Server did not return a valid PDF document')
      }
    } catch (err) {
      // If anything goes wrong with the check, surface the diagnostic
      console.error('Export PDF validation error:', err)
      throw err
    }
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