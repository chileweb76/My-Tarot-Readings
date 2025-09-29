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
  
  return await fetch(`${process.env.API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${cookieStore.get('token')?.value}`,
      ...options.headers
    }
  })
}