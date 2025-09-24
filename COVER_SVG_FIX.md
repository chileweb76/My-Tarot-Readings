# Cover.svg 404 Issue - Debugging Summary

## 🔍 Issue Analysis

**Problem**: Getting 404 for `https://mytarotreadings.vercel.app/images/rider-waite-tarot/cover.svg`

**Expected**: Should be redirected to blob URL: `https://emfobsnlxploca6s.public.blob.vercel-storage.com/cards/rider-waite/cover-sfCn3234N2AO2IKfTuFjvdLuuV3454.jpg`

## ✅ Fixes Implemented

### 1. Enhanced getCardImageUrl Function
- Added multiple file extension attempts (.png, .jpg, .svg)  
- Added special case handling for "cover" requests
- Tries both underscore and hyphen naming conventions

### 2. Updated transformImageUrl Function  
- Added alternative extension lookup for blob mappings
- Better logging for debugging

### 3. Updated Blob Mapping
- Added explicit `/images/rider-waite-tarot/cover.svg` entry pointing to cover.jpg blob URL

### 4. Enhanced Card Image Lookup Paths
```javascript
const possiblePaths = [
  `/images/rider-waite-tarot/${cardName.toLowerCase().replace(/\s+/g, '_')}.png`,
  `/images/rider-waite-tarot/${cardName.toLowerCase().replace(/\s+/g, '-')}.jpg`,
  `/images/rider-waite-tarot/${cardName.toLowerCase().replace(/\s+/g, '_')}.jpg`,
  `/images/rider-waite-tarot/${cardName.toLowerCase().replace(/\s+/g, '-')}.png`,
  `/images/rider-waite-tarot/${cardName.toLowerCase().replace(/\s+/g, '-')}.svg`,
  `/images/rider-waite-tarot/${cardName}.jpg`,
  `/images/rider-waite-tarot/${cardName}.png`,
  `/images/rider-waite-tarot/${cardName}.svg`,
]
```

## 🧪 Testing

### Test in Browser Console:
Copy the contents of `test-cover-fix.js` into browser console to test:

1. Blob mapping verification
2. cover.svg -> blob URL transformation  
3. Direct image loading test

### Expected Results:
- ✅ `transformImageUrl('/images/rider-waite-tarot/cover.svg')` should return blob URL
- ✅ `getCardImageUrl('cover')` should return blob URL
- ✅ Direct blob URL should be accessible (200 OK)

## 🔄 Next Steps

1. **Test the fix**: Open browser console and run the test script
2. **Check Network tab**: Verify requests are going to blob URLs instead of static files
3. **Monitor logs**: Look for blob mapping success messages in console

## 🎯 Root Cause Investigation

The 404 might be occurring because:

1. **Direct static file request**: Something is bypassing the image service
2. **Component hardcoding**: A component might have a hardcoded path
3. **API response**: Backend might be returning cover.svg path instead of cover.jpg
4. **Browser caching**: Old requests might be cached

## 📝 File Changes Made

- ✅ `lib/imageService.js` - Enhanced card image lookup with multiple extensions
- ✅ `blob-url-mapping.json` - Added cover.svg mapping
- ✅ Created test files for verification

If the issue persists after testing, we may need to:
- Check backend API responses 
- Verify SmartImageV2 component usage
- Add more comprehensive logging