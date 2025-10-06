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
    // Return a plain serializable object (convert ObjectId to string)
    return { 
      success: true, 
      user: { 
        _id: user._id?.toString ? user._id.toString() : user._id, 
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
    // Use the Express API login endpoint which handles email verification checks
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:5000'
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Include cookies for session
      body: JSON.stringify({
        email,
        password
      })
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle verification required error specifically
      if (response.status === 403 && data.resendVerification) {
        return { 
          error: data.error || 'Please verify your email before logging in',
          resendVerification: true,
          email: data.email
        }
      }
      return { error: data.error || 'Login failed' }
    }

    // The Express API returns a token in the response body and sets httpOnly cookies
    // Set token cookie on the Next.js side as well for server components
    const cookieStore = await cookies()
    if (data.token) {
      cookieStore.set('token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      })
    }
    
    return { 
      success: true, 
      user: data.user
    }
  } catch (error) {
    console.error('Sign in error:', error)
    return { error: error.message || 'Sign in failed. Please try again.' }
  }
}

export async function signUpAction(formData) {
  const username = formData.get('username')
  const email = formData.get('email')
  const password = formData.get('password')
  const verifyPassword = formData.get('verifyPassword')
  
  if (!username || !email || !password || !verifyPassword) {
    return { error: 'All fields are required' }
  }

  if (password !== verifyPassword) {
    return { error: 'Passwords do not match' }
  }
  
  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters' }
  }
  
  try {
    // Use the Express API registration endpoint which handles email verification
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:5000'
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        email,
        password,
        verifyPassword
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Registration failed' }
    }

    // Do NOT issue token or log user in - they must verify email first
    return { 
      success: true,
      message: data.message || 'Registration successful! Please check your email to verify your account.',
      requiresVerification: true,
      user: data.user
    }
  } catch (error) {
    console.error('Sign up error:', error)
    return { error: error.message || 'Registration failed. Please try again.' }
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

// OAuth token exchange action - for cross-domain deployments
export async function exchangeOAuthTokenAction(token) {
  try {
    if (!token) {
      return { error: 'Token is required' }
    }

    let apiBaseUrl = process.env.API_BASE_URL || 
                     process.env.SERVER_URL || 
                     process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 
                     (process.env.NODE_ENV === 'production' 
                       ? 'https://mytarotreadingsserver.vercel.app'
                       : 'http://localhost:3001')
    
    // Ensure apiBaseUrl is defined
    if (!apiBaseUrl || typeof apiBaseUrl !== 'string') {
      apiBaseUrl = 'https://mytarotreadingsserver.vercel.app'
    }

    // Exchange token with backend
    const response = await fetch(`${apiBaseUrl}/api/auth/token-relay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token }),
      credentials: 'include'
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Token exchange failed')
    }

    const data = await response.json()
    
    if (data.success && data.user && data.token) {
      // Set the cookie in our domain using Server Actions
      const cookieStore = await cookies()
      cookieStore.set('token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      })

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

    return { error: 'Invalid response from token exchange' }
  } catch (error) {
    console.error('OAuth token exchange error:', error)
    return { error: error.message || 'Failed to exchange OAuth token' }
  }
}

// Debug action to check authentication status
export async function debugAuthStatusAction() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    let apiBaseUrl = process.env.API_BASE_URL || 
                     process.env.SERVER_URL || 
                     process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 
                     (process.env.NODE_ENV === 'production' 
                       ? 'https://mytarotreadingsserver.vercel.app'
                       : 'http://localhost:3001')
    
    // Ensure apiBaseUrl is defined
    if (!apiBaseUrl || typeof apiBaseUrl !== 'string') {
      apiBaseUrl = 'https://mytarotreadingsserver.vercel.app'
    }
    
    // Attempt to decode token without verifying to provide helpful info in debug UI
    let decoded = null
    try {
      if (token) decoded = jwt.decode(token)
    } catch (e) {
      decoded = null
    }

    return {
      success: true,
      debug: {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenPreview: token ? `${token.substring(0, 10)}...${token.substring(Math.max(10, token.length - 10))}` : null,
        decodedPayload: decoded,
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