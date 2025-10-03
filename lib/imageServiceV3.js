/**
 * Image Service V3 - Server Actions Version
 * Migrated from apiFetch to Server Actions for better security and performance
 */

// Import Server Actions instead of apiFetch
import {
  getCardImageAction,
  getDeckImageAction,
  getReadingImageAction,
  getQuerentImageAction
} from './actions'

// Import the blob URL mapping if it exists
let blobMapping = null
try {
  blobMapping = require('../blob-url-mapping.json')
} catch (e) {
  // No blob URL mapping found, using Server Actions only
}

// Cache for responses (15 minute TTL)
const cache = new Map()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

// Image type constants
export const IMAGE_TYPES = {
  CARD: 'card',
  DECK: 'deck', 
  READING: 'reading',
  QUERENT: 'querent',
  SPREAD: 'spread'
}

// Helper to check if URL needs transformation
const needsTransformation = (url) => {
  if (!url || typeof url !== 'string') return false
  return url.startsWith('/') || url.includes('localhost') || url.includes('vercel.app')
}

// Enhanced function to get card image URL using Server Actions
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
          const value = parts[0].trim()
          const suit = parts[1].trim()
          
          // Standard format: "ace_of_cups.jpg"
          paths.push(`${value.replace(/\s+/g, '_')}_of_${suit.replace(/\s+/g, '_')}.jpg`)
          // Alternative format: "ace-of-cups.jpg"  
          paths.push(`${value.replace(/\s+/g, '-')}-of-${suit.replace(/\s+/g, '-')}.jpg`)
          // Capitalized format
          paths.push(`${value.charAt(0).toUpperCase() + value.slice(1).replace(/\s+/g, '_')}_of_${suit.charAt(0).toUpperCase() + suit.slice(1).replace(/\s+/g, '_')}.jpg`)
        }
      } else {
        // Major arcana - just normalize the name
        const normalizedName = lowerName.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        paths.push(`${normalizedName}.jpg`)
        paths.push(`${lowerName.replace(/\s+/g, '-')}.jpg`)
        paths.push(`${lowerName.charAt(0).toUpperCase() + lowerName.slice(1).replace(/\s+/g, '_')}.jpg`)
      }
      
      return paths
    }

    // Try to find the card in blob mapping
    const cardPaths = generateTarotPaths(cardName)
    for (const path of cardPaths) {
      if (blobMapping.cards[path]) {
        return blobMapping.cards[path]
      }
    }
  }

  // Fallback to Server Action
  try {
    const cacheKey = `card_${cardName}_${deckName}_${JSON.stringify(options)}`
    
    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data
    }

    // Use Server Action instead of apiFetch
    const result = await getCardImageAction(cardName, deckName)
    if (result.success) {
      // Cache the result
      cache.set(cacheKey, {
        data: result.imageUrl,
        timestamp: Date.now()
      })
      return result.imageUrl
    }
    
    return null
  } catch (error) {
    console.error('Error getting card image:', error)
    return null
  }
}

// Enhanced function to get deck image URL using Server Actions
export const getDeckImageUrl = async (deckId, options = {}) => {
  if (!deckId) return null
  
  try {
    const cacheKey = `deck_${deckId}_${JSON.stringify(options)}`
    
    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data
    }

    // Use Server Action
    const result = await getDeckImageAction(deckId)
    if (result.success) {
      // Cache the result
      cache.set(cacheKey, {
        data: result.imageUrl,
        timestamp: Date.now()
      })
      return result.imageUrl
    }
    
    return null
  } catch (error) {
    console.error('Error getting deck image:', error)
    return null
  }
}

// Function to get spread image URL (preserved from original)
export const getSpreadImageUrl = async (spreadId, options = {}) => {
  if (!spreadId) return null

  // Prefer blob mapping when available
  if (blobMapping) {
    const spreads = blobMapping.spreads || {}
    const spreadMappings = blobMapping.spreadMappings || {}

    // Helper: slugify a display name into canonical spread filename
    const slugify = (name) => {
      if (!name || typeof name !== 'string') return ''
      return name
        .toString()
        .trim()
        .toLowerCase()
        // Replace spaces and underscores with hyphens
        .replace(/[\s_]+/g, '-')
        // Remove characters that are not alphanumeric or hyphen
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    }

    const candidates = []

    // direct key (could be '/images/spreads/...', '/spreads/...', name, or even id)
    candidates.push(spreadId)

    // If spreadId looks like an id that maps to a display name, try that name
    if (spreadMappings[spreadId]) {
      candidates.push(spreadMappings[spreadId])
    }

    // If it's a readable name (contains spaces or letters), try the name as-is
    if (typeof spreadId === 'string' && /[a-zA-Z\s]/.test(spreadId)) {
      candidates.push(spreadId)
    }

    // slug variants
    const slug = slugify(spreadMappings[spreadId] || spreadId)
    if (slug) {
      candidates.push(`/images/spreads/${slug}.png`)
      candidates.push(`/spreads/${slug}.png`)
      candidates.push(slug + '.png')
      candidates.push(slug)
    }

    // Also try a capitalized/display-title variant (some mappings use title keys)
    const titleCase = (s) => {
      if (!s || typeof s !== 'string') return s
      return s
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }

    const maybeTitle = titleCase(spreadMappings[spreadId] || spreadId)
    if (maybeTitle) candidates.push(maybeTitle)

    // Deduplicate while preserving order
    const seen = new Set()
    const uniqueCandidates = candidates.filter((c) => {
      if (c == null) return false
      if (seen.has(c)) return false
      seen.add(c)
      return true
    })

    // Try each candidate against the spreads mapping
    for (const key of uniqueCandidates) {
      if (spreads[key]) {
        return spreads[key]
      }
    }
  }

  // If we reach here, no mapping found. Spreads currently don't have Server Action fallback.
  // Return null so callers can gracefully fallback.
  console.warn(`getSpreadImageUrl: no blob mapping found for spreadId=${String(spreadId)}`)
  return null
}

// Enhanced function to get reading image URL using Server Actions  
export const getReadingImageUrl = async (readingId, options = {}) => {
  if (!readingId) return null
  
  try {
    const cacheKey = `reading_${readingId}_${JSON.stringify(options)}`
    
    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data
    }

    // Use Server Action
    const result = await getReadingImageAction(readingId)
    if (result.success) {
      // Cache the result  
      cache.set(cacheKey, {
        data: result.imageUrl,
        timestamp: Date.now()
      })
      return result.imageUrl
    }
    
    return null
  } catch (error) {
    console.error('Error getting reading image:', error)
    return null
  }
}

// Enhanced function to get querent image URL using Server Actions
export const getQuerentImageUrl = async (querentId, options = {}) => {
  if (!querentId) return null
  
  try {
    const cacheKey = `querent_${querentId}_${JSON.stringify(options)}`
    
    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data
    }

    // Use Server Action
    const result = await getQuerentImageAction(querentId)
    if (result.success) {
      // Cache the result
      cache.set(cacheKey, {
        data: result.imageUrl,
        timestamp: Date.now()
      })
      return result.imageUrl
    }
    
    return null
  } catch (error) {
    console.error('Error getting querent image:', error)
    return null
  }
}

// Generic image URL function (preserved API)
export const getImageUrl = async (type, id, options = {}) => {
  switch (type) {
    case IMAGE_TYPES.CARD:
      const { cardName, deckName } = options
      return getCardImageUrl(cardName || id, deckName)
    case IMAGE_TYPES.DECK:
      return getDeckImageUrl(id, options)
    case IMAGE_TYPES.READING:
      return getReadingImageUrl(id, options)
    case IMAGE_TYPES.QUERENT:
      return getQuerentImageUrl(id, options)
    case IMAGE_TYPES.SPREAD:
      return getSpreadImageUrl(id, options)
    default:
      return null
  }
}

// Batch loading function for multiple images
export const loadImages = async (requests) => {
  if (!Array.isArray(requests)) return []
  
  const promises = requests.map(async (request) => {
    try {
      const url = await getImageUrl(request.type, request.id, request.options)
      return { ...request, url, success: !!url }
    } catch (error) {
      return { ...request, url: null, success: false, error: error.message }
    }
  })
  
  return Promise.all(promises)
}

// Cache management
export const clearImageCache = () => {
  cache.clear()
}

export const getCacheStats = () => {
  return {
    size: cache.size,
    entries: Array.from(cache.keys())
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
    let blobUrl = blobMapping.spreads?.[originalUrl] || blobMapping.cards?.[originalUrl]
    if (blobUrl) {
      return blobUrl
    }
    
    // If no direct match, try alternative extensions for card images
    if (originalUrl.startsWith('/images/rider-waite-tarot/')) {
      const basePath = originalUrl.replace(/\.[^/.]+$/, '') // Remove extension
      const possibleExtensions = ['.jpg', '.png']
      
      for (const ext of possibleExtensions) {
        const altPath = basePath + ext
        blobUrl = blobMapping.cards?.[altPath]
        if (blobUrl) {
          return blobUrl
        }
      }
    }
  }
  
  // Transform based on image type using Server Actions
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

// Utility to preload images
export const preloadImage = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL provided'))
      return
    }
    
    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}