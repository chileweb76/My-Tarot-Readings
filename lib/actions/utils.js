"use server"

import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'
import { cookies } from 'next/headers'
import { connectToDatabase } from '../mongo'

// Utility function to get user from token
export async function getUserFromToken() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  
  if (!token) {
    throw new Error('Not authenticated')
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const { db } = await connectToDatabase()
    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) })
    
    if (!user) {
      throw new Error('User not found')
    }
    
    return user
  } catch (error) {
    throw new Error('Invalid token')
  }
}

// Utility for API proxy calls with cookies
export async function makeAuthenticatedAPICall(endpoint, options = {}) {
  const cookieStore = await cookies()
  
  // Determine the API base URL - check all possible environment variables
  const apiBaseUrl = process.env.API_BASE_URL || 
                     process.env.SERVER_URL || 
                     process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || // Remove trailing slash
                     (process.env.NODE_ENV === 'production' 
                       ? 'https://mytarotreadingsserver.vercel.app'
                       : 'http://localhost:3001')
  
  const token = cookieStore.get('token')?.value
  
  if (!token) {
    throw new Error('No authentication token found')
  }
  
  try {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`,
        'Authorization': `Bearer ${token}`, // Also send as Bearer token for API compatibility
        ...options.headers
      },
      credentials: 'include' // Important for cross-origin cookie handling
    })
    
    return response
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error)
    throw error
  }
}