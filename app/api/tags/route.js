import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_BASE_URL = process.env.API_BASE_URL || process.env.SERVER_URL || process.env.NEXT_PUBLIC_API_URL || 'https://mytarotreadingsserver.vercel.app'

// GET /api/tags - Fetch all tags
export async function GET(request) {
  try {
    console.log('🔵 Frontend Tags Proxy: Starting request')
    console.log('🔵 Frontend Tags Proxy: Proxying request to:', `${API_BASE_URL}/api/tags`)
    
    // Get authorization from header OR cookies
    const authHeader = request.headers.get('authorization')
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    // Prepare headers with authentication
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'MyTarotReadings-Frontend/1.0'
    }
    
    // Add authentication - prefer Bearer token, fallback to cookie
    if (authHeader) {
      headers['Authorization'] = authHeader
      console.log('🔵 Frontend Tags Proxy: Using Authorization header')
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`
      headers['Cookie'] = `token=${token}`
      console.log('🔵 Frontend Tags Proxy: Using token from cookies')
    } else {
      console.log('🔵 Frontend Tags Proxy: No authentication found, proceeding without auth')
    }
    
    const response = await fetch(`${API_BASE_URL}/api/tags`, {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      console.error('Backend tags API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: `Backend API error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Tags API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tags', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/tags - Create new tag (requires authentication)
export async function POST(request) {
  try {
    const body = await request.json()
    
    // Get authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    const response = await fetch(`${API_BASE_URL}/api/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
        'User-Agent': 'MyTarotReadings-Frontend/1.0'
      },
      body: JSON.stringify(body)
    })
    
    if (!response.ok) {
      const errorData = await response.text()
      console.error('Backend create tag error:', response.status, errorData)
      return NextResponse.json(
        { error: errorData || `Backend API error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data, { status: 201 })
    
  } catch (error) {
    console.error('Create tag API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to create tag', details: error.message },
      { status: 500 }
    )
  }
}