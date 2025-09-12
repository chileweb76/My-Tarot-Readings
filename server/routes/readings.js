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

// GET /api/readings/user - Get user's reading history
router.get('/user', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'] // Support for auth header
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const readings = await Reading.find({ userId })
      .populate('querent', 'name')
      .populate('spread', 'spread')
      .populate('deck', 'deckName')
      .sort({ dateTime: -1 })
    
    res.json({
      count: readings.length,
      readings: readings
    })
  } catch (error) {
    console.error('Error fetching user reading history:', error)
    res.status(500).json({ error: 'Failed to fetch reading history' })
  }
})

// PUT /api/readings/:id - Update a reading
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { question, interpretation, dateTime } = req.body
    const userId = req.user?.id || req.headers['x-user-id']

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Find reading and verify ownership
    const reading = await Reading.findById(id)
    if (!reading) {
      return res.status(404).json({ error: 'Reading not found' })
    }

    if (reading.userId?.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this reading' })
    }

    // Update reading
    const updatedReading = await Reading.findByIdAndUpdate(
      id,
      {
        question: question || reading.question,
        interpretation: interpretation || reading.interpretation,
        dateTime: dateTime ? new Date(dateTime) : reading.dateTime
      },
      { new: true }
    ).populate('querent', 'name')
     .populate('spread', 'spread')
     .populate('deck', 'deckName')

    res.json({
      success: true,
      reading: updatedReading
    })
  } catch (error) {
    console.error('Error updating reading:', error)
    res.status(500).json({ error: 'Failed to update reading' })
  }
})

// DELETE /api/readings/:id - Delete a reading
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id || req.headers['x-user-id']

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Find reading and verify ownership
    const reading = await Reading.findById(id)
    if (!reading) {
      return res.status(404).json({ error: 'Reading not found' })
    }

    if (reading.userId?.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this reading' })
    }

    await Reading.findByIdAndDelete(id)

    res.json({
      success: true,
      message: 'Reading deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting reading:', error)
    res.status(500).json({ error: 'Failed to delete reading' })
  }
})

// POST /api/readings - Save a new reading
router.post('/', async (req, res) => {
  try {
    const {
      querent,
      spread,
      image,
      question,
      deck,
      dateTime,
      drawnCards,
      interpretation,
      userId
    } = req.body

    // Validate required fields
    if (!dateTime) {
      return res.status(400).json({ error: 'dateTime is required' })
    }

    // Create new reading
    const reading = new Reading({
      querent: querent === 'self' ? null : querent,
      spread: spread || null,
      image: image || null,
      question: question || '',
      deck: deck || null,
      dateTime: new Date(dateTime),
      drawnCards: drawnCards || [],
      interpretation: interpretation || '',
      userId: userId || null
    })

    const savedReading = await reading.save()
    console.log('📝 Reading saved to MongoDB:', savedReading._id)

    res.status(201).json({
      success: true,
      reading: savedReading
    })
  } catch (error) {
    console.error('Error saving reading:', error)
    res.status(500).json({ error: 'Failed to save reading', details: error.message })
  }
})

module.exports = router
