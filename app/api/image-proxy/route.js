import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Proxy route to serve Vercel blob images with proper authentication
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }
    
    // Only proxy Vercel blob URLs for security
    if (!imageUrl.includes('blob.vercel-storage.com')) {
      return NextResponse.json({ error: 'Only Vercel blob URLs are supported' }, { status: 400 })
    }
    
    console.log('🖼️ Image proxy: Fetching blob URL:', imageUrl)
    
    // Get auth token from cookies and add Vercel blob token
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_TOKEN
    
    const headers = {
      'User-Agent': 'MyTarotReadings/1.0'
    }
    
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    
    if (blobToken) {
      headers['Authorization'] = `Bearer ${blobToken}`
    }
    
    // Fetch the image with proper auth
    const imageResponse = await fetch(imageUrl, {
      headers,
      cache: 'force-cache', // Cache images for performance
    })
    
    if (!imageResponse.ok) {
      console.error('🖼️ Image proxy: Failed to fetch image:', imageResponse.status, imageResponse.statusText)
      return NextResponse.json(
        { error: `Failed to fetch image: ${imageResponse.statusText}` },
        { status: imageResponse.status }
      )
    }
    
    console.log('🖼️ Image proxy: Successfully fetched image')
    
    // Get the image data and content type
    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
    
    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
      },
    })
    
  } catch (error) {
    console.error('🖼️ Image proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    )
  }
}