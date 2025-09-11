const express = require('express')
const router = express.Router()
const Reading = require('../models/Reading')

// Sample tarot cards data
const tarotCards = [
  { name: 'The Fool', meaning: 'new beginnings, spontaneity, innocence' },
  { name: 'The Magician', meaning: 'manifestation, resourcefulness, power' },
  { name: 'The High Priestess', meaning: 'intuition, sacred knowledge, divine feminine' },
  { name: 'The Empress', meaning: 'femininity, beauty, nature, abundance' },
  { name: 'The Emperor', meaning: 'authority, establishment, structure, father figure' },
  { name: 'The Hierophant', meaning: 'spiritual wisdom, religious beliefs, conformity' },
  { name: 'The Lovers', meaning: 'love, harmony, relationships, values alignment' },
  { name: 'The Chariot', meaning: 'control, willpower, success, determination' },
  { name: 'Strength', meaning: 'courage, persuasion, influence, compassion' },
  { name: 'The Hermit', meaning: 'soul searching, introspection, inner guidance' },
  { name: 'Wheel of Fortune', meaning: 'good luck, karma, life cycles, destiny' },
  { name: 'Justice', meaning: 'justice, fairness, truth, cause and effect' },
  { name: 'The Hanged Man', meaning: 'suspension, restriction, letting go' },
  { name: 'Death', meaning: 'endings, beginnings, change, transformation' },
  { name: 'Temperance', meaning: 'balance, moderation, patience, purpose' },
  { name: 'The Devil', meaning: 'bondage, addiction, sexuality, materialism' },
  { name: 'The Tower', meaning: 'sudden change, upheaval, chaos, revelation' },
  { name: 'The Star', meaning: 'hope, faith, purpose, renewal, spirituality' },
  { name: 'The Moon', meaning: 'illusion, fear, anxiety, subconscious, intuition' },
  { name: 'The Sun', meaning: 'positivity, fun, warmth, success, vitality' },
  { name: 'Judgement', meaning: 'judgement, rebirth, inner calling, absolution' },
  { name: 'The World', meaning: 'completion, accomplishment, travel, fulfillment' }
]

// GET /api/readings - Get a random tarot reading
router.get('/', async (req, res) => {
  try {
    // Shuffle and pick 3 random cards
    const shuffled = [...tarotCards].sort(() => 0.5 - Math.random())
    const selectedCards = shuffled.slice(0, 3)
    
    const reading = {
      cards: [
        {
          position: 'Past',
          name: selectedCards[0].name,
          meaning: selectedCards[0].meaning
        },
        {
          position: 'Present',
          name: selectedCards[1].name,
          meaning: selectedCards[1].meaning
        },
        {
          position: 'Future',
          name: selectedCards[2].name,
          meaning: selectedCards[2].meaning
        }
      ],
      spread: 'Three-Card Spread',
      timestamp: new Date().toISOString()
    }
    
    // Optionally save to MongoDB (if connection is available)
    try {
      const savedReading = new Reading(reading)
      await savedReading.save()
      console.log('📝 Reading saved to MongoDB')
    } catch (mongoError) {
      console.log('⚠️ MongoDB save failed (continuing anyway):', mongoError.message)
    }
    
    res.json(reading)
  } catch (error) {
    console.error('Error generating reading:', error)
    res.status(500).json({ error: 'Failed to generate reading' })
  }
})

// GET /api/readings/history - Get reading history from MongoDB
router.get('/history', async (req, res) => {
  try {
    const readings = await Reading.find()
      .sort({ timestamp: -1 })
      .limit(10)
    
    res.json({
      count: readings.length,
      readings: readings
    })
  } catch (error) {
    console.error('Error fetching reading history:', error)
    res.status(500).json({ error: 'Failed to fetch reading history' })
  }
})

module.exports = router
