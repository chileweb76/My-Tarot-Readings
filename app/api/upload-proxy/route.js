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
    
    // Check if we have the required token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('🔴 [Upload Proxy] Missing BLOB_READ_WRITE_TOKEN environment variable')
      return new Response(JSON.stringify({ 
        error: 'Server configuration error: Missing blob storage token' 
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      })
    }
    
    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN
    })

    console.log('🟢 [Upload Proxy] Blob uploaded:', blob.url)

    // Return the blob URL immediately - don't try to update the reading here
    // The frontend will handle updating the reading with the image URL
    return new Response(JSON.stringify({
      success: true,
      url: blob.url,
      imageUrl: blob.url,
      readingId: readingId,
      message: 'Image uploaded successfully to Vercel Blob'
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