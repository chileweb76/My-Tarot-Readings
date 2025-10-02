// Client-side blob upload utilities
// These functions run in the browser, avoiding Server Action conflicts

/**
 * Upload an image file to Vercel Blob and associate it with a reading
 * @param {string} readingId - The reading ID to associate the image with
 * @param {File} imageFile - The image file to upload
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function uploadImageToBlob(readingId, imageFile) {
  try {
    console.log('🔵 uploadImageToBlob: Starting client-side upload', {
      readingId,
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type
    })
    
    if (!readingId) {
      throw new Error('Reading ID is required for blob upload')
    }
    
    if (!imageFile || imageFile.size === 0) {
      throw new Error('No image file provided')
    }
    
    // Create FormData for the upload
    const formData = new FormData()
    formData.append('image', imageFile)
    
    // Get API base URL (client-side)
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mytarotreadingsserver.vercel.app'
    // Ultra-aggressive cache-busting with multiple random components
    const cacheBuster = `${Date.now()}-${Math.random()}-${performance.now()}`
    
    // Try the FINAL endpoint with completely different naming and ultra-aggressive CORS headers
    const finalUrl = `${apiBaseUrl}/api/blob-upload-edge?readingId=${readingId}&t=${cacheBuster}&rand=${Math.random()}`
    
    console.log('� uploadImageToBlob: Using FINAL endpoint with ultra cache-busting:', finalUrl)
    
    // Skip CORS test and go straight to the final endpoint
    console.log('� uploadImageToBlob: Skipping tests, going straight to FINAL endpoint')
    
    // Use the FINAL endpoint with completely different naming
    const url = finalUrl
    
    console.log('� uploadImageToBlob: FINAL Configuration', {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      apiBaseUrl,
      finalUrl: url,
      cacheBuster
    })
    
    // Prepare FormData with 'file' field name (not 'image')
    const finalFormData = new FormData()
    finalFormData.append('file', imageFile) // Change from 'image' to 'file'
    
    // Minimal headers for maximum compatibility - no auth for now to avoid complications
    let headers = {
      'x-reading-id': readingId,
      // Don't set Content-Type - let browser set it with boundary for multipart
    }
    
    console.log('� uploadImageToBlob: Making FINAL request', {
      url,
      headers: { ...headers, Authorization: headers.Authorization ? 'Bearer [REDACTED]' : undefined },
      hasFormData: formData instanceof FormData,
      formDataKeys: Array.from(formData.keys())
    })
    
    const response = await fetch(url, {
      method: 'POST',
      body: finalFormData,
      headers: {
        ...headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache, no-store',
        'Expires': '0'
      },
      credentials: 'include', // Must match Access-Control-Allow-Credentials: true
      mode: 'cors', // Explicitly set CORS mode
      cache: 'no-store' // Prevent caching of the request
    })
    
    console.log('🔵 uploadImageToBlob: Response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: url,
      type: response.type,
      redirected: response.redirected,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.text()
      } catch (e) {
        errorData = `HTTP ${response.status} ${response.statusText}`
      }
      console.error('🔴 Client blob upload failed:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        url
      })
      throw new Error(`Upload failed (${response.status}): ${errorData || response.statusText}`)
    }

    const data = await response.json()
    console.log('🟢 uploadImageToBlob: Upload successful:', { 
      url: data.url || data.image,
      success: data.success 
    })
    
    return { 
      success: true, 
      url: data.url || data.image,
      ...data 
    }
  } catch (error) {
    console.error('🔴 uploadImageToBlob error:', error)
    return { 
      success: false,
      error: error.message || 'Failed to upload image' 
    }
  }
}

/**
 * Check if the client-side environment is ready for blob uploads
 * @returns {boolean}
 */
export function isBlobUploadReady() {
  return typeof window !== 'undefined' && typeof FormData !== 'undefined'
}

export default { uploadImageToBlob, isBlobUploadReady }