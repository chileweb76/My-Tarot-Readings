"use client"

import { useEffect, useState } from 'react'
import AuthWrapper from '../components/AuthWrapper'
import { apiFetch } from '../lib/api'
import QuerentModal from '../components/QuerentModal'
import SpreadSelect from '../components/SpreadSelect'
import SpreadModal from '../components/SpreadModal'
import CameraModal from '../components/CameraModal'
import Card from '../components/Card'

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [querents, setQuerents] = useState([])
  const [selectedQuerent, setSelectedQuerent] = useState('self')
  const [selectedSpread, setSelectedSpread] = useState('')
  const [showSpreadModal, setShowSpreadModal] = useState(false)
  const [addingQuerent, setAddingQuerent] = useState(false)
  const [newQuerentName, setNewQuerentName] = useState('')
  const [savingQuerent, setSavingQuerent] = useState(false)
  const [spreadImage, setSpreadImage] = useState(null)
  const [spreadCards, setSpreadCards] = useState([])
  const [uploadedImage, setUploadedImage] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [message, setMessage] = useState(null)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [question, setQuestion] = useState('')
  const [decks, setDecks] = useState([])
  const [selectedDeck, setSelectedDeck] = useState('')
  const [interpretation, setInterpretation] = useState('')
  // reading date/time (initialized to current local date/time, editable)
  const [readingDateTime, setReadingDateTime] = useState(() => {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const min = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  })
  const [manualOverride, setManualOverride] = useState(false)
  const [savingReading, setSavingReading] = useState(false)

  // Auto-update the datetime every second while the user hasn't manually changed it
  useEffect(() => {
    if (manualOverride) return
    const tick = () => {
      const d = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const yyyy = d.getFullYear()
      const mm = pad(d.getMonth() + 1)
      const dd = pad(d.getDate())
      const hh = pad(d.getHours())
      const min = pad(d.getMinutes())
      setReadingDateTime(`${yyyy}-${mm}-${dd}T${hh}:${min}`)
    }
    // Keep in sync; using 1s interval ensures minutes update promptly
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [manualOverride])

  // Print function
  const handlePrintReading = () => {
    const printContent = `
      <html>
        <head>
          <title>Tarot Reading - ${new Date(readingDateTime).toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .section h3 { color: #6f42c1; margin-bottom: 10px; }
            .card-item { margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; }
            .card-title { font-weight: bold; color: #333; }
            .reversed { color: #dc3545; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Tarot Reading</h1>
            <p>Reading by: ${user?.username || 'Guest'}</p>
            <p>Date: ${new Date(readingDateTime).toLocaleString()}</p>
          </div>
          
          <div class="section">
            <h3>Reading Details</h3>
            <p><strong>Querent:</strong> ${selectedQuerent === 'self' ? 'Self' : (querents.find(q => q._id === selectedQuerent)?.name || 'Unknown')}</p>
            <p><strong>Question:</strong> ${question || 'No question specified'}</p>
            <p><strong>Spread:</strong> ${selectedSpread || 'No spread selected'}</p>
          </div>

          <div class="section">
            <h3>Cards Drawn</h3>
            ${spreadCards.map(cardName => `
              <div class="card-item">
                <div class="card-title">${typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || '')}</div>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h3>Overall Interpretation</h3>
            <p>${interpretation || 'No overall interpretation provided'}</p>
          </div>
        </body>
      </html>
    `
    
    const printWindow = window.open('', '_blank')
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
  }

  // Export as JSON
  const handleExportReading = () => {
    const exportData = {
      readingBy: user?.username || 'Guest',
      dateTime: readingDateTime,
      querent: selectedQuerent === 'self' ? 'Self' : (querents.find(q => q._id === selectedQuerent)?.name || 'Unknown'),
      question: question,
      spread: selectedSpread,
      deck: decks.find(d => d._id === selectedDeck)?.deckName || 'Unknown deck',
      drawnCards: spreadCards.map(cardName => ({
        title: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || ''),
        suit: '',
        card: '',
        reversed: false,
        interpretation: ''
      })),
      interpretation: interpretation,
      exportedAt: new Date().toISOString()
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `tarot-reading-${new Date(readingDateTime).toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Share reading (Web Share API with fallback)
  const handleShareReading = async () => {
    const shareText = `🔮 Tarot Reading - ${new Date(readingDateTime).toLocaleDateString()}\n\n` +
      `Querent: ${selectedQuerent === 'self' ? 'Self' : (querents.find(q => q._id === selectedQuerent)?.name || 'Unknown')}\n` +
      `Question: ${question || 'No question specified'}\n\n` +
      `Cards: ${spreadCards.map(cardName => typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || '')).join(', ')}\n\n` +
      `Interpretation: ${interpretation || 'No interpretation provided'}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tarot Reading',
          text: shareText,
        })
      } catch (err) {
        console.log('Share cancelled or failed:', err)
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText)
        setMessage({ type: 'success', text: 'Reading copied to clipboard!' })
      } catch (err) {
        console.error('Failed to copy to clipboard:', err)
        setMessage({ type: 'error', text: 'Failed to copy reading to clipboard' })
      }
    }
  }

  // Save reading function
  const handleSaveReading = async (e) => {
    e.preventDefault()
    setSavingReading(true)
    
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Please sign in to save readings')
      }

      // Simplify drawn cards data
      const drawnCards = spreadCards.map((cardName, index) => ({
        title: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || ''),
        suit: '',
        card: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || ''),
        reversed: false,
        interpretation: ''
      }))

      const readingData = {
        querent: selectedQuerent,
        spread: selectedSpread,
        image: uploadedImage,
        question: question,
        deck: selectedDeck,
        dateTime: readingDateTime,
        drawnCards: drawnCards,
        interpretation: interpretation,
        userId: user?._id
      }

      const res = await apiFetch('/api/readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(readingData)
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to save reading')
      }

      const result = await res.json()
      setMessage({ type: 'success', text: 'Reading saved successfully!' })
      console.log('Reading saved:', result.reading)
      
    } catch (error) {
      console.error('Error saving reading:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to save reading' })
    } finally {
      setSavingReading(false)
    }
  }

  useEffect(() => {
    // Try to read cached user data
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    // load selected spread from localStorage if present
    const ss = localStorage.getItem('selectedSpread')
    if (ss) setSelectedSpread(ss)
  }, [])

  // fetch querents when user is available
  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
        try {
        const res = await apiFetch('/querents')
        if (!res.ok) return
        const data = await res.json()
        if (data.querents) {
          setQuerents(data.querents)
        }
      } catch (err) {
        // ignore load errors silently
        console.warn('Failed to load querents', err)
      }
    }
    load()
  }, [user])

  // load decks for deck select
  useEffect(() => {
    let mounted = true
    const loadDecks = async () => {
      try {
        const res = await apiFetch('/api/decks')
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        const list = Array.isArray(data) ? data : (data.decks || [])
        setDecks(list)
        if (list.length && !selectedDeck) {
          // Prefer a public Rider-Waite deck (no owner) or a deck explicitly named 'Rider-Waite Tarot'
          const publicRider = list.find(d => !d.owner && (d.deckName === 'Rider-Waite Tarot' || d.deckName.toLowerCase().includes('rider')))
          const byName = list.find(d => d.deckName === 'Rider-Waite Tarot')
          const defaultDeck = publicRider || byName || list[0]
          setSelectedDeck(defaultDeck._id)
        }
      } catch (err) {
        console.warn('Failed to load decks', err)
      }
    }
    loadDecks()
    return () => { mounted = false }
  }, [user])

  // load spread image when selectedSpread changes
  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!selectedSpread) { setSpreadImage(null); return }
      try {
        // if selectedSpread looks like an ObjectId (24 hex) try id endpoint
        const isId = /^[0-9a-fA-F]{24}$/.test(selectedSpread)
        const url = isId ? `/spreads/${selectedSpread}` : `/spreads/by-name?name=${encodeURIComponent(selectedSpread)}`
        const res = await apiFetch(url)
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        setSpreadImage(data.image || null)
        // spreads store card position names in `cards` (array)
        setSpreadCards(Array.isArray(data.cards) ? data.cards : [])
      } catch (err) {
        console.warn('Failed to load spread image', err)
        if (mounted) setSpreadImage(null)
      }
    }
    load()
    return () => { mounted = false }
  }, [selectedSpread])

  // camera handled by CameraModal component

  return (
    <AuthWrapper>
      <form id="reading" className="reading" onSubmit={handleSaveReading}>
        {message && (
          <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`} role="alert">
            {message.text}
          </div>
        )}
        <p>Reading by: {user?.username || 'Guest'}</p>
        <h2>Reading</h2>

        <div className="mt-3 querent-row">
          <label htmlFor="querentSelect" className="form-label mb-0">Querent</label>
          <select
            id="querentSelect"
            className="form-select"
            style={{ width: 220 }}
            value={selectedQuerent}
            onChange={(e) => setSelectedQuerent(e.target.value)}
          >
            <option value="self">Self</option>
            {querents.map((q) => (
              <option key={q._id} value={q._id}>{q.name}</option>
            ))}
          </select>

          <button type="button" className="btn btn-tarot-primary btn-sm" id="addQuerentBtn" onClick={() => { setAddingQuerent(true); setNewQuerentName('') }}>Add</button>
        </div>
    
            {/* ...existing code... */}
        <div className="mt-3 querent-row d-flex align-items-start">
          <SpreadSelect
            value={selectedSpread}
            onChange={(val) => {
              console.log('Selected spread', val)
              setSelectedSpread(val)
              try { localStorage.setItem('selectedSpread', val) } catch (e) { /* ignore */ }
            }}
          />

          <button
            id="addSpreadBtn"
            className="btn btn-tarot-primary btn-sm ms-2"
            onClick={() => {
              setShowSpreadModal(true)
            }}
            aria-label="Custom spread"
          >
            Custom
          </button>
        </div>

        <SpreadModal
          show={showSpreadModal}
          onClose={() => setShowSpreadModal(false)}
          onCreated={(doc) => {
            // Automatically select the newly created spread and persist
            if (doc && (doc._id || doc.spread)) {
              const id = doc._id || doc.spread
              setSelectedSpread(id)
              try { localStorage.setItem('selectedSpread', id) } catch (e) {}
            }
          }}
        />

        {/* Responsive two-column area: left = spread image, right = upload/camera box */}
        <div className="mt-4">
          <div className="row">
            <div className="col-12 col-lg-6 mb-3">
              <div className="card h-100">
                <div className="card-body d-flex align-items-center justify-content-center" style={{ minHeight: 220 }}>
                  {spreadImage ? (
                    <img src={spreadImage} alt="Spread" style={{ maxWidth: '100%', maxHeight: 360 }} />
                  ) : (
                    <div className="text-center text-muted">No spread image selected</div>
                  )}
                </div>
                <div className="card-footer small text-muted">Spread image</div>
              </div>
            </div>

            <div className="col-12 col-lg-6 mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <div className="mb-2">Connect an image to this reading (upload or use camera)</div>
                  {uploadedImage ? (
                    <div className="mb-2 text-center">
                      <img src={uploadedImage} alt="Uploaded preview" style={{ maxWidth: '100%', maxHeight: 280 }} />
                    </div>
                  ) : (
                    <div className="mb-2 text-center text-muted">No image chosen</div>
                  )}

                  <div className="d-flex gap-2">
                    <label className="btn btn-outline-primary mb-0">
                      Choose file
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                        const f = e.target.files && e.target.files[0]
                        if (!f) return
                        const url = URL.createObjectURL(f)
                        setUploadedImage(url)
                        // optional: upload to server
                        // await uploadImageToServer(f)
                      }} />
                    </label>

                    <button type="button" className="btn btn-outline-secondary mb-0" onClick={() => setShowCameraModal(true)}>Camera</button>

                    <button className="btn btn-tarot-primary" disabled={!uploadedImage || uploadingImage} onClick={async () => {
                      // preview-only attach: mark image for later reading save; no server upload yet
                      if (!uploadedImage) return
                      setMessage({ type: 'success', text: 'Image attached to reading (preview only).' })
                    }}>Attach</button>

                    <button className="btn btn-outline-danger" disabled={!uploadedImage} onClick={() => { setUploadedImage(null); setMessage(null) }}>Remove</button>
                  </div>
                </div>
                <div className="card-footer small text-muted">Reading image (upload or camera)</div>
              </div>
            </div>
          </div>
        </div>
      
      {/* Question input (matches Spread label styling) */}
      <div className="mt-3">
        <label htmlFor="readingQuestion" className="form-label mb-0">Question</label>
        <input id="readingQuestion" className="form-control" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Enter your question for the reading" />
      </div>

      {/* Deck select populated from API (label inline, centered, matching Spread label) */}
      <div className="mt-3 d-flex justify-content-center">
        <div className="d-flex align-items-center" style={{ gap: 12 }}>
          <label htmlFor="deckSelect" className="form-label mb-0 text-white me-2" style={{ fontSize: '20px', fontWeight: 400 }}>Deck</label>
          <select id="deckSelect" className="form-select" value={selectedDeck} onChange={(e) => setSelectedDeck(e.target.value)} style={{ width: 320 }}>
            <option value="">-- Select deck --</option>
            {decks.map(d => (
              <option key={d._id} value={d._id}>{d.deckName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards Drawn label aligned left with question and two-column section */}
      <div className="mt-2">
        <p className="mb-0 text-white" style={{ fontSize: '20px', fontWeight: 400, textAlign: 'left' }}>Cards Drawn:</p>
      </div>
      {/* Render a Card component for each position in the selected spread */}
      <div className="mt-3">
        <div className="row">
          {spreadCards && spreadCards.length ? (
            spreadCards.map((cardName, idx) => (
              <div key={idx} className="col-12 mb-3">
                <Card 
                  title={typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || '')} 
                  deck={decks.find(d => d._id === selectedDeck)?.deckName || 'rider-waite'}
                  deckData={decks.find(d => d._id === selectedDeck)}
                />
              </div>
            ))
          ) : (
            <div className="col-12 text-muted">No cards drawn — select a spread.</div>
          )}
        </div>
      </div>

      {/* Reading date & time (editable) - centered and smaller */}
      <div className="mt-3 d-flex flex-column align-items-center">
        <label htmlFor="readingDateTime" className="form-label mb-1 text-center">Reading date & time</label>
        <input
          id="readingDateTime"
          type="datetime-local"
          className="form-control text-center"
          style={{ width: 260 }}
          value={readingDateTime}
          onChange={(e) => { setReadingDateTime(e.target.value); setManualOverride(true) }}
        />
        <div className="form-text text-center">Local time — updates automatically until you edit it.</div>
      </div>
      {/* My Interpretation textarea (full width) */}
      <div className="mt-3">
        <label htmlFor="myInterpretation" className="form-label mb-1">My Interpretation</label>
        <textarea
          id="myInterpretation"
          className="form-control"
          rows={6}
          placeholder="Write your interpretation for this reading here..."
          value={interpretation}
          onChange={(e) => setInterpretation(e.target.value)}
        />
      </div>

      {/* Save Reading Button */}
      <div className="mt-4 d-flex justify-content-center">
        <button 
          type="submit" 
          className="btn btn-tarot-primary btn-lg"
          disabled={savingReading}
        >
          {savingReading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Saving Reading...
            </>
          ) : (
            'Save Reading'
          )}
        </button>
      </div>

      {/* Export/Share Actions */}
      <div className="mt-3 d-flex justify-content-center gap-2">
        <button 
          type="button" 
          className="btn btn-outline-primary"
          onClick={handlePrintReading}
          title="Print reading"
        >
          <i className="fas fa-print me-2"></i>Print
        </button>
        <button 
          type="button" 
          className="btn btn-outline-secondary"
          onClick={handleExportReading}
          title="Export as JSON"
        >
          <i className="fas fa-download me-2"></i>Export
        </button>
        <button 
          type="button" 
          className="btn btn-outline-success"
          onClick={handleShareReading}
          title="Share reading"
        >
          <i className="fas fa-share me-2"></i>Share
        </button>
      </div>
      </form>
      <QuerentModal
        show={addingQuerent}
        value={newQuerentName}
        onChange={(v) => setNewQuerentName(v)}
        loading={savingQuerent}
        onClose={() => { setAddingQuerent(false); setNewQuerentName('') }}
        onSave={async () => {
          const name = (newQuerentName || '').trim()
          if (!name) return alert('Name required')
          const token = localStorage.getItem('token')
          if (!token) { alert('Please sign in to save querents'); return }
          try {
            setSavingQuerent(true)
            const res = await apiFetch('/querents', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name })
            })
            if (!res.ok) {
              const err = await res.json().catch(() => ({}))
              throw new Error(err.error || 'Failed to save querent')
            }
            const data = await res.json()
            setQuerents(prev => [data.querent, ...prev])
            setSelectedQuerent(data.querent._id)
            setAddingQuerent(false)
            setNewQuerentName('')
          } catch (err) {
            alert('Error saving querent: ' + (err.message || err))
          } finally {
            setSavingQuerent(false)
          }
        }}
      />

      <CameraModal show={showCameraModal} onClose={() => setShowCameraModal(false)} onCaptured={(dataUrl) => setUploadedImage(dataUrl)} setMessage={setMessage} />
    </AuthWrapper>
  )
}
