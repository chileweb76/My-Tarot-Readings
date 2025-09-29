"use server"

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { connectToDatabase } from './mongo'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'
import { put } from '@vercel/blob'
import { cookies } from 'next/headers'

// Utility function to get user from token
async function getUserFromToken() {
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

// Data Loading Server Actions
export async function getDecksAction() {
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    const decks = await db.collection('decks')
      .find({ $or: [{ owner: user._id }, { owner: null }] })
      .toArray()
    return { success: true, decks }
  } catch (error) {
    console.error('Get decks error:', error)
    return { error: 'Failed to load decks' }
  }
}

export async function getSpreadsAction() {
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    const spreads = await db.collection('spreads')
      .find({ $or: [{ userId: user._id }, { userId: null }] })
      .toArray()
    return { success: true, spreads }
  } catch (error) {
    console.error('Get spreads error:', error)
    return { error: 'Failed to load spreads' }
  }
}

// Delete Actions
export async function deleteQuerentAction(formData) {
  try {
    const user = await getUserFromToken()
    const querentId = formData.get('querentId')
    
    const { db } = await connectToDatabase()
    const result = await db.collection('querents').deleteOne({
      _id: new ObjectId(querentId),
      userId: user._id
    })
    
    if (result.deletedCount === 0) {
      return { error: 'Querent not found or not authorized' }
    }
    
    return { success: true, message: 'Querent deleted successfully' }
  } catch (error) {
    console.error('Delete querent error:', error)
    return { error: 'Failed to delete querent' }
  }
}

export async function deleteDeckAction(formData) {
  try {
    const user = await getUserFromToken()
    const deckId = formData.get('deckId')
    
    const { db } = await connectToDatabase()
    const result = await db.collection('decks').deleteOne({
      _id: new ObjectId(deckId),
      owner: user._id
    })
    
    if (result.deletedCount === 0) {
      return { error: 'Deck not found or not authorized' }
    }
    
    return { success: true, message: 'Deck deleted successfully' }
  } catch (error) {
    console.error('Delete deck error:', error)
    return { error: 'Failed to delete deck' }
  }
}

export async function deleteSpreadAction(formData) {
  try {
    const user = await getUserFromToken()
    const spreadId = formData.get('spreadId')
    
    const { db } = await connectToDatabase()
    const result = await db.collection('spreads').deleteOne({
      _id: new ObjectId(spreadId),
      userId: user._id
    })
    
    if (result.deletedCount === 0) {
      return { error: 'Spread not found or not authorized' }
    }
    
    return { success: true, message: 'Spread deleted successfully' }
  } catch (error) {
    console.error('Delete spread error:', error)
    return { error: 'Failed to delete spread' }
  }
}

export async function deleteTagAction(formData) {
  try {
    const user = await getUserFromToken()
    const tagId = formData.get('tagId')
    
    const { db } = await connectToDatabase()
    const result = await db.collection('tags').deleteOne({
      _id: new ObjectId(tagId),
      userId: user._id
    })
    
    if (result.deletedCount === 0) {
      return { error: 'Tag not found or not authorized' }
    }
    
    return { success: true, message: 'Tag deleted successfully' }
  } catch (error) {
    console.error('Delete tag error:', error)
    return { error: 'Failed to delete tag' }
  }
}

// Account Management Actions
export async function requestAccountDeletionAction() {
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          isDeleted: true,
          deletedAt: new Date()
        } 
      }
    )
    
    return { success: true, message: 'Account deletion requested' }
  } catch (error) {
    console.error('Request account deletion error:', error)
    return { error: 'Failed to request account deletion' }
  }
}

export async function cancelAccountDeletionAction() {
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          isDeleted: false,
          deletedAt: null
        } 
      }
    )
    
    return { success: true, message: 'Account deletion cancelled' }
  } catch (error) {
    console.error('Cancel account deletion error:', error)
    return { error: 'Failed to cancel account deletion' }
  }
}

// Image Loading Server Actions
export async function getCardImageAction(cardName, deck) {
  try {
    const { db } = await connectToDatabase()
    // Implementation would depend on your card image storage logic
    // For now, return a placeholder response
    return { success: true, imageUrl: `/images/cards/${deck}/${cardName}.jpg` }
  } catch (error) {
    console.error('Get card image error:', error)
    return { error: 'Failed to load card image' }
  }
}

export async function getDeckImageAction(deckId) {
  try {
    const { db } = await connectToDatabase()
    const deck = await db.collection('decks').findOne({ _id: new ObjectId(deckId) })
    return { success: true, deck }
  } catch (error) {
    console.error('Get deck image error:', error)
    return { error: 'Failed to load deck image' }
  }
}

export async function getReadingImageAction(readingId) {
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    const reading = await db.collection('readings').findOne({ 
      _id: new ObjectId(readingId),
      userId: user._id 
    })
    return { success: true, reading }
  } catch (error) {
    console.error('Get reading image error:', error)
    return { error: 'Failed to load reading image' }
  }
}

export async function getQuerentImageAction(querentId) {
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    const querent = await db.collection('querents').findOne({ 
      _id: new ObjectId(querentId),
      $or: [{ userId: user._id }, { userId: null }]
    })
    return { success: true, querent }
  } catch (error) {
    console.error('Get querent image error:', error)
    return { error: 'Failed to load querent image' }
  }
}

// Export Actions
export async function exportPdfAction(formData) {
  try {
    const reading = JSON.parse(formData.get('reading'))
    const fileName = formData.get('fileName') || `tarot-reading-${new Date().toISOString().split('T')[0]}.pdf`
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
    const response = await fetch(`${apiUrl}/api/export/pdf`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': (await cookies()).toString()
      },
      credentials: 'include',
      body: JSON.stringify({ reading, fileName })
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('PDF export failed:', response.status, response.statusText, errorText)
      return { error: `Export failed: ${response.status} ${response.statusText}` }
    }
    
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    
    return { 
      success: true, 
      pdf: base64,
      fileName,
      contentType: 'application/pdf'
    }
  } catch (error) {
    console.error('Export PDF error:', error)
    return { error: error.message || 'Failed to export PDF' }
  }
}

export async function getReadingAction(readingId) {
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    
    const reading = await db.collection('readings').findOne({
      _id: new ObjectId(readingId),
      userId: user._id
    })
    
    if (!reading) {
      return { error: 'Reading not found' }
    }
    
    return { success: true, reading }
  } catch (error) {
    console.error('Get reading error:', error)
    return { error: 'Failed to get reading' }
  }
}

export async function deleteReadingAction(formData) {
  try {
    const user = await getUserFromToken()
    const readingId = formData.get('readingId')
    
    if (!readingId) {
      return { error: 'Reading ID is required' }
    }
    
    const { db } = await connectToDatabase()
    const result = await db.collection('readings').deleteOne({
      _id: new ObjectId(readingId),
      userId: user._id
    })
    
    if (result.deletedCount === 0) {
      return { error: 'Reading not found or not authorized' }
    }
    
    revalidatePath('/reading')
    return { success: true, message: 'Reading deleted' }
  } catch (error) {
    console.error('Delete reading error:', error)
    return { error: 'Failed to delete reading' }
  }
}

export async function createReadingAction(formData) {
  try {
    const user = await getUserFromToken()
    const readingData = JSON.parse(formData.get('readingData'))
    
    const { db } = await connectToDatabase()
    const reading = {
      ...readingData,
      userId: user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await db.collection('readings').insertOne(reading)
    reading._id = result.insertedId
    
    revalidatePath('/reading')
    return { success: true, reading }
  } catch (error) {
    console.error('Create reading error:', error)
    return { error: 'Failed to create reading' }
  }
}

export async function uploadBlobAction(formData) {
  try {
    const user = await getUserFromToken()
    const readingId = formData.get('readingId')
    const blob = formData.get('blob')
    
    if (!readingId || !blob) {
      return { error: 'Reading ID and blob are required' }
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
    const response = await fetch(`${apiUrl}/api/blob-upload?id=${readingId}`, {
      method: 'POST',
      headers: {
        'Cookie': (await cookies()).toString()
      },
      credentials: 'include',
      body: formData
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('Blob upload failed:', response.status, response.statusText, errorText)
      return { error: `Upload failed: ${response.status} ${response.statusText}` }
    }
    
    const result = await response.json()
    return { success: true, ...result }
  } catch (error) {
    console.error('Upload blob error:', error)
    return { error: error.message || 'Failed to upload blob' }
  }
}

export async function createQuerentAction(formData) {
  try {
    const user = await getUserFromToken()
    const name = formData.get('name')
    
    if (!name || !name.trim()) {
      return { error: 'Name is required' }
    }
    
    const { db } = await connectToDatabase()
    const querent = {
      name: name.trim(),
      userId: user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await db.collection('querents').insertOne(querent)
    querent._id = result.insertedId
    
    revalidatePath('/querents')
    return { success: true, querent }
  } catch (error) {
    console.error('Create querent error:', error)
    return { error: 'Failed to create querent' }
  }
}

// Deck Management Actions
export async function createDeckAction(formData) {
  try {
    const user = await getUserFromToken()
    const deckName = formData.get('deckName')
    const description = formData.get('description')
    
    if (!deckName || !deckName.trim()) {
      return { error: 'Deck name is required' }
    }
    
    const { db } = await connectToDatabase()
    const deck = {
      deckName: deckName.trim(),
      description: description?.trim() || '',
      userId: user._id,
      cards: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await db.collection('decks').insertOne(deck)
    deck._id = result.insertedId
    
    revalidatePath('/decks')
    return { success: true, deck }
  } catch (error) {
    console.error('Create deck error:', error)
    return { error: 'Failed to create deck' }
  }
}

export async function getSingleDeckAction(deckId) {
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    
    const deck = await db.collection('decks').findOne({
      _id: new ObjectId(deckId),
      $or: [{ userId: user._id }, { userId: null }] // Allow access to public decks
    })
    
    if (!deck) {
      return { error: 'Deck not found' }
    }
    
    return { success: true, deck }
  } catch (error) {
    console.error('Get single deck error:', error)
    return { error: 'Failed to get deck' }
  }
}

export async function uploadDeckBlobAction(formData) {
  try {
    const user = await getUserFromToken()
    const deckId = formData.get('deckId')
    const image = formData.get('image')
    
    if (!deckId || !image) {
      return { error: 'Deck ID and image are required' }
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
    const response = await fetch(`${apiUrl}/api/decks/${deckId}/blob/upload`, {
      method: 'POST',
      headers: {
        'Cookie': (await cookies()).toString()
      },
      credentials: 'include',
      body: formData
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('Deck blob upload failed:', response.status, response.statusText, errorText)
      return { error: `Upload failed: ${response.status} ${response.statusText}` }
    }
    
    const result = await response.json()
    return { success: true, ...result }
  } catch (error) {
    console.error('Upload deck blob error:', error)
    return { error: error.message || 'Failed to upload deck image' }
  }
}

export async function uploadCardBlobAction(formData) {
  try {
    const user = await getUserFromToken()
    const deckId = formData.get('deckId')
    const cardName = formData.get('cardName')
    const image = formData.get('image')
    
    if (!deckId || !cardName || !image) {
      return { error: 'Deck ID, card name, and image are required' }
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
    const response = await fetch(`${apiUrl}/api/decks/${deckId}/card/${encodeURIComponent(cardName)}/blob/upload`, {
      method: 'POST',
      headers: {
        'Cookie': (await cookies()).toString()
      },
      credentials: 'include',
      body: formData
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('Card blob upload failed:', response.status, response.statusText, errorText)
      return { error: `Upload failed: ${response.status} ${response.statusText}` }
    }
    
    const result = await response.json()
    return { success: true, ...result }
  } catch (error) {
    console.error('Upload card blob error:', error)
    return { error: error.message || 'Failed to upload card image' }
  }
}

// Reading Actions
export async function getSingleReadingAction(readingId) {
  try {
    const user = await getUserFromToken()
    const cookieStore = await cookies()
    
    const response = await fetch(`${process.env.API_BASE_URL}/api/readings/${readingId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${cookieStore.get('token')?.value}`
      },
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch reading')
    }

    const data = await response.json()
    const reading = data.reading || data
    return { success: true, data: reading }
  } catch (error) {
    console.error('Get single reading error:', error)
    return { error: error.message || 'Failed to fetch reading' }
  }
}

export async function updateReadingAction(readingId, updateData) {
  try {
    const user = await getUserFromToken()
    const cookieStore = await cookies()

    const response = await fetch(`${process.env.API_BASE_URL}/api/readings/${readingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${cookieStore.get('token')?.value}`
      },
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to update reading')
    }

    const result = await response.json()
    return { success: true, data: result }
  } catch (error) {
    console.error('Update reading error:', error)
    return { error: error.message || 'Failed to update reading' }
  }
}

export async function exportReadingPDFAction(readingData) {
  try {
    const user = await getUserFromToken()
    const cookieStore = await cookies()

    const response = await fetch(`${process.env.API_BASE_URL}/export/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${cookieStore.get('token')?.value}`
      },
      body: JSON.stringify(readingData)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to export PDF')
    }

    // Return the blob data for client-side download
    const blob = await response.arrayBuffer()
    return { 
      success: true, 
      data: {
        blob: Buffer.from(blob).toString('base64'),
        contentType: response.headers.get('content-type') || 'application/pdf'
      }
    }
  } catch (error) {
    console.error('Export PDF error:', error)
    return { error: error.message || 'Failed to export PDF' }
  }
}

// Spread Actions
export async function createSpreadAction(spreadData) {
  try {
    const user = await getUserFromToken()
    const cookieStore = await cookies()

    const response = await fetch(`${process.env.API_BASE_URL}/spreads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${cookieStore.get('token')?.value}`
      },
      body: JSON.stringify(spreadData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to create spread')
    }

    const result = await response.json()
    return { success: true, data: result }
  } catch (error) {
    console.error('Create spread error:', error)
    return { error: error.message || 'Failed to create spread' }
  }
}

export async function uploadSpreadBlobAction(formData) {
  try {
    const user = await getUserFromToken()
    const cookieStore = await cookies()
    
    // Extract spreadId from formData
    const spreadId = formData.get('spreadId')
    if (!spreadId) {
      throw new Error('Spread ID is required')
    }

    const response = await fetch(`${process.env.API_BASE_URL}/api/spreads/${spreadId}/blob/upload`, {
      method: 'POST',
      headers: {
        'Cookie': `token=${cookieStore.get('token')?.value}`,
        'X-Vercel-Blob-Store': 'true'
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Upload failed')
    }
    
    const result = await response.json()
    return { success: true, data: result }
  } catch (error) {
    console.error('Upload spread blob error:', error)
    return { error: error.message || 'Failed to upload spread image' }
  }
}

// Querent Actions
export async function getQuerentsAction() {
  try {
    const user = await getUserFromToken()
    const cookieStore = await cookies()

    const response = await fetch(`${process.env.API_BASE_URL}/api/querents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${cookieStore.get('token')?.value}`
      }
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch querents')
    }

    const data = await response.json()
    const querents = Array.isArray(data) ? data : (Array.isArray(data?.querents) ? data.querents : [])
    return { success: true, data: querents }
  } catch (error) {
    console.error('Get querents error:', error)
    return { error: error.message || 'Failed to fetch querents' }
  }
}

// Reading List Actions
export async function getUserReadingsAction() {
  try {
    const user = await getUserFromToken()
    const cookieStore = await cookies()

    const response = await fetch(`${process.env.API_BASE_URL}/api/readings/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${cookieStore.get('token')?.value}`
      }
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch readings')
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get user readings error:', error)
    return { error: error.message || 'Failed to fetch readings' }
  }
}

// Tags Actions
export async function getTagsAction() {
  try {
    const user = await getUserFromToken()
    const cookieStore = await cookies()

    const response = await fetch(`${process.env.API_BASE_URL}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${cookieStore.get('token')?.value}`
      }
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch tags')
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get tags error:', error)
    return { error: error.message || 'Failed to fetch tags' }
  }
}

// Insights Actions
export async function getInsightsCountAction(params) {
  try {
    const user = await getUserFromToken()
    const cookieStore = await cookies()
    
    const queryString = new URLSearchParams(params).toString()

    const response = await fetch(`${process.env.API_BASE_URL}/api/insights/count?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${cookieStore.get('token')?.value}`
      }
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch insights count')
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get insights count error:', error)
    return { error: error.message || 'Failed to fetch insights count' }
  }
}

export async function getInsightsSuitsAction(params) {
  try {
    const user = await getUserFromToken()
    const cookieStore = await cookies()
    
    const queryString = new URLSearchParams(params).toString()

    const response = await fetch(`${process.env.API_BASE_URL}/api/insights/suits?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${cookieStore.get('token')?.value}`
      }
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch insights suits')
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get insights suits error:', error)
    return { error: error.message || 'Failed to fetch insights suits' }
  }
}

export async function getInsightsCardsAction(params) {
  try {
    const user = await getUserFromToken()
    const cookieStore = await cookies()
    
    const queryString = new URLSearchParams(params).toString()

    const response = await fetch(`${process.env.API_BASE_URL}/api/insights/cards?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${cookieStore.get('token')?.value}`
      }
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || 'Failed to fetch insights cards')
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get insights cards error:', error)
    return { error: error.message || 'Failed to fetch insights cards' }
  }
}

// Auth Verification Action
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

// Test Connection Action
export async function testConnectionAction() {
  try {
    const response = await fetch(`${process.env.API_BASE_URL}/test-conn`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json().catch(() => null)
    return { 
      success: true, 
      data: { 
        status: response.status, 
        ok: response.ok, 
        data 
      } 
    }
  } catch (error) {
    console.error('Test connection error:', error)
    return { error: error.message || 'Failed to test connection' }
  }
}