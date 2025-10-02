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
    // Add cache-busting timestamp to prevent cached CORS failures
    const cacheBuster = Date.now()
    const url = `${apiBaseUrl}/api/readings/${readingId}/blob/upload?t=${cacheBuster}`
    
    console.log('🔵 uploadImageToBlob: Configuration', {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      apiBaseUrl,
      finalUrl: url
    })
    
    // Get auth token from localStorage (client-side)
    let headers = {
      'User-Agent': 'MyTarotReadings-ClientUpload/1.0'
    }
    
    // Try to get token from cookie or localStorage
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1] || localStorage.getItem('token')
    
    console.log('🔵 uploadImageToBlob: Auth token', {
      hasCookieToken: document.cookie.includes('token='),
      hasLocalStorageToken: !!localStorage.getItem('token'),
      tokenPresent: !!token,
      tokenLength: token?.length || 0
    })
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    } else {
      console.warn('🟡 uploadImageToBlob: No auth token found, proceeding without authentication')
    }
    
    console.log('🔵 uploadImageToBlob: Making request with headers', {
      url,
      headers: { ...headers, Authorization: headers.Authorization ? 'Bearer [REDACTED]' : undefined },
      hasFormData: formData instanceof FormData,
      formDataKeys: Array.from(formData.keys())
    })
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        ...headers,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      credentials: 'include', // Include cookies for CORS
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