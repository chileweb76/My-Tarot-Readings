#!/usr/bin/env node
// scripts/check_local_images.js
// Lists files under client/public/images/rider-waite-tarot and reports counts.
// Usage: node scripts/check_local_images.js

const fs = require('fs')
const path = require('path')

const imagesDir = path.join(__dirname, '..', 'client', 'public', 'images', 'rider-waite-tarot')

function human(n) {
  return n.toLocaleString()
}

try {
  if (!fs.existsSync(imagesDir)) {
    console.error(`Directory not found: ${imagesDir}`)
    console.error('Make sure your rider-waite images are placed in client/public/images/rider-waite-tarot/')
    process.exit(2)
  }

  const files = fs.readdirSync(imagesDir).filter(f => fs.statSync(path.join(imagesDir, f)).isFile())
  const images = files.filter(f => /\.png$|\.jpg$|\.jpeg$|\.gif$|\.webp$/i.test(f))
  const others = files.filter(f => !/\.png$|\.jpg$|\.jpeg$|\.gif$|\.webp$/i.test(f))

  console.log('Rider-Waite images directory:')
  console.log('  ' + imagesDir)
  console.log('\nSummary:')
  console.log('  Total files:    ', human(files.length))
  console.log('  Image files:    ', human(images.length))
  console.log('  Other files:    ', human(others.length))

  if (images.length > 0) {
    console.log('\nSample image files (first 50):')
    images.slice(0, 50).forEach((f, i) => console.log(`  ${i + 1}. ${f}`))
  } else {
    console.log('\nNo image files found in the rider-waite directory.')
  }

  // Suggest a quick curl check for the first image
  if (images.length > 0) {
    console.log('\nQuick local server check:')
    console.log('  1) Start your Next.js dev server: `cd client && npm run dev`')
    console.log('  2) In another terminal run:')
    console.log(`     curl -I http://localhost:3000/images/rider-waite-tarot/${encodeURIComponent(images[0])}`)
    console.log('     (expect HTTP/1.1 200 OK)')
  }

  process.exit(0)
} catch (err) {
  console.error('Error while checking images:', err && err.message)
  process.exit(1)
}
