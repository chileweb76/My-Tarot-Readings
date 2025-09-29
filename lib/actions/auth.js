"use server"

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '../mongo'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'
import { put } from '@vercel/blob'
import { cookies } from 'next/headers'
import { getUserFromToken, makeAuthenticatedAPICall } from './utils'

// Authentication Actions
export async function getCurrentUserAction() {
  try {
    const user = await getUserFromToken()
    return { 
      success: true, 
      user: { 
        _id: user._id, 
        username: user.username, 
        email: user.email,
        profilePicture: user.profilePicture,
        authProvider: user.authProvider 
      } 
    }
  } catch (error) {
    console.error('getCurrentUserAction error:', error)
    
    // If direct token validation fails, try API proxy as fallback
    try {
      const response = await makeAuthenticatedAPICall('/api/auth/me')
      
      if (response.ok) {
        const data = await response.json()
        return { 
          success: true, 
          user: {
            _id: data.user.id,
            username: data.user.username,
            email: data.user.email,
            profilePicture: data.user.profilePicture,
            authProvider: data.user.authProvider
          }
        }
      }
    } catch (apiError) {
      console.error('API fallback also failed:', apiError)
    }
    
    return { success: false, error: error.message }
  }
}

export async function signInAction(formData) {
  const email = formData.get('email')
  const password = formData.get('password')
  
  if (!email || !password) {
    return { error: 'Email and password are required' }
  }
  
  try {
    const { db } = await connectToDatabase()
    const user = await db.collection('users').findOne({ email })
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return { error: 'Invalid credentials' }
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
    
    // Set HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })
    
    return { success: true, user: { _id: user._id, username: user.username, email: user.email } }
  } catch (error) {
    console.error('Sign in error:', error)
    return { error: 'Sign in failed' }
  }
}

export async function signUpAction(formData) {
  const username = formData.get('username')
  const email = formData.get('email')
  const password = formData.get('password')
  
  if (!username || !email || !password) {
    return { error: 'All fields are required' }
  }
  
  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters' }
  }
  
  try {
    const { db } = await connectToDatabase()
    
    // Check if user exists
    const existingUser = await db.collection('users').findOne({ 
      $or: [{ email }, { username }] 
    })
    
    if (existingUser) {
      return { error: 'User with this email or username already exists' }
    }
    
    // Create user
    const hashedPassword = await bcrypt.hash(password, 12)
    const result = await db.collection('users').insertOne({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date()
    })
    
    const token = jwt.sign({ userId: result.insertedId }, process.env.JWT_SECRET, { expiresIn: '7d' })
    
    // Set HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    })
    
    return { 
      success: true, 
      user: { _id: result.insertedId, username, email }
    }
  } catch (error) {
    console.error('Sign up error:', error)
    return { error: 'Registration failed' }
  }
}

export async function signOutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('token')
  redirect('/auth')
}

export async function verifyAuthTokenAction(token) {
  try {
    const response = await fetch(`${process.env.API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Verification failed')
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Auth verification error:', error)
    return { error: error.message || 'Failed to verify token' }
  }
}

export async function resetPasswordAction(formData) {
  try {
    const email = formData.get('email')
    
    const response = await makeAuthenticatedAPICall('/api/auth/reset', {
      method: 'POST',
      body: JSON.stringify({ email })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Reset request failed')
    }

    const data = await response.json()
    return { success: true, message: data.message || 'Reset email sent' }
  } catch (error) {
    console.error('Password reset error:', error)
    return { error: error.message || 'Failed to send reset email' }
  }
}

// Debug action to check authentication status
export async function debugAuthStatusAction() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    const apiBaseUrl = process.env.API_BASE_URL || 
                       process.env.SERVER_URL || 
                       (process.env.NODE_ENV === 'production' 
                         ? 'https://mytarotreadingsserver.vercel.app'
                         : 'http://localhost:3001')
    
    return {
      success: true,
      debug: {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        apiBaseUrl,
        nodeEnv: process.env.NODE_ENV,
        serverUrl: process.env.SERVER_URL,
        apiUrl: process.env.API_BASE_URL,
        cookieExists: cookieStore.has('token')
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      debug: {
        error: error.toString()
      }
    }
  }
}