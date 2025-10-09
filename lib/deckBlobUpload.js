// Client-side deck blob upload utility
// Uses hierarchical folder structure: decks/{deckId}/{ownerUsername}/{cover|cards}/filename

/**
 * Upload a deck cover or card image to Vercel Blob with hierarchical structure
 * @param {string} deckId - The deck ID
 * @param {File} imageFile - The image file to upload
 * @param {string} ownerUsername - The owner's username for folder structure
 * @param {string} cardName - Optional: card name for card images, omit for deck cover
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function uploadDeckImageToBlob(deckId, imageFile, ownerUsername, cardName = null) {
  try {
    console.log('🔵 uploadDeckImageToBlob: Starting deck upload', {
      deckId,
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type,
      ownerUsername,
      cardName: cardName || 'cover'
    })
    
    if (!deckId) {
      throw new Error('Deck ID is required')
    }
    
    if (!ownerUsername) {
      throw new Error('Owner username is required for hierarchical storage')
    }
    
    if (!imageFile || imageFile.size === 0) {
      throw new Error('No image file provided')
    }
    
    // Create FormData for the upload
    const formData = new FormData()
    formData.append('file', imageFile)
    
    // Build URL with query parameters
    const cacheBuster = Date.now()
    let url = `/api/deck-upload-proxy?deckId=${deckId}&ownerUsername=${encodeURIComponent(ownerUsername)}&t=${cacheBuster}`
    
    if (cardName) {
      url += `&cardName=${encodeURIComponent(cardName)}`
    }
    
    console.log('🔵 uploadDeckImageToBlob: Using deck-specific proxy:', url)
    
    // Minimal headers
    const headers = {
      'x-deck-id': deckId,
      'x-owner-username': ownerUsername
    }
    
    if (cardName) {
      headers['x-card-name'] = cardName
    }
    
    console.log('🔵 uploadDeckImageToBlob: Making request', {
      url,
      headers,
      formDataKeys: Array.from(formData.keys())
    })
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: headers,
      credentials: 'same-origin',
      cache: 'no-store'
    })
    
    console.log('🔵 uploadDeckImageToBlob: Response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.text()
      } catch (e) {
        errorData = `HTTP ${response.status} ${response.statusText}`
      }
      console.error('🔴 Deck blob upload failed:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        url
      })
      throw new Error(`Upload failed (${response.status}): ${errorData || response.statusText}`)
    }

    const result = await response.json()
    console.log('🟢 uploadDeckImageToBlob: Upload successful!', {
      url: result.url,
      path: result.path,
      success: result.success
    })

    return {
      success: true,
      url: result.url || result.imageUrl || result.image,
      path: result.path,
      deckId: result.deckId,
      cardName: result.cardName
    }
  } catch (error) {
    console.error('❌ uploadDeckImageToBlob error:', error)
    return {
      success: false,
      error: error.message || 'Upload failed'
    }
  }
}

/**
 * Get the current user's username (needed for blob upload path)
 * This tries multiple sources to get the username
 * @returns {Promise<string|null>}
 */
export async function getCurrentUsername() {
  try {
    // 1. Try to get from localStorage first (fastest, set during login)
    const stored = localStorage.getItem('currentUser')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        if (user && user.username) {
          console.log('✅ Got username from localStorage:', user.username)
          return user.username
        }
      } catch (e) {
        console.warn('Failed to parse currentUser from localStorage', e)
      }
    }
    
    // 2. Try to get from user data stored by AuthWrapper
    const authUser = localStorage.getItem('user')
    if (authUser) {
      try {
        const user = JSON.parse(authUser)
        if (user && user.username) {
          console.log('✅ Got username from localStorage.user:', user.username)
          return user.username
        }
      } catch (e) {
        console.warn('Failed to parse user from localStorage', e)
      }
    }
    
    // 3. If we can't get username, we need to fetch it via server action
    console.warn('⚠️ Could not get username from localStorage')
    
    // Import and use the server action to get current user
    const { getCurrentUserAction } = await import('./actions/auth')
    const result = await getCurrentUserAction()
    
    if (result.success && result.user?.username) {
      console.log('✅ Got username from server action:', result.user.username)
      // Cache it for next time
      localStorage.setItem('currentUser', JSON.stringify(result.user))
      return result.user.username
    }
    
    console.error('❌ Could not determine username from any source')
    return null
  } catch (error) {
    console.error('❌ Failed to get current username:', error)
    return null
  }
}
