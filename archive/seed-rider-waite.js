#!/usr/bin/env node

/**
 * Seed the Rider-Waite deck into MongoDB as a global deck.
 * - Reads ./rider_waite.json
 * - Connects to MONGODB_URI in .env.local
 * - Backs up any existing deck with same deckName to ./backups
 * - Upserts the deck document with isGlobal=true
 */

require('dotenv').config({ path: '.env.local' })
const fs = require('fs').promises
const path = require('path')
const mongoose = require('mongoose')

const Deck = require('../mytarotreadingsserver/models/Deck')

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('MONGODB_URI missing in .env.local')
  process.exit(1)
}

async function main() {
  const dataPath = path.join(__dirname, '..', 'rider_waite.json')
  const raw = await fs.readFile(dataPath, 'utf8')
  const deckData = JSON.parse(raw)

  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })

  console.log('Connected to MongoDB')

  // Look for existing deck by deckName
  const existing = await Deck.findOne({ deckName: deckData.deckName }).lean()

  // Backup existing if present
  const backupsDir = path.join(__dirname, '..', 'backups')
  await fs.mkdir(backupsDir, { recursive: true })

  if (existing) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(backupsDir, `deck-backup-${existing._id}-${ts}.json`)
    await fs.writeFile(backupPath, JSON.stringify(existing, null, 2), 'utf8')
    console.log(`Existing deck backed up to ${backupPath}`)
  }

  // Prepare upsert payload
  const payload = {
    deckName: deckData.deckName,
    description: deckData.description || '',
    image: deckData.image || '',
    owner: null,
    cards: deckData.cards || [],
    isGlobal: true
  }

  const res = await Deck.findOneAndUpdate(
    { deckName: deckData.deckName },
    { $set: payload },
    { upsert: true, new: true }
  )

  console.log('Upserted deck:', { _id: res._id, deckName: res.deckName, cards: res.cards.length })

  await mongoose.disconnect()
  console.log('Disconnected from MongoDB')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
