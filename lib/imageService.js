/**
 * Enhanced image service with Vercel Blob URL mapping support
 * This service now supports both backend API calls and direct blob URLs for migrated images
 */

// Import the blob URL mapping if it exists
let blobMapping = null
try {
  blobMapping = require('../blob-url-mapping.json')
  console.log('📄 Loaded blob URL mapping with', Object.keys(blobMapping.spreads || {}).length, 'spread URLs and', Object.keys(blobMapping.cards || {}).length, 'card URLs')
} catch (e) {
  console.log('ℹ️  No blob URL mapping found, using API endpoints only')
}

// Cache for API responses (15 minute TTL)
const cache = new Map()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

// Image type constants for API routing
export const IMAGE_TYPES = {
  CARD: 'card',
  DECK: 'deck', 
  READING: 'reading',
  QUERENT: 'querent',
  SPREAD: 'spread'
}

// Helper to check if URL is a blob URL that needs backend transformation
const needsTransformation = (url) => {
  if (!url || typeof url !== 'string') return false
  return url.startsWith('/') || url.includes('localhost') || url.includes('vercel.app')
}

// Enhanced function to get card image URL with blob mapping fallback
export const getCardImageUrl = async (cardName, deckName = 'rider-waite', options = {}) => {
  if (!cardName) return null
  
  // First, check if we have a direct blob URL mapping for this card
  if (blobMapping && blobMapping.cards) {
    const staticPath = `/images/rider-waite-tarot/${cardName.toLowerCase().replace(/\s+/g, '-')}.jpg`
    const blobUrl = blobMapping.cards[staticPath]
    if (blobUrl) {
      console.log(`🎯 Using blob URL for card ${cardName}:`, blobUrl)
      return blobUrl
    }
  }
  
  // Fallback to API call
  const cacheKey = `card-${cardName}-${deckName}`
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.url
  }
  
  try {
    const { apiFetch } = await import('./api')
    const params = new URLSearchParams({ 
      cardName, 
      deckName: deckName || 'rider-waite',
      ...options 
    })
    
    const response = await apiFetch(`/card-image?${params}`)
    if (!response.ok) {
      console.warn(`Failed to fetch card image for ${cardName}:`, response.status)
      return null
    }
    
    const data = await response.json()
    const imageUrl = data.imageUrl || data.url
    
    if (imageUrl) {
      cache.set(cacheKey, { url: imageUrl, timestamp: Date.now() })
    }
    
    return imageUrl
  } catch (error) {
    console.error('Error fetching card image URL:', error)
    return null
  }
}

// Enhanced function to get deck image URL 
export const getDeckImageUrl = async (deckId, options = {}) => {
  if (!deckId) return null
  
  const cacheKey = `deck-${deckId}`
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.url
  }
  
  try {
    const { apiFetch } = await import('./api')
    const params = new URLSearchParams({ deckId, ...options })
    
    const response = await apiFetch(`/decks/${deckId}/image?${params}`)
    if (!response.ok) {
      console.warn(`Failed to fetch deck image for ${deckId}:`, response.status)
      return null
    }
    
    const data = await response.json()
    const imageUrl = data.imageUrl || data.url || data.image
    
    if (imageUrl) {
      cache.set(cacheKey, { url: imageUrl, timestamp: Date.now() })
    }
    
    return imageUrl
  } catch (error) {
    console.error('Error fetching deck image URL:', error)
    return null
  }
}

// Enhanced function to get spread image URL with blob mapping
export const getSpreadImageUrl = async (spreadNameOrId, options = {}) => {
  if (!spreadNameOrId) return null
  
  // First, check if we have a direct blob URL mapping for this spread
  if (blobMapping && blobMapping.spreads) {
    // Try direct lookup by name or ID
    let blobUrl = blobMapping.spreads[spreadNameOrId]
    if (blobUrl) {
      console.log(`🎯 Using blob URL for spread ${spreadNameOrId}:`, blobUrl)
      return blobUrl
    }
    
    // Try common static paths
    const staticPaths = [
      `/images/spreads/${spreadNameOrId.toLowerCase().replace(/\s+/g, '-')}.jpg`,
      `/images/spreads/${spreadNameOrId.toLowerCase().replace(/\s+/g, '-')}.png`,
      `/images/spreads/${spreadNameOrId.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`,
      `/images/spreads/${spreadNameOrId.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`
    ]
    
    for (const staticPath of staticPaths) {
      blobUrl = blobMapping.spreads[staticPath]
      if (blobUrl) {
        console.log(`🎯 Using blob URL for spread ${spreadNameOrId} via ${staticPath}:`, blobUrl)
        return blobUrl
      }
    }
    
    // If it's an ID, try to get the name from spreadMappings and search again
    if (blobMapping.spreadMappings && blobMapping.spreadMappings[spreadNameOrId]) {
      const spreadName = blobMapping.spreadMappings[spreadNameOrId]
      blobUrl = blobMapping.spreads[spreadName]
      if (blobUrl) {
        console.log(`🎯 Using blob URL for spread ID ${spreadNameOrId} -> ${spreadName}:`, blobUrl)
        return blobUrl
      }
    }
  }
  
  // Fallback to API call
  const cacheKey = `spread-${spreadNameOrId}`
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.url
  }
  
  try {
    const { apiFetch } = await import('./api')
    
    // Determine if we should search by ID or name
    const isId = /^[0-9a-fA-F]{24}$/.test(spreadNameOrId)
    const endpoint = isId ? `/spreads/${spreadNameOrId}` : `/spreads/image`
    const params = isId ? '' : `?${new URLSearchParams({ spreadName: spreadNameOrId, ...options })}`
    
    const response = await apiFetch(`${endpoint}${params}`)
    if (!response.ok) {
      console.warn(`Failed to fetch spread image for ${spreadNameOrId}:`, response.status)
      return null
    }
    
    const data = await response.json()
    const imageUrl = data.imageUrl || data.url || data.image
    
    if (imageUrl) {
      cache.set(cacheKey, { url: imageUrl, timestamp: Date.now() })
    }
    
    return imageUrl
  } catch (error) {
    console.error('Error fetching spread image URL:', error)
    return null
  }
}

// Function to get reading image URL
export const getReadingImageUrl = async (readingId, options = {}) => {
  if (!readingId) return null
  
  const cacheKey = `reading-${readingId}`
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.url
  }
  
  try {
    const { apiFetch } = await import('./api')
    const params = new URLSearchParams({ readingId, ...options })
    
    const response = await apiFetch(`/readings/${readingId}/image?${params}`)
    if (!response.ok) {
      console.warn(`Failed to fetch reading image for ${readingId}:`, response.status)
      return null
    }
    
    const data = await response.json()
    const imageUrl = data.imageUrl || data.url || data.image
    
    if (imageUrl) {
      cache.set(cacheKey, { url: imageUrl, timestamp: Date.now() })
    }
    
    return imageUrl
  } catch (error) {
    console.error('Error fetching reading image URL:', error)
    return null
  }
}

// Function to get querent image URL
export const getQuerentImageUrl = async (querentId, options = {}) => {
  if (!querentId) return null
  
  const cacheKey = `querent-${querentId}`
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.url
  }
  
  try {
    const { apiFetch } = await import('./api')
    const params = new URLSearchParams({ querentId, ...options })
    
    const response = await apiFetch(`/querents/${querentId}/image?${params}`)
    if (!response.ok) {
      console.warn(`Failed to fetch querent image for ${querentId}:`, response.status)
      return null
    }
    
    const data = await response.json()
    const imageUrl = data.imageUrl || data.url || data.image
    
    if (imageUrl) {
      cache.set(cacheKey, { url: imageUrl, timestamp: Date.now() })
    }
    
    return imageUrl
  } catch (error) {
    console.error('Error fetching querent image URL:', error)
    return null
  }
}

// Generic image URL transformer
export const transformImageUrl = async (originalUrl, imageType, context = {}) => {
  if (!originalUrl || typeof originalUrl !== 'string') return originalUrl
  
  // If it's already a full HTTP URL (including blob URLs), return as-is
  if (originalUrl.startsWith('http') || originalUrl.startsWith('blob:') || originalUrl.startsWith('data:')) {
    return originalUrl
  }
  
  // Check blob mapping first for static paths
  if (blobMapping) {
    const blobUrl = blobMapping.spreads[originalUrl] || blobMapping.cards[originalUrl]
    if (blobUrl) {
      return blobUrl
    }
  }
  
  // Transform based on image type
  switch (imageType) {
    case IMAGE_TYPES.CARD:
      return await getCardImageUrl(context.cardName, context.deckName, context)
    case IMAGE_TYPES.DECK:
      return await getDeckImageUrl(context.deckId, context)
    case IMAGE_TYPES.READING:
      return await getReadingImageUrl(context.readingId, context)
    case IMAGE_TYPES.QUERENT:
      return await getQuerentImageUrl(context.querentId, context)
    case IMAGE_TYPES.SPREAD:
      return await getSpreadImageUrl(context.spreadName, context)
    default:
      console.warn('Unknown image type:', imageType)
      return originalUrl
  }
}

// Cache management functions
export const clearImageCache = (pattern) => {
  if (!pattern) {
    cache.clear()
    console.log('🧹 Cleared all image cache')
    return
  }
  
  for (const [key] of cache) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
  console.log(`🧹 Cleared image cache for pattern: ${pattern}`)
}

export const getCacheStats = () => ({
  size: cache.size,
  keys: Array.from(cache.keys()),
  blobMappingLoaded: !!blobMapping,
  blobSpreadsCount: blobMapping?.spreads ? Object.keys(blobMapping.spreads).length : 0,
  blobCardsCount: blobMapping?.cards ? Object.keys(blobMapping.cards).length : 0
})

// Export blob mapping for direct access if needed
export const getBlobMapping = () => blobMapping