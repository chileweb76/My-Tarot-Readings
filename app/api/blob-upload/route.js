"use server"

import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    // Get the FormData from the request
    const formData = await request.formData()
    
    const API_BASE_URL = 
      process.env.VERCEL_ENV === 'production' 
        ? 'https://mytarotreadingsserver.vercel.app'
        : process.env.API_BASE_URL || 'https://mytarotreadingsserver.vercel.app'

    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Cookie': `token=${token}`
    }
    
    const response = await fetch(`${API_BASE_URL}/api/blob-upload`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData - let the browser set it with boundary
        ...authHeaders,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Blob Upload API Error:', errorText)
      return new Response(errorText, { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('Blob Upload API Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}