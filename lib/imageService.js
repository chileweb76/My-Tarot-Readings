/**
 * Enhanced image service with Vercel Blob URL mapping support
 * This service now supports both backend API calls and direct blob URLs for migrated images
 */

// Import the blob URL mapping if it exists
let blobMapping = null
try {
  blobMapping = require('../blob-url-mapping.json')
  // Report both raw key counts and unique target URL counts to avoid confusion
  const spreadKeys = Object.keys(blobMapping.spreads || {})
  const cardKeys = Object.keys(blobMapping.cards || {})
  const uniqueSpreadUrls = new Set(Object.values(blobMapping.spreads || {})).size
  const uniqueCardUrls = new Set(Object.values(blobMapping.cards || {})).size
  const mappingCount = blobMapping.spreadMappings ? Object.keys(blobMapping.spreadMappings).length : 0
  console.log(`📄 Loaded blob URL mapping — raw keys: ${spreadKeys.length} spread keys (${uniqueSpreadUrls} unique URLs), ${cardKeys.length} card keys (${uniqueCardUrls} unique URLs); spreadMappings: ${mappingCount}`)
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
    // Helper to generate proper tarot card paths
    const generateTarotPaths = (name) => {
      const paths = []
      const lowerName = name.toLowerCase().trim()
      
      // Check if it's a minor arcana card (contains " of ")
      if (lowerName.includes(' of ')) {
        const parts = lowerName.split(' of ')
        if (parts.length === 2) {
          const cardPart = parts[0].trim()
          const suitPart = parts[1].trim()
          
          // Normalize suit name
          let normalizedSuit = suitPart
          if (suitPart.includes('wand')) normalizedSuit = 'wands'
          else if (suitPart.includes('cup')) normalizedSuit = 'cups'
          else if (suitPart.includes('sword')) normalizedSuit = 'swords'
          else if (suitPart.includes('pentacle') || suitPart.includes('coin')) normalizedSuit = 'pentacles'
          
          // Normalize card name to number
          const cardMappings = {
            'ace': 'ace', 'one': 'ace',
            'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6',
            'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
            'page': 'page', 'knight': 'knight', 'queen': 'queen', 'king': 'king'
          }
          
          const normalizedCard = cardMappings[cardPart] || cardPart
          
          // Generate minor arcana path
          paths.push(`/images/rider-waite-tarot/minor_arcana_${normalizedSuit}_${normalizedCard}.png`)
          paths.push(`/images/rider-waite-tarot/minor_arcana_${normalizedSuit}_${normalizedCard}.jpg`)
        }
      } else {
        // Major arcana - normalize the name
        let majorName = lowerName.replace(/^the\s+/i, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        
        // Handle special cases
        if (majorName === 'wheel_of_fortune') majorName = 'fortune'
        if (majorName === 'hanged_man') majorName = 'hanged'
        if (majorName === 'high_priestess') majorName = 'priestess'
        
        paths.push(`/images/rider-waite-tarot/major_arcana_${majorName}.png`)
        paths.push(`/images/rider-waite-tarot/major_arcana_${majorName}.jpg`)
      }
      
      // Also try simple transformations as fallback
      paths.push(`/images/rider-waite-tarot/${lowerName.replace(/\s+/g, '_')}.png`)
      paths.push(`/images/rider-waite-tarot/${lowerName.replace(/\s+/g, '-')}.jpg`)
      paths.push(`/images/rider-waite-tarot/${lowerName.replace(/\s+/g, '_')}.jpg`)
      paths.push(`/images/rider-waite-tarot/${lowerName.replace(/\s+/g, '-')}.png`)
      
      return paths
    }
    
    const possiblePaths = generateTarotPaths(cardName)
    
    for (const staticPath of possiblePaths) {
      const blobUrl = blobMapping.cards[staticPath]
      if (blobUrl) {
        console.log(`🎯 Found blob URL for card ${cardName} via ${staticPath}:`, blobUrl)
        
        // Test if the blob URL is accessible
        try {
          const testResponse = await fetch(blobUrl, { method: 'HEAD' })
          if (testResponse.ok) {
            console.log(`✅ Blob URL verified for ${cardName}:`, blobUrl)
            return blobUrl
          } else {
            console.warn(`❌ Blob URL not accessible (${testResponse.status}) for ${cardName}, falling back to API`)
          }
        } catch (e) {
          console.warn(`❌ Blob URL test failed for ${cardName}, falling back to API:`, e.message)
        }
      }
    }
    
    // Special case for "cover" - prefer the jpg cover
    if (cardName.toLowerCase() === 'cover') {
      const coverJpgUrl = blobMapping.cards['/images/rider-waite-tarot/cover.jpg']
      if (coverJpgUrl) {
        console.log(`🎯 Using blob URL for cover (jpg):`, coverJpgUrl)
        return coverJpgUrl
      }
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
    
  // Server implements decks via query params (e.g. /decks?id=...), so call that
  const query = new URLSearchParams({ id: deckId, ...options })
  const response = await apiFetch(`/decks?${query}`)
    if (!response.ok) {
      console.warn(`Failed to fetch deck image for ${deckId}:`, response.status)
      return null
    }
    
    const data = await response.json()
    // The decks endpoint returns either a single deck object (when id is provided)
    // or an array of decks. Normalize to pick the correct deck and its image field.
    let deckObj = null
    if (Array.isArray(data)) {
      deckObj = data.find(d => d._id === deckId || String(d._id) === String(deckId)) || data[0]
    } else {
      deckObj = data
    }
    const imageUrl = deckObj ? (deckObj.image || deckObj.imageUrl || deckObj.url) : null
    
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
    // Server exposes spreads via query params (e.g. /spreads?id=...) or returns
    // the full list at /spreads. We'll prefer the id query for IDs, otherwise
    // fetch the list and filter client-side by spread name.
    let response
    if (isId) {
      const q = new URLSearchParams({ id: spreadNameOrId, ...options })
      response = await apiFetch(`/spreads?${q}`)
    } else {
      // Fetch all spreads and filter by name (case-insensitive)
      response = await apiFetch(`/spreads`)
    }
    if (!response.ok) {
      console.warn(`Failed to fetch spread image for ${spreadNameOrId}:`, response.status)
      return null
    }
    const data = await response.json()

    let imageUrl = null
    if (Array.isArray(data)) {
      // If we fetched the list, try to find by id or by name
      const found = data.find(s => {
        if (!s) return false
        const idMatch = String(s._id) === String(spreadNameOrId)
        const nameMatch = (s.spread || '').toLowerCase() === String(spreadNameOrId).toLowerCase()
        return idMatch || nameMatch
      })
      if (found) imageUrl = found.image || found.imageUrl || found.url
    } else if (data && typeof data === 'object') {
      imageUrl = data.image || data.imageUrl || data.url
    }
    
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
    // Direct lookup first
    let blobUrl = blobMapping.spreads[originalUrl] || blobMapping.cards[originalUrl]
    if (blobUrl) {
      console.log(`🎯 Direct blob mapping found for ${originalUrl}:`, blobUrl)
      return blobUrl
    }
    
    // If no direct match, try alternative extensions for card images
    if (originalUrl.startsWith('/images/rider-waite-tarot/')) {
      const basePath = originalUrl.replace(/\.[^/.]+$/, '') // Remove extension
  const possibleExtensions = ['.jpg', '.png']
      
      for (const ext of possibleExtensions) {
        const altPath = basePath + ext
        blobUrl = blobMapping.cards[altPath]
        if (blobUrl) {
          console.log(`🎯 Alternative extension blob mapping found: ${originalUrl} -> ${altPath}:`, blobUrl)
          return blobUrl
        }
      }
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