"use server"

// Simple test to verify blob upload endpoint is working
export async function testBlobUploadAction(readingId) {
  try {
    console.log('🔵 testBlobUploadAction: Testing blob endpoint for reading:', readingId)
    
    // Create a simple test image (1x1 pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    const buffer = Buffer.from(testImageBase64, 'base64')
    
    // Create FormData with test image
    const formData = new FormData()
    const blob = new Blob([buffer], { type: 'image/png' })
    formData.append('image', blob, 'test.png')
    
    let apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'https://mytarotreadingsserver.vercel.app'
    
    // Ensure apiBaseUrl is defined
    if (!apiBaseUrl || typeof apiBaseUrl !== 'string') {
      apiBaseUrl = 'https://mytarotreadingsserver.vercel.app'
    }
    
    const url = `${apiBaseUrl}/api/readings/${readingId}/blob/upload`
    console.log('🔵 testBlobUploadAction: Testing URL:', url)
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'MyTarotReadings-BlobTest/1.0'
      }
    })
    
    console.log('🔵 testBlobUploadAction: Response', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('🔴 testBlobUploadAction: Error response:', errorText)
      throw new Error(`Test blob upload failed: ${response.status} ${errorText}`)
    }
    
    const result = await response.json()
    console.log('🟢 testBlobUploadAction: Success:', result)
    
    return { success: true, result }
  } catch (error) {
    console.error('🔴 testBlobUploadAction error:', error)
    return { success: false, error: error.message }
  }
}