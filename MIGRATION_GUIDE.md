# Image Migration to Vercel Blob with Backend APIs

## Overview

This migration centralizes all image handling through backend API calls and Vercel Blob storage, providing a consistent and performant image delivery system.

## New Architecture

### 1. Image Service (`lib/imageService.js`)
- **Purpose**: Central service for all image URL transformations
- **Features**: 
  - Automatic caching (15min TTL)
  - Backend API integration
  - Support for multiple image types
  - Fallback handling

### 2. Enhanced SmartImage (`components/SmartImageV2.jsx`)
- **Purpose**: Drop-in replacement for SmartImage with automatic URL transformation
- **New Props**:
  - `imageType`: Specifies the type of image (card, deck, spread, reading, profile)
  - `imageContext`: Additional context for API calls (cardName, deckId, etc.)
  - `enableTransform`: Toggle for transformation (default: true)

## Image Types Supported

```javascript
export const IMAGE_TYPES = {
  CARD: 'card',           // Tarot card images
  DECK: 'deck',           // Deck cover images  
  SPREAD: 'spread',       // Spread layout images
  READING: 'reading',     // Reading photo uploads
  PROFILE: 'profile',     // User profile pictures
  STATIC: 'static'        // Static assets (no transformation)
}
```

## API Endpoints Used

- `GET /api/card-image?name={cardName}&deck={deckId}` - Card images
- `GET /api/decks/{deckId}` - Deck cover images
- `GET /api/spreads/{spreadId}` - Spread images
- `GET /api/readings/{readingId}` - Reading images
- `GET /api/auth/profile` - Profile images

## Usage Examples

### Basic Card Image
```jsx
import SmartImageV2 from '../components/SmartImageV2'
import { IMAGE_TYPES } from '../lib/imageService'

<SmartImageV2
  src={cardImage}
  alt="Card"
  width={220}
  height={320}
  imageType={IMAGE_TYPES.CARD}
  imageContext={{ 
    cardName: "The Fool",
    deck: "rider-waite"
  }}
/>
```

### Deck Cover Image
```jsx
<SmartImageV2
  src={deckImage}
  alt="Deck cover"
  width={200}
  height={280}
  imageType={IMAGE_TYPES.DECK}
  imageContext={{ deckId: "deck-123" }}
/>
```

### Reading Image
```jsx
<SmartImageV2
  src={readingImage}
  alt="Reading photo"
  width={300}
  height={200}
  imageType={IMAGE_TYPES.READING}
  imageContext={{ readingId: "reading-456" }}
/>
```

## Performance Benefits

### Caching Strategy
- **Client-side cache**: 15-minute TTL reduces redundant API calls
- **Vercel Blob CDN**: Global edge caching for fast delivery
- **Lazy loading**: Images transform only when needed

### Network Optimization
- **Batch preloading**: `preloadImageUrls()` for bulk operations
- **Smart fallbacks**: Graceful degradation on API failures
- **Blob optimization**: Direct blob URLs bypass additional redirects

## Migration Checklist

### Files Updated ✅
- [x] `lib/imageService.js` - New image service
- [x] `components/SmartImageV2.jsx` - Enhanced image component
- [x] `components/Card.jsx` - Updated to use image service
- [x] `app/reading/edit/[id]/page.jsx` - Updated SmartImage usage
- [x] `app/decks/page.jsx` - Updated SmartImage usage

### Files That Need Updates
- [ ] `app/page.jsx` - Main reading interface
- [ ] `app/reading/page.jsx` - Reading list page
- [ ] `components/Header.jsx` - Profile images
- [ ] `components/SpreadModal.jsx` - Spread images
- [ ] Any other files using image sources

## Migration Steps for Additional Components

1. **Import the new dependencies**:
```javascript
import SmartImageV2 from '../path/to/SmartImageV2'
import { IMAGE_TYPES } from '../path/to/imageService'
```

2. **Replace SmartImage with SmartImageV2**:
```javascript
// Before
<SmartImage src={imageUrl} alt="Image" width={200} height={300} />

// After  
<SmartImageV2 
  src={imageUrl} 
  alt="Image" 
  width={200} 
  height={300}
  imageType={IMAGE_TYPES.APPROPRIATE_TYPE}
  imageContext={{ /* relevant context */ }}
/>
```

3. **Add appropriate image context**:
- For cards: `{ cardName, deck }`
- For decks: `{ deckId }`
- For readings: `{ readingId }`
- For profiles: `{ userId, size }`

## Backwards Compatibility

- **SmartImageV2** falls back to original URLs if transformation fails
- **Existing blob URLs** are passed through unchanged
- **Static assets** (`/images/`) remain unaffected
- **Emergency disable**: Set `enableTransform={false}` to bypass service

## Cache Management

```javascript
import { clearImageCache, getCacheStats } from '../lib/imageService'

// Clear cache when needed
clearImageCache()

// Monitor cache usage
const stats = getCacheStats()
console.log(`Cache has ${stats.size} entries`)
```

## Troubleshooting

### Common Issues

1. **Images not loading**: Check browser console for API errors
2. **Slow loading**: Verify backend API performance  
3. **Cache issues**: Clear cache with `clearImageCache()`
4. **Fallback not working**: Check `enableTransform` prop

### Debug Mode
Add logging to see URL transformations:
```javascript
// In imageService.js, uncomment debug logs
console.log('Transforming URL:', url, 'to:', transformedUrl)
```

## Performance Monitoring

Monitor these metrics:
- **Cache hit rate**: Should be >80% after warmup
- **API response times**: Should be <200ms average
- **Image load times**: Should be <1s for cached images
- **Error rates**: Should be <1% for API calls

## Future Enhancements

- **WebP conversion**: Add automatic format optimization
- **Responsive images**: Multiple sizes based on viewport
- **Progressive loading**: Blur-up technique for large images
- **Preemptive caching**: Predict and cache likely-needed images