// Client-side blob upload utilities    console.log('🚀 uploadImageToBlob: Using same-domain PROXY (no CORS issues):', finalUrl)// These functions run in the browser, avoiding Server Action conflicts

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
    formData.append('file', imageFile)  // Changed from 'image' to 'file' to match backend
    
    // Use same-domain proxy to avoid CORS issues completely
    const cacheBuster = Date.now()
    
    // Use the proxy API route on the same domain (no CORS issues)
    const finalUrl = `/api/upload-proxy?readingId=${readingId}&t=${cacheBuster}`
    
    console.log('� uploadImageToBlob: Using FINAL endpoint with ultra cache-busting:', finalUrl)
    
    // Skip CORS test and go straight to the final endpoint
    console.log('� uploadImageToBlob: Skipping tests, going straight to FINAL endpoint')
    
    // Use the FINAL endpoint with completely different naming
    const url = finalUrl
    
    console.log('� uploadImageToBlob: FINAL Configuration', {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      finalUrl: url,
      cacheBuster
    })
    
    // Prepare FormData with 'file' field name (not 'image')
    const finalFormData = new FormData()
    finalFormData.append('file', imageFile) // Change from 'image' to 'file'
    
    // Minimal headers for maximum compatibility
    let headers = {
      'x-reading-id': readingId
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
      headers: headers,
      credentials: 'same-origin', // Same domain, no CORS needed
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