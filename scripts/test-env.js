#!/usr/bin/env node

/**
 * Simple test to verify environment variables are loading
 * Run with: node scripts/test-env.js
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

console.log('🔍 Environment Variable Test')
console.log('============================')

// Test BLOB_READ_WRITE_TOKEN
const blobToken = process.env.BLOB_READ_WRITE_TOKEN
console.log('BLOB_READ_WRITE_TOKEN found:', blobToken ? 'YES' : 'NO')
if (blobToken) {
  console.log('Token preview:', `${blobToken.slice(0, 20)}...${blobToken.slice(-10)}`)
  console.log('Token length:', blobToken.length)
}

// Test other environment variables
console.log('\nOther environment variables:')
console.log('MONGODB_URI found:', process.env.MONGODB_URI ? 'YES' : 'NO')
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL || 'NOT FOUND')

// Show all environment variables containing 'BLOB'
const blobEnvVars = Object.keys(process.env).filter(key => key.includes('BLOB'))
console.log('\nBLOB-related environment variables:', blobEnvVars)

// Test @vercel/blob import
try {
  const { put } = require('@vercel/blob')
  console.log('\n✅ @vercel/blob package imported successfully')
} catch (error) {
  console.error('\n❌ Failed to import @vercel/blob:', error.message)
}

console.log('\n✅ Environment test completed')