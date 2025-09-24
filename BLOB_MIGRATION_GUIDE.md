# Vercel Blob Image Migration Guide

This guide walks you through uploading your existing static images from `public/images/spreads/` and `public/images/rider-waite-tarot/` folders to Vercel Blob storage.

## Prerequisites

1. **Vercel Blob Token**: You need a `BLOB_READ_WRITE_TOKEN` from your Vercel project
2. **@vercel/blob Package**: Already added to your package.json

## Step 1: Set Up Environment Variables

### Option A: Add to Vercel Project (Recommended)
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add `BLOB_READ_WRITE_TOKEN` with your blob token value
4. Make sure it's available for all environments (Development, Preview, Production)

### Option B: Local Development Only
Create or update `.env.local`:
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_token_here
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Run the Migration Script

### Check what images will be migrated:
```bash
# Dry run to see what would be migrated
ls -la public/images/spreads/
ls -la public/images/rider-waite-tarot/
```

### Run the migration:
```bash
node scripts/migrate-images-to-blob.js
```

### Expected output:
```
🚀 Starting image migration to Vercel Blob...

📁 Migrating spread images...
📤 Uploading celtic-cross.jpg to spreads/celtic-cross.jpg...
✅ Uploaded: spreads/celtic-cross.jpg -> https://xyz.public.blob.vercel-storage.com/spreads/celtic-cross-abc123.jpg
...

🃏 Migrating Rider-Waite tarot card images...
📤 Uploading the-fool.jpg to cards/rider-waite/the-fool.jpg...
✅ Uploaded: cards/rider-waite/the-fool.jpg -> https://xyz.public.blob.vercel-storage.com/cards/rider-waite/the-fool-def456.jpg
...

🎉 Migration completed successfully!
   - Total images migrated: 156
   - Total size: 45.2 MB
   - Spread images: 12
   - Card images: 144

📄 Created URL mapping file: blob-url-mapping.json
```

## Step 4: Update Your Image Service

### Option A: Replace existing image service (Recommended)
```bash
# Backup current service
cp lib/imageService.js lib/imageService.backup.js

# Replace with blob-enhanced version
cp lib/imageServiceWithBlob.js lib/imageService.js
```

### Option B: Gradual migration
Keep both services and import the blob version where needed:
```javascript
// In components that need blob URLs
import { getCardImageUrl, getSpreadImageUrl } from '../lib/imageServiceWithBlob'
```

## Step 5: Test the Migration

### Test individual images:
```javascript
// Test in browser console or a test script
import { getCardImageUrl, getSpreadImageUrl, getCacheStats } from './lib/imageService'

// Test card image
const cardUrl = await getCardImageUrl('The Fool', 'rider-waite')
console.log('Card URL:', cardUrl)

// Test spread image  
const spreadUrl = await getSpreadImageUrl('Celtic Cross')
console.log('Spread URL:', spreadUrl)

// Check cache and blob mapping stats
console.log('Cache stats:', getCacheStats())
```

### Test in your application:
1. Go to a reading page that shows card images
2. Open browser dev tools → Network tab
3. Look for image requests - they should now use blob URLs
4. Verify images load correctly

## Step 6: Update Static References (Optional)

If you have any hardcoded static image paths, you can update them:

```javascript
// Before
const imageSrc = '/images/spreads/celtic-cross.jpg'

// After  
import { getSpreadImageUrl } from '../lib/imageService'
const imageSrc = await getSpreadImageUrl('Celtic Cross')
```

## Step 7: Cleanup (After Testing)

Once you've verified everything works:

1. **Remove static files** (optional, for space):
```bash
# CAUTION: Only do this after thorough testing!
rm -rf public/images/spreads/
rm -rf public/images/rider-waite-tarot/
```

2. **Update build process** if needed to skip copying these folders

## URL Mapping File

The migration creates `blob-url-mapping.json` with this structure:
```json
{
  "migrationDate": "2025-09-24T...",
  "spreads": {
    "/images/spreads/celtic-cross.jpg": "https://xyz.public.blob.vercel-storage.com/spreads/celtic-cross-abc123.jpg"
  },
  "cards": {
    "/images/rider-waite-tarot/the-fool.jpg": "https://xyz.public.blob.vercel-storage.com/cards/rider-waite/the-fool-def456.jpg"
  }
}
```

This provides instant lookups for migrated images without API calls.

## Benefits of This Migration

1. **CDN Performance**: Vercel Blob uses a global CDN for faster image loading
2. **Reduced Bundle Size**: Static images are no longer part of your deployment
3. **Better Caching**: Blob storage has optimized cache headers
4. **Scalability**: No longer limited by Vercel's deployment size limits
5. **Backup**: Images are stored redundantly in blob storage

## Troubleshooting

### Migration fails with auth error:
- Check your `BLOB_READ_WRITE_TOKEN` is correct
- Ensure the token has write permissions
- Verify it's set in the right environment

### Images don't load after migration:
- Check the `blob-url-mapping.json` was created
- Verify your image service is importing the mapping
- Test individual URL transformations in console

### Some images missing:
- Check the migration script output for any upload failures
- Verify image file formats are supported (.jpg, .png, .gif, .webp)
- Re-run migration for specific folders if needed

### Performance issues:
- The image service has 15-minute caching built-in
- Blob URLs bypass the cache for even better performance
- Consider preloading critical images

## Next Steps

After successful migration:
1. Monitor your Vercel Blob usage in the dashboard
2. Consider implementing image optimization/resizing via Vercel Blob
3. Update your deployment process to skip static image copying
4. Consider migrating user-uploaded images to use the same system