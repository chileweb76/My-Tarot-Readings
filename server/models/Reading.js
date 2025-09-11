const mongoose = require('mongoose')

const readingSchema = new mongoose.Schema({
  cards: [{
    position: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    meaning: {
      type: String,
      required: true
    }
  }],
  spread: {
    type: String,
    required: true,
    default: 'Three-Card Spread'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: String,
    default: 'anonymous'
  }
})

module.exports = mongoose.model('Reading', readingSchema)
