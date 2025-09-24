#!/usr/bin/env node

/**
 * Migration script to upload static images to Vercel Blob storage
 * Run with: node scripts/migrate-images-to-blob.js
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const fs = require('fs').promises
const path = require('path')
const { put } = require('@vercel/blob')

// Configuration
const PUBLIC_DIR = path.join(__dirname, '..', 'public')
const SPREADS_DIR = path.join(PUBLIC_DIR, 'images', 'spreads')
const RIDER_WAITE_DIR = path.join(PUBLIC_DIR, 'images', 'rider-waite-tarot')

// Spread ID to name mapping (from your database)
const SPREAD_MAPPINGS = {
  '68d467f1ee640a8d8e47ca7a': 'One Card',
  '68d467f1ee640a8d8e47ca7b': 'Two Card (Situation/Advice)',
  '68d467f1ee640a8d8e47ca7c': 'Two Card (Pros/Cons)', 
  '68d467f1ee640a8d8e47ca7d': 'Two Card (Yes/No)',
  '68d467f1ee640a8d8e47ca7e': 'Three Card (Past/Present/Future)',
  '68d467f1ee640a8d8e47ca7f': 'Three Card (Within, Without, Advice)',
  '68d467f1ee640a8d8e47ca80': 'Three Card (Body, Mind, Spirit)',
  '68d467f1ee640a8d8e47ca81': 'Three Card (Energy, Obstacle, Advice)',
  '68d467f1ee640a8d8e47ca82': 'Four Card Guidance',
  '68d467f1ee640a8d8e47ca83': 'Celtic Cross',
  '68d467f1ee640a8d8e47ca84': 'Horseshoe',
  '68d467f1ee640a8d8e47ca85': 'Relationship Five'
}

// Helper function to get spread filename from name or ID
const getSpreadFileName = (nameOrId) => {
  // If it's an ID, get the name first
  const name = SPREAD_MAPPINGS[nameOrId] || nameOrId
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars except spaces
    .replace(/\s+/g, '-') // Replace spaces with dashes
}

// Vercel Blob token should be in environment
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN

console.log('🔍 Environment check:')
console.log(`   - Current directory: ${__dirname}`)
console.log(`   - Token found: ${BLOB_READ_WRITE_TOKEN ? 'Yes (' + BLOB_READ_WRITE_TOKEN.substring(0, 20) + '...)' : 'No'}`)
console.log(`   - Spreads directory: ${SPREADS_DIR}`)
console.log(`   - Cards directory: ${RIDER_WAITE_DIR}`)
console.log(`   - Known spreads: ${Object.keys(SPREAD_MAPPINGS).length}`)

if (!BLOB_READ_WRITE_TOKEN) {
  console.error('❌ BLOB_READ_WRITE_TOKEN environment variable is required')
  console.error('Found token:', BLOB_READ_WRITE_TOKEN ? 'YES' : 'NO')
  console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('BLOB')))
  console.error('Set it in your .env.local file as:')
  console.error('BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_token_here')
  process.exit(1)
}

async function uploadImageToBlob(filePath, blobPath, category) {
  try {
    console.log(`📤 Uploading ${path.basename(filePath)} to ${blobPath}...`)
    
    // Read file
    const fileBuffer = await fs.readFile(filePath)
    const stats = await fs.stat(filePath)
    
    // Determine content type
    const ext = path.extname(filePath).toLowerCase()
    const contentType = ext === '.png' ? 'image/png' : 
                       ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                       ext === '.gif' ? 'image/gif' :
                       ext === '.webp' ? 'image/webp' : 'image/jpeg'
    
    // Upload to Vercel Blob
    const { url } = await put(blobPath, fileBuffer, {
      access: 'public',
      contentType,
      cacheControlMaxAge: 60 * 60 * 24 * 365, // 1 year cache
      metadata: {
        category,
        originalPath: filePath.replace(PUBLIC_DIR, ''),
        fileSize: stats.size.toString(),
        uploadedAt: new Date().toISOString()
      }
    })
    
    console.log(`✅ Uploaded: ${blobPath} -> ${url}`)
    
    return {
      originalPath: filePath.replace(PUBLIC_DIR, ''),
      blobUrl: url,
      blobPath,
      category,
      fileSize: stats.size,
      contentType
    }
    
  } catch (error) {
    console.error(`❌ Failed to upload ${filePath}:`, error.message)
    return null
  }
}

async function getImageFiles(directory) {
  try {
    const files = await fs.readdir(directory, { recursive: true })
    const imageFiles = []
    
    for (const file of files) {
      const filePath = path.join(directory, file)
      const stat = await fs.stat(filePath)
      
      if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase()
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
          imageFiles.push(filePath)
        }
      }
    }
    
    return imageFiles
  } catch (error) {
    console.warn(`⚠️  Could not read directory ${directory}:`, error.message)
    return []
  }
}

async function migrateSpreadImages() {
  console.log('\n📁 Migrating spread images...')
  
  const spreadFiles = await getImageFiles(SPREADS_DIR)
  const results = []
  
  for (const filePath of spreadFiles) {
    const fileName = path.basename(filePath)
    const blobPath = `spreads/${fileName}`
    
    const result = await uploadImageToBlob(filePath, blobPath, 'spread')
    if (result) results.push(result)
  }
  
  console.log(`✅ Migrated ${results.length} spread images`)
  return results
}

async function migrateRiderWaiteImages() {
  console.log('\n🃏 Migrating Rider-Waite tarot card images...')
  
  const cardFiles = await getImageFiles(RIDER_WAITE_DIR)
  const results = []
  
  for (const filePath of cardFiles) {
    const fileName = path.basename(filePath)
    const blobPath = `cards/rider-waite/${fileName}`
    
    const result = await uploadImageToBlob(filePath, blobPath, 'card')
    if (result) results.push(result)
  }
  
  console.log(`✅ Migrated ${results.length} Rider-Waite card images`)
  return results
}

async function generateMappingFile(spreadResults, cardResults) {
  const mapping = {
    migrationDate: new Date().toISOString(),
    spreadMappings: SPREAD_MAPPINGS, // Include the ID to name mappings
    spreads: {},
    cards: {}
  }
  
  // Map spread images with multiple lookup paths
  for (const result of spreadResults) {
    const fileName = path.basename(result.originalPath)
    const fileNameWithoutExt = path.basename(fileName, path.extname(fileName))
    
    // Add original path mapping
    mapping.spreads[result.originalPath] = result.blobUrl
    mapping.spreads[`/images/spreads/${fileName}`] = result.blobUrl
    
    // Add spread name mappings (try to match with known spreads)
    for (const [spreadId, spreadName] of Object.entries(SPREAD_MAPPINGS)) {
      const expectedFileName = getSpreadFileName(spreadName)
      if (fileNameWithoutExt.toLowerCase().includes(expectedFileName) || 
          expectedFileName.includes(fileNameWithoutExt.toLowerCase())) {
        mapping.spreads[spreadId] = result.blobUrl // Map by ID
        mapping.spreads[spreadName] = result.blobUrl // Map by name
        console.log(`🎯 Mapped spread: "${spreadName}" (${spreadId}) -> ${fileName}`)
      }
    }
  }
  
  // Map card images
  for (const result of cardResults) {
    const fileName = path.basename(result.originalPath)
    mapping.cards[result.originalPath] = result.blobUrl
    mapping.cards[`/images/rider-waite-tarot/${fileName}`] = result.blobUrl
  }
  
  // Write mapping file
  const mappingPath = path.join(__dirname, '..', 'blob-url-mapping.json')
  await fs.writeFile(mappingPath, JSON.stringify(mapping, null, 2))
  
  console.log(`\n📄 Created URL mapping file: ${mappingPath}`)
  console.log(`   - ${Object.keys(mapping.spreads).length} spread URLs (including ID mappings)`)
  console.log(`   - ${Object.keys(mapping.cards).length} card URLs`)
  console.log(`   - Spread ID mappings: ${Object.keys(SPREAD_MAPPINGS).length}`)
}

async function main() {
  console.log('🚀 Starting image migration to Vercel Blob...')
  
  try {
    // Migrate images
    const spreadResults = await migrateSpreadImages()
    const cardResults = await migrateRiderWaiteImages()
    
    // Generate mapping file for easy lookups
    await generateMappingFile(spreadResults, cardResults)
    
    const totalImages = spreadResults.length + cardResults.length
    const totalSize = [...spreadResults, ...cardResults]
      .reduce((sum, r) => sum + r.fileSize, 0)
    
    console.log(`\n🎉 Migration completed successfully!`)
    console.log(`   - Total images migrated: ${totalImages}`)
    console.log(`   - Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   - Spread images: ${spreadResults.length}`)
    console.log(`   - Card images: ${cardResults.length}`)
    
    console.log(`\n📝 Next steps:`)
    console.log(`   1. Update your image service to use blob URLs`)
    console.log(`   2. Test the migration with a few images`)
    console.log(`   3. Update static references to use the image service`)
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { uploadImageToBlob, migrateSpreadImages, migrateRiderWaiteImages }