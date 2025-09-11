const path = require('path')
const fs = require('fs')
const Deck = require('../models/Deck')
const { cdnUrl } = require('./cdn')

async function createDefaultRiderWaiteDeckForUser(userId) {
  try {
    const imagesDir = path.join(__dirname, '..', 'client', 'public', 'images', 'rider-waite-tarot')
    // fallback to public/images in project root if not found
    if (!fs.existsSync(imagesDir)) {
      console.warn('Rider-Waite images directory not found:', imagesDir)
      return null
    }

    const files = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))

    const cards = files.map(fname => {
      const name = fname.replace(/\.png$|\.jpg$|\.jpeg$/i, '')
        .replace(/^major_arcana_/, '')
        .replace(/^minor_arcana_/, '')
        .replace(/_/g, ' ')
        .replace(/\b(\w)/g, (m) => m.toUpperCase())

  const rel = `/images/rider-waite-tarot/${fname}`
  return { name, image: cdnUrl(rel) }
    })

    const deckData = {
      deckName: 'Rider-Waite Tarot',
      description: 'Default Rider-Waite deck',
      cards,
      owner: userId
    }

    // avoid duplicate per user: delete any Rider-Waite deck owned by this user
    await Deck.deleteMany({ deckName: deckData.deckName, owner: userId })

    const deck = new Deck(deckData)
    await deck.save()
    return deck
  } catch (err) {
    console.error('Failed to create default Rider-Waite deck for user', userId, err)
    return null
  }
}

module.exports = createDefaultRiderWaiteDeckForUser
