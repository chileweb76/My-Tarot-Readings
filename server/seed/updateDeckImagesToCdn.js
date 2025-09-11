/**
 * Update existing Deck documents in MongoDB to replace card.image paths that
 * point to `/images/...` with CDN URLs (when CDN is enabled).
 *
 * Usage: node server/seed/updateDeckImagesToCdn.js
 */
const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const Deck = require('../models/Deck')
const { cdnUrl } = require('../utils/cdn')

async function run() {
  const mongo = process.env.MONGODB_URI
  if (!mongo) {
    console.error('MONGODB_URI not set in environment')
    process.exit(1)
  }
  await mongoose.connect(mongo)
  try {
    const decks = await Deck.find({ 'cards.image': { $regex: '^/images/' } })
    if (!decks.length) {
      console.log('No decks with /images/ card paths found')
      return
    }

    for (const deck of decks) {
      let changed = false
      deck.cards = deck.cards.map(card => {
        if (card.image && typeof card.image === 'string' && card.image.startsWith('/images/')) {
          card.image = cdnUrl(card.image)
          changed = true
        }
        return card
      })
      if (changed) {
        await deck.save()
        console.log('Updated deck', deck.deckName)
      }
    }
  } catch (err) {
    console.error('Failed updating decks to CDN', err)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

run()
