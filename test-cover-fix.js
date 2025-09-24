// Quick test for cover image mapping
// Run this in browser console to test

console.log('🧪 Testing cover image blob mapping...')

// Test the transform function directly
import('../lib/imageService.js').then(async ({ transformImageUrl, getCardImageUrl, getBlobMapping, IMAGE_TYPES }) => {
  
  const blobMapping = getBlobMapping()
  console.log('📄 Blob mapping loaded:', !!blobMapping)
  
  if (blobMapping) {
    console.log('🔍 Available card mappings for cover:')
    Object.keys(blobMapping.cards).filter(key => key.includes('cover')).forEach(key => {
      console.log(`   ${key} -> ${blobMapping.cards[key]}`)
    })
  }
  
  // Test cover.svg request (the problematic one)
  console.log('\n🧪 Testing cover.svg transformation...')
  const svgUrl = await transformImageUrl('/images/rider-waite-tarot/cover.svg', IMAGE_TYPES.CARD, { cardName: 'cover' })
  console.log('cover.svg result:', svgUrl)
  
  // Test cover.jpg request
  console.log('\n🧪 Testing cover.jpg transformation...')
  const jpgUrl = await transformImageUrl('/images/rider-waite-tarot/cover.jpg', IMAGE_TYPES.CARD, { cardName: 'cover' })
  console.log('cover.jpg result:', jpgUrl)
  
  // Test direct card image function
  console.log('\n🧪 Testing getCardImageUrl for "cover"...')
  const cardUrl = await getCardImageUrl('cover', 'rider-waite')
  console.log('getCardImageUrl("cover") result:', cardUrl)
  
  // Create test image elements
  if (svgUrl && svgUrl.startsWith('http')) {
    console.log('\n🖼️ Creating test image for cover.svg -> blob URL...')
    const img = document.createElement('img')
    img.src = svgUrl
    img.style.maxWidth = '200px'
    img.style.border = '3px solid green'
    img.title = 'Cover Image (requested as .svg)'
    img.onload = () => console.log('✅ Cover image loaded successfully from blob URL')
    img.onerror = () => console.log('❌ Cover image failed to load')
    document.body.appendChild(img)
  }
  
}).catch(error => {
  console.error('❌ Test failed:', error)
})

// Also test direct fetch
console.log('\n🌐 Testing direct fetch to known blob URL...')
const knownBlobUrl = 'https://emfobsnlxploca6s.public.blob.vercel-storage.com/cards/rider-waite/cover-sfCn3234N2AO2IKfTuFjvdLuuV3454.jpg'
fetch(knownBlobUrl, { method: 'HEAD' })
  .then(response => {
    console.log(`✅ Direct blob URL test: ${response.status} ${response.statusText}`)
    console.log(`   Headers: ${response.headers.get('content-type')}`)
  })
  .catch(error => {
    console.log(`❌ Direct blob URL test failed: ${error.message}`)
  })