#!/usr/bin/env node
/**
 * Copy images from a source directory into a local clone of the CDN repo
 * preserving the expected path: client/public/images/rider-waite-tarot/
 *
 * Usage:
 *   node scripts/copy_images_to_cdn_repo.js /path/to/source/images /path/to/local/cdn-repo
 *
 * The script will:
 * - verify expected filenames (prints missing ones)
 * - copy files that exist
 * - list files copied and files missing
 */

const fs = require('fs')
const path = require('path')
const expected = require('./list_rider_filenames')

async function run() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('Usage: node scripts/copy_images_to_cdn_repo.js /path/to/source/images /path/to/local/cdn-repo')
    process.exit(1)
  }

  const srcDir = path.resolve(args[0])
  const cdnRepo = path.resolve(args[1])
  const destBase = path.join(cdnRepo, 'client', 'public', 'images', 'rider-waite-tarot')

  if (!fs.existsSync(srcDir)) {
    console.error('Source directory does not exist:', srcDir)
    process.exit(1)
  }
  if (!fs.existsSync(cdnRepo)) {
    console.error('CDN repo path does not exist:', cdnRepo)
    process.exit(1)
  }

  fs.mkdirSync(destBase, { recursive: true })

  const copied = []
  const missing = []

  for (const file of expected) {
    const srcPath = path.join(srcDir, file)
    const destPath = path.join(destBase, file)
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath)
      copied.push(file)
    } else {
      missing.push(file)
    }
  }

  console.log('Copied', copied.length, 'files')
  if (missing.length) {
    console.warn('Missing files:', missing.length)
    console.warn(missing.join('\n'))
  }
  console.log('\nDestination path:', destBase)
  console.log('Run the following in the CDN repo to commit:')
  console.log('\n  git add client/public/images/rider-waite-tarot/*')
  console.log("  git commit -m 'Add rider-waite tarot images for CDN' && git push origin main\n")
}

run()
