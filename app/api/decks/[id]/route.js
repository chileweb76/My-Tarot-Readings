import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_BASE_URL = process.env.API_BASE_URL || process.env.SERVER_URL || process.env.NEXT_PUBLIC_API_URL || 'https://mytarotreadingsserver.vercel.app'

// GET /api/decks/[id] - Fetch specific deck by ID
export async function GET(request, { params }) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Deck ID is required' },
        { status: 400 }
      )
    }
    
    const url = `${API_BASE_URL}/api/decks/${id}`
    console.log('Proxying deck request to:', url)
    console.log('Deck ID being requested:', id)
    
    // Use cookie-based authentication like other routes
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    const authHeaders = token ? {
      'Authorization': `Bearer ${token}`,
      'Cookie': `token=${token}`
    } : {}
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MyTarotReadings-Frontend/1.0',
        ...authHeaders
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend deck API error:', response.status, response.statusText)
      console.error('Backend error response:', errorText)
      console.error('Request URL was:', url)
      return NextResponse.json(
        { error: `Backend API error: ${response.statusText}`, details: errorText, requestedId: id },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Deck API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deck', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/decks/[id] - Delete specific deck (requires authentication)
export async function DELETE(request, { params }) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Deck ID is required' },
        { status: 400 }
      )
    }
    
    // Get authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    const url = `${API_BASE_URL}/api/decks/${id}`
    console.log('Proxying delete deck request to:', url)
    
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
      console.error('Backend delete deck error:', response.status, errorData)
      return NextResponse.json(
        { error: errorData || `Backend API error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Delete deck API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to delete deck', details: error.message },
      { status: 500 }
    )
  }
}