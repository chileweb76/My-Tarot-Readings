"use server"

import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const body = await request.json()
    // Debug: log incoming body shape to help track missing 'reading' errors in production
    try {
      console.log('Export proxy received body keys:', Object.keys(body || {}))
      // Avoid logging large payloads; log a small preview
      const preview = JSON.stringify(body && typeof body === 'object' ? Object.keys(body).reduce((acc, k) => { acc[k] = typeof body[k]; return acc }, {}) : body)
      console.log('Export proxy body preview:', preview)
    } catch (logErr) {
      console.warn('Failed to log export proxy body preview', logErr)
    }
    
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
    
    const response = await fetch(`${API_BASE_URL}/api/export/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Export PDF API Error:', errorText)
      return new Response(errorText, { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // For PDF responses, we need to handle the binary data properly
    const pdfBuffer = await response.arrayBuffer()
    
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="reading.pdf"',
      },
    })
    
  } catch (error) {
    console.error('Export PDF API Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}