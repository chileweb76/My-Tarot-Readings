/**
 * Seed script to import Rider-Waite images as a Deck
 * Usage: NODE_ENV=development node server/seed/seedDecks.js
 * Make sure the server's .env has a valid MONGODB_URI
 */
const path = require('path')
const fs = require('fs')
const mongoose = require('mongoose')
const envPath = path.resolve(__dirname, '../.env')
require('dotenv').config({ path: envPath })
console.log('Using env file:', envPath)

const Deck = require('../models/Deck')
const { cdnUrl } = require('../utils/cdn')

async function run() {
  const mongo = process.env.MONGODB_URI
  if (!mongo) {
    console.error('MONGODB_URI not set in environment')
    process.exit(1)
  }

  await mongoose.connect(mongo)

  const imagesDir = path.join(__dirname, '../../client/public/images/rider-waite-tarot')
  if (!fs.existsSync(imagesDir)) {
    console.error('Images directory not found:', imagesDir)
    process.exit(1)
  }

  const files = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))

  // Convert file names into readable card names (simple transform)
  const cards = files.map(fname => {
    const name = fname.replace(/\.png$|\.jpg$|\.jpeg$/i, '')
      .replace(/^major_arcana_/, '')
      .replace(/^minor_arcana_/, '')
      .replace(/_/g, ' ')
      .replace(/\b(\w)/g, (m) => m.toUpperCase())

    const rel = `/images/rider-waite-tarot/${fname}`
    return {
      name: name,
      image: cdnUrl(rel)
    }
  })

  const deckData = {
    deckName: 'Rider-Waite Tarot',
    description: 'Seeded Rider-Waite deck from public/images/rider-waite-tarot',
    cards
  }

  try {
    // Remove existing Rider-Waite deck if present
    await Deck.deleteMany({ deckName: deckData.deckName })
    const deck = new Deck(deckData)
    await deck.save()
    console.log('Seeded deck:', deck.deckName, 'with', deck.cards.length, 'cards')
  } catch (err) {
    console.error('Failed to seed deck', err)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

run()
