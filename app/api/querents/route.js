import { NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || process.env.SERVER_URL || process.env.NEXT_PUBLIC_API_URL || 'https://mytarotreadingsserver.vercel.app'

// GET /api/querents - Fetch all querents
export async function GET(request) {
  try {
    console.log('Proxying querents request to:', `${API_BASE_URL}/api/querents`)
    
    // Get authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    const response = await fetch(`${API_BASE_URL}/api/querents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
        'User-Agent': 'MyTarotReadings-Frontend/1.0'
      }
    })
    
    if (!response.ok) {
      console.error('Backend querents API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: `Backend API error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Querents API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch querents', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/querents - Create new querent (requires authentication)
export async function POST(request) {
  try {
    const body = await request.json()
    
    // Get authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    const response = await fetch(`${API_BASE_URL}/api/querents`, {
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
      console.error('Backend create querent error:', response.status, errorData)
      return NextResponse.json(
        { error: errorData || `Backend API error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data, { status: 201 })
    
  } catch (error) {
    console.error('Create querent API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to create querent', details: error.message },
      { status: 500 }
    )
  }
}