"use server"

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import connectToDatabase from './mongo'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'
import { put } from '@vercel/blob'
import { cookies } from 'next/headers'

// Utility function to get user from token
async function getUserFromToken() {
  const cookieStore = cookies()
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

// Authentication Actions
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
    const cookieStore = cookies()
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
    const cookieStore = cookies()
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
  const cookieStore = cookies()
  cookieStore.delete('token')
  redirect('/auth')
}

// User Settings Actions
export async function changeUsernameAction(formData) {
  const username = formData.get('username')
  
  if (!username || username.length < 2) {
    return { error: 'Username must be at least 2 characters' }
  }
  
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    
    // Check if username is taken
    const existingUser = await db.collection('users').findOne({ 
      username, 
      _id: { $ne: user._id } 
    })
    
    if (existingUser) {
      return { error: 'Username is already taken' }
    }
    
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { username } }
    )
    
    revalidatePath('/settings')
    return { success: true, message: 'Username updated successfully' }
  } catch (error) {
    console.error('Change username error:', error)
    return { error: error.message || 'Failed to update username' }
  }
}

export async function changePasswordAction(formData) {
  const currentPassword = formData.get('currentPassword')
  const newPassword = formData.get('newPassword')
  const verifyPassword = formData.get('verifyPassword')
  
  if (!currentPassword || !newPassword || !verifyPassword) {
    return { error: 'All password fields are required' }
  }
  
  if (newPassword.length < 6) {
    return { error: 'New password must be at least 6 characters' }
  }
  
  if (newPassword !== verifyPassword) {
    return { error: 'New passwords do not match' }
  }
  
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    
    // Verify current password
    if (!await bcrypt.compare(currentPassword, user.password)) {
      return { error: 'Current password is incorrect' }
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    )
    
    revalidatePath('/settings')
    return { success: true, message: 'Password updated successfully' }
  } catch (error) {
    console.error('Change password error:', error)
    return { error: error.message || 'Failed to update password' }
  }
}

export async function uploadProfilePictureAction(formData) {
  try {
    const user = await getUserFromToken()
    const file = formData.get('picture')
    
    if (!file || file.size === 0) {
      return { error: 'No file provided' }
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { error: 'File must be an image' }
    }
    
    // Upload to Vercel Blob
    const filename = `profile-${user._id}-${Date.now()}.${file.type.split('/')[1]}`
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: true
    })
    
    // Update user profile
    const { db } = await connectToDatabase()
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { profilePicture: blob.url } }
    )
    
    revalidatePath('/settings')
    return { success: true, profilePicture: blob.url, message: 'Profile picture updated' }
  } catch (error) {
    console.error('Upload profile picture error:', error)
    return { error: error.message || 'Failed to upload profile picture' }
  }
}

export async function removeProfilePictureAction() {
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    
    await db.collection('users').updateOne(
      { _id: user._id },
      { $unset: { profilePicture: 1 } }
    )
    
    revalidatePath('/settings')
    return { success: true, message: 'Profile picture removed' }
  } catch (error) {
    console.error('Remove profile picture error:', error)
    return { error: error.message || 'Failed to remove profile picture' }
  }
}

// Reading Actions
export async function saveReadingAction(formData) {
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    
    // Extract form data
    const readingData = {
      querent: formData.get('querent') || 'self',
      question: formData.get('question') || '',
      spread: formData.get('spread') || '',
      spreadName: formData.get('spreadName') || '',
      interpretation: formData.get('interpretation') || '',
      deck: formData.get('deck') || '',
      tags: JSON.parse(formData.get('tags') || '[]'),
      cards: JSON.parse(formData.get('cards') || '[]'),
      userId: user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // Handle image upload if present
    const imageFile = formData.get('image')
    if (imageFile && imageFile.size > 0) {
      const filename = `reading-${user._id}-${Date.now()}.${imageFile.type.split('/')[1]}`
      const blob = await put(filename, imageFile, {
        access: 'public',
        addRandomSuffix: true
      })
      readingData.image = blob.url
    }
    
    const readingId = formData.get('readingId')
    let result
    
    if (readingId) {
      // Update existing reading
      result = await db.collection('readings').updateOne(
        { _id: new ObjectId(readingId), userId: user._id },
        { $set: { ...readingData, updatedAt: new Date() } }
      )
      result.insertedId = readingId
    } else {
      // Create new reading
      result = await db.collection('readings').insertOne(readingData)
    }
    
    revalidatePath('/')
    return { 
      success: true, 
      readingId: result.insertedId,
      message: readingId ? 'Reading updated' : 'Reading saved'
    }
  } catch (error) {
    console.error('Save reading error:', error)
    return { error: error.message || 'Failed to save reading' }
  }
}

export async function createTagAction(formData) {
  const tagName = formData.get('tagName')
  
  if (!tagName || tagName.trim().length === 0) {
    return { error: 'Tag name is required' }
  }
  
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    
    // Check if tag already exists for this user
    const existingTag = await db.collection('tags').findOne({
      name: tagName.trim(),
      userId: user._id
    })
    
    if (existingTag) {
      return { error: 'Tag already exists' }
    }
    
    const result = await db.collection('tags').insertOne({
      name: tagName.trim(),
      userId: user._id,
      isGlobal: false,
      createdAt: new Date()
    })
    
    revalidatePath('/')
    return { 
      success: true, 
      tag: { _id: result.insertedId, name: tagName.trim() },
      message: 'Tag created successfully'
    }
  } catch (error) {
    console.error('Create tag error:', error)
    return { error: error.message || 'Failed to create tag' }
  }
}

// Push Notification Actions
export async function subscribeToPushAction(formData) {
  try {
    const user = await getUserFromToken()
    const subscription = JSON.parse(formData.get('subscription'))
    
    if (!subscription || !subscription.endpoint) {
      return { error: 'Invalid subscription data' }
    }
    
    const { db } = await connectToDatabase()
    
    // Store or update subscription
    await db.collection('pushSubscriptions').updateOne(
      { userId: user._id, endpoint: subscription.endpoint },
      {
        $set: {
          userId: user._id,
          subscription,
          createdAt: new Date(),
          lastUsed: new Date()
        }
      },
      { upsert: true }
    )
    
    return { success: true, message: 'Successfully subscribed to notifications' }
  } catch (error) {
    console.error('Subscribe to push error:', error)
    return { error: error.message || 'Failed to subscribe to notifications' }
  }
}

export async function unsubscribeFromPushAction(formData) {
  try {
    const user = await getUserFromToken()
    const endpoint = formData.get('endpoint')
    
    const { db } = await connectToDatabase()
    
    await db.collection('pushSubscriptions').deleteOne({
      userId: user._id,
      'subscription.endpoint': endpoint
    })
    
    return { success: true, message: 'Successfully unsubscribed from notifications' }
  } catch (error) {
    console.error('Unsubscribe from push error:', error)
    return { error: error.message || 'Failed to unsubscribe from notifications' }
  }
}

// Deck Management Actions
export async function createDeckAction(formData) {
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    
    const deckName = formData.get('deckName')
    const description = formData.get('description') || ''
    
    if (!deckName || deckName.trim().length === 0) {
      return { error: 'Deck name is required' }
    }
    
    // Handle deck image upload
    let deckImageUrl = null
    const imageFile = formData.get('deckImage')
    if (imageFile && imageFile.size > 0) {
      const filename = `deck-${user._id}-${Date.now()}.${imageFile.type.split('/')[1]}`
      const blob = await put(filename, imageFile, {
        access: 'public',
        addRandomSuffix: true
      })
      deckImageUrl = blob.url
    }
    
    const deckData = {
      deckName: deckName.trim(),
      description: description.trim(),
      owner: user._id,
      image: deckImageUrl,
      cards: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await db.collection('decks').insertOne(deckData)
    
    revalidatePath('/decks')
    return { 
      success: true, 
      deckId: result.insertedId,
      message: 'Deck created successfully'
    }
  } catch (error) {
    console.error('Create deck error:', error)
    return { error: error.message || 'Failed to create deck' }
  }
}

export async function resetPasswordAction(formData) {
  const email = formData.get('email')
  
  if (!email) {
    return { error: 'Email is required' }
  }
  
  try {
    const { db } = await connectToDatabase()
    const user = await db.collection('users').findOne({ email })
    
    if (!user) {
      // Don't reveal if email exists for security
      return { success: true, message: 'If an account exists, a reset link has been sent' }
    }
    
    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id, type: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )
    
    // Store reset token (you might want to add email sending logic here)
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          resetToken,
          resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        } 
      }
    )
    
    // TODO: Send email with reset link
    console.log(`Reset link: ${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset?token=${resetToken}`)
    
    return { success: true, message: 'If an account exists, a reset link has been sent' }
  } catch (error) {
    console.error('Reset password error:', error)
    return { error: 'Failed to process password reset' }
  }
}