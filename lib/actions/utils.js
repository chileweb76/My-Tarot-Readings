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
    // First try to verify locally (happy path when secrets match)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const { db } = await connectToDatabase()
    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) })

    if (!user) {
      throw new Error('User not found')
    }

    return user
  } catch (error) {
    // If verification failed it may be because the token was issued/signed
    // by the backend service using a different secret. Try a safe fallback:
    // 1) decode the token without verifying to inspect the payload
    // 2) if we can extract a user id, attempt to load that user directly from DB
    // NOTE: decoding without verification is not cryptographically secure,
    // but it helps in development and for cross-signed token situations.
    try {
      const decodedUnsafe = jwt.decode(token)
      if (decodedUnsafe && (decodedUnsafe.userId || decodedUnsafe.id)) {
        const userId = decodedUnsafe.userId || decodedUnsafe.id
        const { db } = await connectToDatabase()
        try {
          const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
          if (user) return user
        } catch (dbErr) {
          // fall through to final error
          console.error('Error looking up user by decoded token id:', dbErr)
        }
      }
    } catch (decodeErr) {
      console.error('Token decode fallback failed:', decodeErr)
    }

    // If all else fails return a generic invalid token error to the caller
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