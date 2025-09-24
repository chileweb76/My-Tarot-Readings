/**
 * Browser test script for blob image service
 * Copy and paste this into your browser console to test the blob URLs
 */

// Test the blob URL mapping
console.log('🧪 Testing blob URL mapping in browser...')

// Test getting a spread URL by ID
import('../lib/imageService.js').then(async ({ getSpreadImageUrl, getCardImageUrl, getCacheStats, getBlobMapping }) => {
  console.log('📦 Image service loaded')
  
  // Test blob mapping
  const blobMapping = getBlobMapping()
  console.log('🗂️ Blob mapping:', blobMapping ? 'Loaded' : 'Not found')
  if (blobMapping) {
    console.log(`   - Spreads: ${Object.keys(blobMapping.spreads || {}).length}`)
    console.log(`   - Cards: ${Object.keys(blobMapping.cards || {}).length}`)
  }
  
  // Test spread image by ID
  console.log('\n🧪 Testing spread image by ID...')
  const celticCrossId = '68d467f1ee640a8d8e47ca83'
  const spreadUrl = await getSpreadImageUrl(celticCrossId)
  console.log(`   Celtic Cross (ID): ${spreadUrl}`)
  
  // Test spread image by name
  console.log('\n🧪 Testing spread image by name...')
  const spreadUrl2 = await getSpreadImageUrl('Celtic Cross')
  console.log(`   Celtic Cross (name): ${spreadUrl2}`)
  
  // Test card image
  console.log('\n🧪 Testing card image...')
  const cardUrl = await getCardImageUrl('The Fool', 'rider-waite')
  console.log(`   The Fool card: ${cardUrl}`)
  
  // Test another card
  const cardUrl2 = await getCardImageUrl('Death', 'rider-waite')
  console.log(`   Death card: ${cardUrl2}`)
  
  // Show cache stats
  console.log('\n📊 Cache stats:', getCacheStats())
  
  // Create test images to verify they load
  console.log('\n🖼️ Creating test images...')
  
  if (spreadUrl) {
    const img1 = document.createElement('img')
    img1.src = spreadUrl
    img1.style.maxWidth = '200px'
    img1.style.border = '2px solid green'
    img1.title = 'Celtic Cross Spread'
    img1.onload = () => console.log('✅ Celtic Cross image loaded')
    img1.onerror = () => console.log('❌ Celtic Cross image failed')
    document.body.appendChild(img1)
  }
  
  if (cardUrl) {
    const img2 = document.createElement('img')
    img2.src = cardUrl
    img2.style.maxWidth = '150px'
    img2.style.border = '2px solid blue'
    img2.title = 'The Fool Card'
    img2.onload = () => console.log('✅ The Fool card image loaded')
    img2.onerror = () => console.log('❌ The Fool card image failed')
    document.body.appendChild(img2)
  }
  
}).catch(error => {
  console.error('❌ Failed to load image service:', error)
  console.log('💡 Make sure you\'re on a page that has the image service available')
})

console.log('📋 Test script ready! Check the console output above.')

// Also test direct blob URL access
console.log('\n🌐 Direct blob URL test:')
const testBlobUrl = 'https://emfobsnlxploca6s.public.blob.vercel-storage.com/spreads/celtic-cross-bRMkIVF1wg4T1c02LtEqTzCZWCsXd9.png'
fetch(testBlobUrl, { method: 'HEAD' })
  .then(response => {
    console.log(`✅ Direct blob URL test: ${response.status} ${response.statusText}`)
  })
  .catch(error => {
    console.log(`❌ Direct blob URL test failed: ${error.message}`)
  })