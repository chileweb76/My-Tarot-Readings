const express = require('express')
const router = express.Router()
const Reading = require('../models/Reading')
const mongoose = require('mongoose')

// GET /api/insights/count?querent=<id|self>&start=YYYY-MM-DD&end=YYYY-MM-DD&deck=<deckId|all>
router.get('/count', async (req, res) => {
  try {
    const { querent, start, end, deck, tags } = req.query
    const filters = {}

    // date range filter: inclusive
    if (start || end) {
      filters.dateTime = {}
      if (start) filters.dateTime.$gte = new Date(start)
      if (end) {
        // include entire end day by setting time to end of day
        const e = new Date(end)
        e.setHours(23,59,59,999)
        filters.dateTime.$lte = e
      }
    }

    // deck filter
    if (deck && deck !== 'all') {
      if (mongoose.Types.ObjectId.isValid(String(deck))) filters.deck = new mongoose.Types.ObjectId(String(deck))
    }

    // tags filter: accept comma-separated ids or JSON array
    if (tags) {
      let parsed = []
      try {
        if (tags.startsWith('[')) parsed = JSON.parse(tags)
        else parsed = String(tags).split(',').map(s => s.trim()).filter(Boolean)
      } catch (e) {
        parsed = String(tags).split(',').map(s => s.trim()).filter(Boolean)
      }
      const validIds = parsed.filter(id => mongoose.Types.ObjectId.isValid(String(id))).map(id => new mongoose.Types.ObjectId(String(id)))
      if (validIds.length) {
        // any reading that has at least one of the selected tags
        filters.selectedTags = { $in: validIds }
      }
    }

    // querent filter: accept 'self' which maps to global Self querent (userId: null)
    if (typeof querent !== 'undefined' && querent !== null && querent !== '') {
      const q = String(querent)
      if (q === 'self') {
        // find global Self querent id
        const Querent = require('../models/Querent')
        const selfQ = await Querent.findOne({ name: 'Self', userId: null }).lean()
        if (selfQ && selfQ._id) filters.querent = selfQ._id
        else filters.querent = null
      } else if (mongoose.Types.ObjectId.isValid(q)) {
        filters.querent = new mongoose.Types.ObjectId(q)
      } else {
        // not an object id and not 'self' -> ignore querent filter
      }
    }

    const count = await Reading.countDocuments(filters)
    res.json({ count })
  } catch (e) {
    console.error('Insights count error', e)
    res.status(500).json({ error: 'Failed to compute insights count' })
  }
})

module.exports = router
