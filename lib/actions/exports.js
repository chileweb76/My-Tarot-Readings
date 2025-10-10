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
    let blob = await response.arrayBuffer()
    // Quick sanity check: PDF files start with "%PDF". If the response is not a PDF
    // (for example an HTML error page returned with 200), detect and fail fast with
    // a helpful diagnostic message rather than returning a corrupted PDF.
    try {
      let bytes = new Uint8Array(blob)
      // Accept any header starting with %PDF (e.g. %PDF-1.4) — check first 4 bytes
      let header = String.fromCharCode.apply(null, bytes.subarray(0, 5))

      // Fallback: sometimes serverless wrappers serialize Buffer to JSON. Detect
      // when the response body is actually JSON representing a Buffer and reconstruct.
      if (!header.startsWith('%PDF')) {
        // Try to decode the entire payload as UTF-8 text and parse JSON
        let decodedText = null
        try { decodedText = new TextDecoder().decode(bytes) } catch (e) { decodedText = null }

        if (decodedText && decodedText.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(decodedText)
            let reconstructed = null

            // Handle Buffer.toJSON() shape: { type: 'Buffer', data: [ ... ] }
            if (parsed && parsed.type === 'Buffer' && Array.isArray(parsed.data)) {
              reconstructed = new Uint8Array(parsed.data)
            } else if (parsed && typeof parsed === 'object') {
              // Handle object with numeric keys: { '0': 37, '1': 80, ... }
              const keys = Object.keys(parsed)
              const numericKeys = keys.filter(k => String(Number(k)) === k)
              if (numericKeys.length > 0) {
                const maxIndex = Math.max(...numericKeys.map(k => Number(k)))
                const arr = new Uint8Array(maxIndex + 1)
                for (const k of numericKeys) {
                  arr[Number(k)] = Number(parsed[k]) & 0xFF
                }
                reconstructed = arr
              }
            }

            if (reconstructed) {
              bytes = reconstructed
              blob = bytes.buffer
              header = String.fromCharCode.apply(null, bytes.subarray(0, 5))
              console.log('Export PDF: reconstructed binary from JSON response')
            }
          } catch (parseErr) {
            // JSON.parse sometimes fails with a RangeError for very large inputs in certain runtimes.
            // Fall back to a non-recursive numeric extraction using a regex to pull byte values.
            try {
              console.warn('Export PDF: JSON.parse failed, falling back to numeric-extract method', parseErr && parseErr.message ? parseErr.message : parseErr)
              const nums = decodedText.match(/\d{1,3}/g)
              if (nums && nums.length) {
                const arr = new Uint8Array(nums.length)
                for (let i = 0; i < nums.length; i++) arr[i] = Number(nums[i]) & 0xFF
                bytes = arr
                blob = bytes.buffer
                header = String.fromCharCode.apply(null, bytes.subarray(0, 5))
                console.log('Export PDF: reconstructed binary from numeric regex fallback')
              }
            } catch (numErr) {
              console.warn('Export PDF: numeric-extract fallback failed', numErr)
            }
          }
        }
      }

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