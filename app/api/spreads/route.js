import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_BASE_URL = process.env.API_BASE_URL || process.env.SERVER_URL || process.env.NEXT_PUBLIC_API_URL || 'https://mytarotreadingsserver.vercel.app'

// GET /api/spreads - Fetch all spreads
export async function GET(request) {
  try {
    console.log('🔵 Frontend Spreads Proxy: Starting request')
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const name = searchParams.get('name')
    
    let url = `${API_BASE_URL}/api/spreads`
    
    // Handle query parameters for specific spread lookups
    if (id) {
      url = `${API_BASE_URL}/api/spreads/${id}`
    } else if (name) {
      url = `${API_BASE_URL}/api/spreads/by-name?name=${encodeURIComponent(name)}`
    }
    
    console.log('🔵 Frontend Spreads Proxy: Proxying request to:', url)
    
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
      console.log('🔵 Frontend Spreads Proxy: Using Authorization header')
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`
      headers['Cookie'] = `token=${token}`
      console.log('🔵 Frontend Spreads Proxy: Using token from cookies')
    } else {
      console.log('🔵 Frontend Spreads Proxy: No authentication found, proceeding without auth')
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      console.error('Backend spreads API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: `Backend API error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Spreads API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch spreads', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/spreads - Create new spread (requires authentication)
export async function POST(request) {
  try {
    const body = await request.json()
    
    // Get authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    const response = await fetch(`${API_BASE_URL}/api/spreads`, {
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
      console.error('Backend create spread error:', response.status, errorData)
      return NextResponse.json(
        { error: errorData || `Backend API error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data, { status: 201 })
    
  } catch (error) {
    console.error('Create spread API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to create spread', details: error.message },
      { status: 500 }
    )
  }
}