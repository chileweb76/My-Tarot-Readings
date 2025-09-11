const mongoose = require('mongoose')

const querentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: String, default: 'anonymous' },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Querent', querentSchema)
