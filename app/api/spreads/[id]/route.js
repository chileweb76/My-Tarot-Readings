import { NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || process.env.SERVER_URL || process.env.NEXT_PUBLIC_API_URL || 'https://mytarotreadingsserver.vercel.app'

// GET /api/spreads/[id] - Fetch specific spread by ID
export async function GET(request, { params }) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Spread ID is required' },
        { status: 400 }
      )
    }
    
    const url = `${API_BASE_URL}/api/spreads/${id}`
    console.log('Proxying spread request to:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MyTarotReadings-Frontend/1.0'
      }
    })
    
    if (!response.ok) {
      console.error('Backend spread API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: `Backend API error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Spread API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch spread', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/spreads/[id] - Delete specific spread (requires authentication)
export async function DELETE(request, { params }) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Spread ID is required' },
        { status: 400 }
      )
    }
    
    // Get authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    const url = `${API_BASE_URL}/api/spreads/${id}`
    console.log('Proxying delete spread request to:', url)
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
        'User-Agent': 'MyTarotReadings-Frontend/1.0'
      }
    })
    
    if (!response.ok) {
      const errorData = await response.text()
      console.error('Backend delete spread error:', response.status, errorData)
      return NextResponse.json(
        { error: errorData || `Backend API error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Delete spread API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to delete spread', details: error.message },
      { status: 500 }
    )
  }
}