/**
 * Update the Rider-Waite deck description to a traditional description.
 * Usage: node server/seed/updateDeckDescription.js
 */
const path = require('path')
const mongoose = require('mongoose')
const Deck = require('../models/Deck')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

async function run() {
  const mongo = process.env.MONGODB_URI
  if (!mongo) {
    console.error('MONGODB_URI not set in environment')
    process.exit(1)
  }

  await mongoose.connect(mongo)

  const traditionalDescription = `The Rider–Waite Tarot (also called the Rider–Waite–Smith) is a seminal tarot deck first published in 1909, illustrated by Pamela Colman Smith under the direction of Arthur Edward Waite. It is the most widely used deck for divination and study, valued for its clear symbolism and richly illustrated Minor Arcana.`

  try {
    const updated = await Deck.findOneAndUpdate(
      { deckName: 'Rider-Waite Tarot' },
      { description: traditionalDescription },
      { new: true }
    )

    if (!updated) {
      console.error('Rider-Waite Tarot deck not found in DB')
      process.exit(1)
    }

    console.log('Updated deck description for:', updated.deckName)
    console.log('New description:', updated.description)
  } catch (err) {
    console.error('Error updating deck description', err)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

run()
