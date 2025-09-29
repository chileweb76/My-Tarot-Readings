"use server"

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const API_BASE_URL = 
  process.env.VERCEL_ENV === 'production' 
    ? 'https://mytarotreadingsserver.vercel.app'
    : process.env.API_BASE_URL || 'https://mytarotreadingsserver.vercel.app'

// GET /api/readings/user - Fetch user's readings
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
    
    const response = await fetch(`${API_BASE_URL}/api/readings/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('User Readings API Error:', errorText)
      return NextResponse.json({ error: errorText }, { 
        status: response.status 
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('User Readings API Error:', error)
    return NextResponse.json({ error: error.message }, {
      status: 500
    })
  }
}