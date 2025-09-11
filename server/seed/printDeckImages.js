/**
 * Print the first N card.image entries for the Rider-Waite deck for inspection.
 * Usage: node server/seed/printDeckImages.js
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const mongoose = require('mongoose')

async function run() {
  const mongo = process.env.MONGODB_URI
  if (!mongo) {
    console.error('MONGODB_URI not set in environment')
    process.exit(1)
  }

  await mongoose.connect(mongo)
  try {
    const Deck = require('../models/Deck')
    const deck = await Deck.findOne({ deckName: 'Rider-Waite Tarot' })
    if (!deck) {
      console.log('No Rider deck found')
      process.exit(0)
    }
    console.log('Deck:', deck.deckName)
    deck.cards.slice(0, 20).forEach((c, i) => console.log(`${i+1}. ${c.name} -> ${c.image}`))
  } catch (err) {
    console.error('Error reading deck', err)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

run()
