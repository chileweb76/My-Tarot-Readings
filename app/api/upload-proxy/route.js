// Proxy API route to handle blob uploads without CORS issues
// This runs on the same domain as the frontend, eliminating CORS problems

import { put } from '@vercel/blob'

export async function POST(request) {
  try {
    // Set CORS headers for any preflight requests
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-reading-id',
    }

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers })
    }

    console.log('🔵 [Upload Proxy] Processing upload request')
    
    // Get reading ID from query params or headers
    const url = new URL(request.url)
    const readingId = url.searchParams.get('readingId') || request.headers.get('x-reading-id')
    
    if (!readingId) {
      return new Response(JSON.stringify({ error: 'Reading ID required' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' }
      })
    }

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file')
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' }
      })
    }

    console.log('🔵 [Upload Proxy] File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // Check environment variables
    console.log('🔵 [Upload Proxy] Environment check:', {
      hasVercelBlobToken: !!process.env.VERCEL_BLOB_TOKEN,
      hasBlobReadWriteToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      nodeEnv: process.env.NODE_ENV
    })

    // Upload to Vercel Blob
    const filename = `reading-${readingId}-${Date.now()}.${file.name.split('.').pop()}`
    console.log('🔵 [Upload Proxy] Attempting blob upload with filename:', filename)
    
    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
    })

    console.log('🟢 [Upload Proxy] Blob uploaded:', blob.url)

    // Now update the reading via the backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mytarotreadingsserver.vercel.app'
    
    try {
      const updateResponse = await fetch(`${backendUrl}/api/readings/${readingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: blob.url })
      })

      if (updateResponse.ok) {
        console.log('🟢 [Upload Proxy] Reading updated with image URL')
      } else {
        console.warn('🟡 [Upload Proxy] Failed to update reading, but blob uploaded successfully')
      }
    } catch (updateError) {
      console.warn('🟡 [Upload Proxy] Update error:', updateError.message)
      // Continue anyway - the blob was uploaded successfully
    }

    return new Response(JSON.stringify({
      success: true,
      imageUrl: blob.url,
      readingId: readingId,
      message: 'Image uploaded successfully via proxy'
    }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ [Upload Proxy] Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Upload failed: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-reading-id',
    },
  })
}