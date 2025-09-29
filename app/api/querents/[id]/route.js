import { NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || process.env.SERVER_URL || process.env.NEXT_PUBLIC_API_URL || 'https://mytarotreadingsserver.vercel.app'

// DELETE /api/querents/[id] - Delete specific querent (requires authentication)
export async function DELETE(request, { params }) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Querent ID is required' },
        { status: 400 }
      )
    }
    
    // Get authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    const url = `${API_BASE_URL}/api/querents/${id}`
    console.log('Proxying delete querent request to:', url)
    
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
      console.error('Backend delete querent error:', response.status, errorData)
      return NextResponse.json(
        { error: errorData || `Backend API error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Delete querent API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to delete querent', details: error.message },
      { status: 500 }
    )
  }
}