const path = require('path')
const fs = require('fs')
const Deck = require('../models/Deck')
const { cdnUrl } = require('./cdn')

// Built-in Rider-Waite filenames to use when local files are not present (so we
// can seed decks purely from CDN paths).
const MAJOR = [
  'major_arcana_fool','major_arcana_magician','major_arcana_priestess','major_arcana_empress','major_arcana_emperor',
  'major_arcana_hierophant','major_arcana_lovers','major_arcana_chariot','major_arcana_strength','major_arcana_hermit',
  'major_arcana_fortune','major_arcana_justice','major_arcana_hanged','major_arcana_death','major_arcana_temperance',
  'major_arcana_devil','major_arcana_tower','major_arcana_star','major_arcana_moon','major_arcana_sun',
  'major_arcana_judgement','major_arcana_world'
]

const MINOR_RANKS = ['ace','2','3','4','5','6','7','8','9','10','page','knight','queen','king']
const SUITS = ['cups','pentacles','swords','wands']

async function createDefaultRiderWaiteDeckForUser(userId) {
  try {
    const imagesDir = path.join(__dirname, '..', 'client', 'public', 'images', 'rider-waite-tarot')

    let files = []
    if (fs.existsSync(imagesDir)) {
      files = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
    } else {
      // Local images not present; fall back to built-in canonical filenames so we can
      // create deck entries that point to CDN paths via cdnUrl().
      files = []
      for (const m of MAJOR) files.push(m + '.png')
      for (const suit of SUITS) {
        for (const r of MINOR_RANKS) {
          files.push(`minor_arcana_${suit}_${r}.png`)
        }
      }
    }

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
