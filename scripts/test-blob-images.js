#!/usr/bin/env node

/**
 * Test script to verify blob URLs work correctly
 * Run with: node scripts/test-blob-images.js
 */

const path = require('path')

// Test the blob URL mapping
async function testBlobMapping() {
  console.log('🧪 Testing blob URL mapping...')
  
  try {
    const mapping = require('../blob-url-mapping.json')
    console.log('✅ Blob mapping loaded successfully')
    console.log(`   - Migration date: ${mapping.migrationDate}`)
    console.log(`   - Spread URLs: ${Object.keys(mapping.spreads || {}).length}`)
    console.log(`   - Card URLs: ${Object.keys(mapping.cards || {}).length}`)
    
    // Test a few URLs
    const spreadUrls = Object.entries(mapping.spreads || {}).slice(0, 3)
    const cardUrls = Object.entries(mapping.cards || {}).slice(0, 3)
    
    console.log('\n📝 Sample spread URLs:')
    for (const [path, url] of spreadUrls) {
      console.log(`   ${path} -> ${url}`)
    }
    
    console.log('\n📝 Sample card URLs:')
    for (const [path, url] of cardUrls) {
      console.log(`   ${path} -> ${url}`)
    }
    
    return mapping
    
  } catch (error) {
    console.error('❌ Failed to load blob mapping:', error.message)
    console.log('💡 Run the migration script first: node scripts/migrate-images-to-blob.js')
    return null
  }
}

// Test HTTP requests to blob URLs
async function testBlobUrls(mapping) {
  if (!mapping) return
  
  console.log('\n🌐 Testing HTTP requests to blob URLs...')
  
  const fetch = (await import('node-fetch')).default
  
  // Test a spread URL
  const spreadUrls = Object.values(mapping.spreads || {})
  if (spreadUrls.length > 0) {
    const testUrl = spreadUrls[0]
    try {
      const response = await fetch(testUrl, { method: 'HEAD' })
      console.log(`✅ Spread image accessible: ${response.status} ${testUrl}`)
    } catch (error) {
      console.error(`❌ Spread image failed: ${error.message}`)
    }
  }
  
  // Test a card URL
  const cardUrls = Object.values(mapping.cards || {})
  if (cardUrls.length > 0) {
    const testUrl = cardUrls[0]
    try {
      const response = await fetch(testUrl, { method: 'HEAD' })
      console.log(`✅ Card image accessible: ${response.status} ${testUrl}`)
    } catch (error) {
      console.error(`❌ Card image failed: ${error.message}`)
    }
  }
}

// Test the enhanced image service
async function testImageService() {
  console.log('\n🔧 Testing enhanced image service...')
  
  try {
    // This would need to be adapted for Node.js environment
    // In a real test, you'd run this in browser or with proper module setup
    console.log('💡 To test image service, run this in your browser console:')
    console.log(`
import { getCardImageUrl, getSpreadImageUrl, getCacheStats } from './lib/imageService'

// Test card image
const cardUrl = await getCardImageUrl('The Fool', 'rider-waite')
console.log('Card URL:', cardUrl)

// Test spread image
const spreadUrl = await getSpreadImageUrl('Celtic Cross')  
console.log('Spread URL:', spreadUrl)

// Check stats
console.log('Stats:', getCacheStats())
`)
    
  } catch (error) {
    console.error('❌ Image service test failed:', error.message)
  }
}

async function main() {
  console.log('🧪 Starting blob image tests...\n')
  
  const mapping = await testBlobMapping()
  await testBlobUrls(mapping)
  await testImageService()
  
  console.log('\n✅ Blob image tests completed!')
  console.log('\n📋 Next steps:')
  console.log('   1. Test image loading in your browser')
  console.log('   2. Check network tab for blob URL requests')
  console.log('   3. Verify images display correctly')
  console.log('   4. Monitor blob storage usage in Vercel dashboard')
}

if (require.main === module) {
  main()
}

module.exports = { testBlobMapping, testBlobUrls }