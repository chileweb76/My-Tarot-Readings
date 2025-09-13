const express = require('express')
const router = express.Router()
const Handlebars = require('handlebars')
const path = require('path')
const fs = require('fs')
const { renderPdfFromHtml } = require('../utils/pdfWorker')

// POST /api/export/pdf
// Accepts structured reading data and returns a generated PDF
// Expected body: { reading: { by, date, querent, spread, deck, question, cards: [{title}], interpretation }, fileName }
router.post('/pdf', async (req, res) => {
  try {
    const { reading, fileName = 'reading.pdf' } = req.body
    if (!reading) return res.status(400).json({ error: 'reading object required' })

    // Load and compile template
    const tplPath = path.join(__dirname, '..', 'templates', 'reading-template.hbs')
    const tplRaw = fs.readFileSync(tplPath, 'utf8')
    const tpl = Handlebars.compile(tplRaw)

    // Ensure safe defaults
    const data = Object.assign({
      by: 'Guest',
      date: new Date().toLocaleString(),
      querent: 'Self',
      spread: 'Unknown',
      deck: 'Unknown deck',
      question: '',
      cards: [],
      interpretation: '',
      exportedAt: new Date().toLocaleString()
    }, reading)

    // Normalize card image URLs: make relative paths absolute using request host
    try {
      const host = req.get('host')
      const proto = req.protocol || 'http'
      if (Array.isArray(data.cards)) {
        data.cards = data.cards.map(c => {
          const copy = Object.assign({}, c)
          if (copy.image && typeof copy.image === 'string') {
            const img = copy.image.trim()
            // skip data URLs and absolute http(s) URLs
            if (!img.startsWith('data:') && !/^https?:\/\//i.test(img)) {
              // If starts with '/', make absolute
              if (img.startsWith('/')) {
                copy.image = `${proto}://${host}${img}`
              } else {
                // otherwise treat as relative to server root
                copy.image = `${proto}://${host}/${img}`
              }
            }
          }
          return copy
        })
      }
    } catch (e) {
      // ignore normalization errors and proceed
      console.warn('Image normalization failed', e)
    }

    const html = tpl(data)

    // Render PDF using reusable worker
    const pdfBuffer = await renderPdfFromHtml(html)

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': pdfBuffer.length
    })
    return res.send(pdfBuffer)
  } catch (err) {
    console.error('PDF export failed', err)
    return res.status(500).json({ error: 'Failed to generate PDF', details: err.message })
  }
})

module.exports = router
