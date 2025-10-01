"use server"

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const API_BASE_URL = 
  process.env.VERCEL_ENV === 'production' 
    ? 'https://mytarotreadingsserver.vercel.app'
    : process.env.API_BASE_URL || 'https://mytarotreadingsserver.vercel.app'

// GET /api/readings - Fetch all readings
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Cookie': `token=${token}`
    }
    
    const response = await fetch(`${API_BASE_URL}/api/readings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Readings API Error:', errorText)
      return NextResponse.json({ error: errorText }, { 
        status: response.status 
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Readings API Error:', error)
    return NextResponse.json({ error: error.message }, {
      status: 500
    })
  }
}

// POST /api/readings - Create new reading
export async function POST(request) {
  try {
    const body = await request.json()
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    console.log('🔵 Frontend readings API: Creating reading with token:', token ? 'present' : 'missing')
    
    if (!token) {
      console.error('🔴 Frontend readings API: No authentication token found')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Cookie': `token=${token}`
    }
    
    console.log('🔵 Frontend readings API: Forwarding to backend:', `${API_BASE_URL}/api/readings`)
    
    const response = await fetch(`${API_BASE_URL}/api/readings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(body),
    })

    console.log('🔵 Frontend readings API: Backend response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('🔴 Create Reading API Error:', errorText)
      return NextResponse.json({ error: errorText }, { 
        status: response.status 
      })
    }

    const data = await response.json()
    console.log('🟢 Frontend readings API: Reading created successfully')
    return NextResponse.json(data, { status: 201 })
    
  } catch (error) {
    console.error('🔴 Create Reading API Error:', error)
    return NextResponse.json({ error: error.message }, {
      status: 500
    })
  }
}