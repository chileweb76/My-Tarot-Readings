/**
 * Image URL service for migrating to Vercel Blob storage via backend APIs
 * Handles all image URL transformations and API calls
 */

import { apiFetch, isBlobUrl } from './api'

/**
 * Image types supported by the system
 */
export const IMAGE_TYPES = {
  CARD: 'card',
  DECK: 'deck',
  SPREAD: 'spread',
  READING: 'reading',
  PROFILE: 'profile',
  STATIC: 'static'
}

/**
 * Cache for image URLs to avoid redundant API calls
 */
const imageCache = new Map()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

/**
 * Clear expired cache entries
 */
function cleanCache() {
  const now = Date.now()
  for (const [key, entry] of imageCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      imageCache.delete(key)
    }
  }
}

/**
 * Get cached URL or null if expired/not found
 */
function getCachedUrl(key) {
  cleanCache()
  const entry = imageCache.get(key)
  return entry && (Date.now() - entry.timestamp < CACHE_TTL) ? entry.url : null
}

/**
 * Cache an image URL
 */
function cacheUrl(key, url) {
  imageCache.set(key, { url, timestamp: Date.now() })
}

/**
 * Get card image URL via backend API
 * @param {string} cardName - Name of the card
 * @param {string} deck - Deck identifier  
 * @returns {Promise<string|null>} - Blob URL or null
 */
export async function getCardImageUrl(cardName, deck = 'rider-waite') {
  if (!cardName) return null

  const cacheKey = `card:${deck}:${cardName}`
  const cached = getCachedUrl(cacheKey)
  if (cached) return cached

  try {
    const response = await apiFetch(`/api/card-image?name=${encodeURIComponent(cardName)}&deck=${encodeURIComponent(deck)}`)
    
    if (!response.ok) {
      console.warn(`Card image API failed for ${cardName}:`, response.status)
      return null
    }

    const data = await response.json()
    const url = data.imageUrl || data.url || null

    if (url) {
      cacheUrl(cacheKey, url)
    }

    return url
  } catch (error) {
    console.error('Failed to fetch card image URL:', error)
    return null
  }
}

/**
 * Get deck cover image URL via backend API
 * @param {string} deckId - Deck identifier
 * @returns {Promise<string|null>} - Blob URL or null
 */
export async function getDeckImageUrl(deckId) {
  if (!deckId) return null

  const cacheKey = `deck:${deckId}`
  const cached = getCachedUrl(cacheKey)
  if (cached) return cached

  try {
    const response = await apiFetch(`/api/decks/${deckId}`)
    
    if (!response.ok) {
      console.warn(`Deck API failed for ${deckId}:`, response.status)
      return null
    }

    const data = await response.json()
    const url = data.image || data.deck?.image || null

    if (url) {
      cacheUrl(cacheKey, url)
    }

    return url
  } catch (error) {
    console.error('Failed to fetch deck image URL:', error)
    return null
  }
}

/**
 * Get spread image URL via backend API
 * @param {string} spreadId - Spread identifier
 * @returns {Promise<string|null>} - Blob URL or null
 */
export async function getSpreadImageUrl(spreadId) {
  if (!spreadId) return null

  const cacheKey = `spread:${spreadId}`
  const cached = getCachedUrl(cacheKey)
  if (cached) return cached

  try {
    const response = await apiFetch(`/api/spreads/${spreadId}`)
    
    if (!response.ok) {
      console.warn(`Spread API failed for ${spreadId}:`, response.status)
      return null
    }

    const data = await response.json()
    const url = data.image || data.spread?.image || null

    if (url) {
      cacheUrl(cacheKey, url)
    }

    return url
  } catch (error) {
    console.error('Failed to fetch spread image URL:', error)
    return null
  }
}

/**
 * Get reading image URL via backend API
 * @param {string} readingId - Reading identifier
 * @returns {Promise<string|null>} - Blob URL or null
 */
export async function getReadingImageUrl(readingId) {
  if (!readingId) return null

  const cacheKey = `reading:${readingId}`
  const cached = getCachedUrl(cacheKey)
  if (cached) return cached

  try {
    const response = await apiFetch(`/api/readings/${readingId}`)
    
    if (!response.ok) {
      console.warn(`Reading API failed for ${readingId}:`, response.status)
      return null
    }

    const data = await response.json()
    const url = data.image || data.reading?.image || null

    if (url) {
      cacheUrl(cacheKey, url)
    }

    return url
  } catch (error) {
    console.error('Failed to fetch reading image URL:', error)
    return null
  }
}

/**
 * Get user profile image URL via backend API
 * @param {string} userId - User identifier
 * @param {string} size - Size variant ('full', 'small', 'thumb')
 * @returns {Promise<string|null>} - Blob URL or null
 */
export async function getProfileImageUrl(userId, size = 'full') {
  if (!userId) return null

  const cacheKey = `profile:${userId}:${size}`
  const cached = getCachedUrl(cacheKey)
  if (cached) return cached

  try {
    const response = await apiFetch(`/api/auth/profile`)
    
    if (!response.ok) {
      console.warn(`Profile API failed for ${userId}:`, response.status)
      return null
    }

    const data = await response.json()
    let url = null

    switch (size) {
      case 'small':
        url = data.profilePictureSmall || data.user?.profilePictureSmall
        break
      case 'thumb':
        url = data.profilePictureThumb || data.user?.profilePictureThumb
        break
      default:
        url = data.profilePicture || data.user?.profilePicture
    }

    if (url) {
      cacheUrl(cacheKey, url)
    }

    return url
  } catch (error) {
    console.error('Failed to fetch profile image URL:', error)
    return null
  }
}

/**
 * Transform any image URL to use backend API if needed
 * @param {string} url - Original image URL
 * @param {string} type - Image type (card, deck, spread, etc.)
 * @param {Object} context - Additional context (cardName, deckId, etc.)
 * @returns {Promise<string>} - Transformed URL
 */
export async function transformImageUrl(url, type = IMAGE_TYPES.STATIC, context = {}) {
  if (!url || typeof url !== 'string') return url

  // If already a blob URL, return as-is
  if (isBlobUrl(url)) {
    return url
  }

  // If blob: or data: URL, return as-is
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url
  }

  // If absolute HTTP/HTTPS URL that's not a local path, return as-is
  if (url.match(/^https?:\/\//)) {
    return url
  }

  // Transform based on image type
  switch (type) {
    case IMAGE_TYPES.CARD:
      if (context.cardName && context.deck) {
        const blobUrl = await getCardImageUrl(context.cardName, context.deck)
        return blobUrl || url // Fallback to original if API fails
      }
      break

    case IMAGE_TYPES.DECK:
      if (context.deckId) {
        const blobUrl = await getDeckImageUrl(context.deckId)
        return blobUrl || url
      }
      break

    case IMAGE_TYPES.SPREAD:
      if (context.spreadId) {
        const blobUrl = await getSpreadImageUrl(context.spreadId)
        return blobUrl || url
      }
      break

    case IMAGE_TYPES.READING:
      if (context.readingId) {
        const blobUrl = await getReadingImageUrl(context.readingId)
        return blobUrl || url
      }
      break

    case IMAGE_TYPES.PROFILE:
      if (context.userId) {
        const blobUrl = await getProfileImageUrl(context.userId, context.size)
        return blobUrl || url
      }
      break

    case IMAGE_TYPES.STATIC:
    default:
      // For static assets, keep original path
      return url
  }

  return url
}

/**
 * Preload image URLs for better performance
 * @param {Array} urls - Array of {url, type, context} objects
 * @returns {Promise<Array>} - Array of transformed URLs
 */
export async function preloadImageUrls(urls) {
  const promises = urls.map(({ url, type, context }) => 
    transformImageUrl(url, type, context)
  )
  
  return Promise.all(promises)
}

/**
 * Clear the image URL cache
 */
export function clearImageCache() {
  imageCache.clear()
}

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
export function getCacheStats() {
  cleanCache()
  return {
    size: imageCache.size,
    entries: Array.from(imageCache.keys())
  }
}