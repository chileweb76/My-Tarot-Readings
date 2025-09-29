"use server"

import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '../mongo'
import bcrypt from 'bcryptjs'
import { put } from '@vercel/blob'
import { getUserFromToken } from './utils'

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

export async function requestAccountDeletionAction() {
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    
    // Set deletion request flag
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          deletionRequested: true,
          deletionRequestedAt: new Date()
        }
      }
    )
    
    revalidatePath('/settings')
    return { success: true, message: 'Account deletion requested. You have 30 days to cancel.' }
  } catch (error) {
    console.error('Request account deletion error:', error)
    return { error: error.message || 'Failed to request account deletion' }
  }
}

export async function cancelAccountDeletionAction() {
  try {
    const user = await getUserFromToken()
    const { db } = await connectToDatabase()
    
    // Remove deletion request flag
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $unset: { 
          deletionRequested: 1,
          deletionRequestedAt: 1
        }
      }
    )
    
    revalidatePath('/settings')
    return { success: true, message: 'Account deletion cancelled.' }
  } catch (error) {
    console.error('Cancel account deletion error:', error)
    return { error: error.message || 'Failed to cancel account deletion' }
  }
}