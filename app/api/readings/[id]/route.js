"use server"

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const API_BASE_URL = 
  process.env.VERCEL_ENV === 'production' 
    ? 'https://mytarotreadingsserver.vercel.app'
    : process.env.API_BASE_URL || 'https://mytarotreadingsserver.vercel.app'

// GET /api/readings/[id] - Fetch specific reading by ID
export async function GET(request, { params }) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json({ error: 'Reading ID is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Cookie': `token=${token}`
    }
    
    const response = await fetch(`${API_BASE_URL}/api/readings/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Reading API Error:', errorText)
      return NextResponse.json({ error: errorText }, { 
        status: response.status 
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Reading API Error:', error)
    return NextResponse.json({ error: error.message }, {
      status: 500
    })
  }
}

// PUT /api/readings/[id] - Update specific reading
export async function PUT(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: 'Reading ID is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Cookie': `token=${token}`
    }
    
    const response = await fetch(`${API_BASE_URL}/api/readings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Update Reading API Error:', errorText)
      return NextResponse.json({ error: errorText }, { 
        status: response.status 
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Update Reading API Error:', error)
    return NextResponse.json({ error: error.message }, {
      status: 500
    })
  }
}

// DELETE /api/readings/[id] - Delete specific reading
export async function DELETE(request, { params }) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json({ error: 'Reading ID is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Cookie': `token=${token}`
    }
    
    const response = await fetch(`${API_BASE_URL}/api/readings/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Delete Reading API Error:', errorText)
      return NextResponse.json({ error: errorText }, { 
        status: response.status 
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Delete Reading API Error:', error)
    return NextResponse.json({ error: error.message }, {
      status: 500
    })
  }
}