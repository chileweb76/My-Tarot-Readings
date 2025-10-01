"use server"

import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    // Get the FormData from the request
    const formData = await request.formData()
    
    // Extract query parameters from the request URL
    const url = new URL(request.url)
    const readingId = url.searchParams.get('id')
    
    if (!readingId) {
      return new Response(JSON.stringify({ error: 'Reading ID is required as query parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const API_BASE_URL = 
      process.env.VERCEL_ENV === 'production' 
        ? 'https://mytarotreadingsserver.vercel.app'
        : process.env.API_BASE_URL || 'https://mytarotreadingsserver.vercel.app'

    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    // Make token optional for blob uploads to avoid JWT verification issues
    const authHeaders = token ? {
      'Authorization': `Bearer ${token}`,
      'Cookie': `token=${token}`
    } : {}
    
    console.log(`🔵 Frontend API: Forwarding blob upload to ${API_BASE_URL}/api/blob-upload?id=${readingId}`)
    
    const response = await fetch(`${API_BASE_URL}/api/blob-upload?id=${readingId}`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData - let the browser set it with boundary
        ...authHeaders,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('🔴 Backend Blob Upload Error:', errorText)
      return new Response(errorText, { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()
    console.log('🟢 Blob upload successful:', { url: data.url || data.image })
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('🔴 Frontend Blob Upload API Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}