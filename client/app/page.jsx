"use client"

import { useEffect, useState } from 'react'
import AuthWrapper from '../components/AuthWrapper'
import { apiFetch } from '../lib/api'
import { addListener } from '../lib/toast'
import QuerentModal from '../components/QuerentModal'
import SpreadSelect from '../components/SpreadSelect'
import SpreadModal from '../components/SpreadModal'
import CameraModal from '../components/CameraModal'
import Card from '../components/Card'
import Toasts from '../components/Toasts'

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
  const [spreadName, setSpreadName] = useState('')
  const [cardStates, setCardStates] = useState([])
  const [uploadedImage, setUploadedImage] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [savingReading, setSavingReading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [autosaveEnabled, setAutosaveEnabled] = useState(false)
  const [readingId, setReadingId] = useState(null)
  const [manualOverride, setManualOverride] = useState(false)
  // legacy message state removed; use notify() global helper instead
  const [toasts, setToasts] = useState([])

  // push a toast into the stack
  const pushToast = (t) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`
    setToasts(prev => [...prev, { id, ...t }])
    return id
  }

  // Register global toast listener so other modules can call `notify()`
  useEffect(() => {
    const off = addListener((msg) => {
      pushToast(msg)
    })
    return () => off()
  }, [])

  // Print reading: open a print window (same content as export fallback)
  const handlePrintReading = () => {
    const exportHtml = `
      <html>
        <head>
          <title>Tarot Reading - ${new Date(readingDateTime).toLocaleDateString()}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 20px; }
            h1 { text-align: center; color: #4a154b; }
            .meta { margin-bottom: 12px; }
            .section { margin-bottom: 18px; }
            .card-item { margin-bottom: 8px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
            .card-title { font-weight: 600; }
            .footer-note { margin-top: 28px; color: #555; font-size: 0.9rem; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Tarot Reading</h1>
          <div class="meta">
            <div><strong>Reading by:</strong> ${user?.username || 'Guest'}</div>
            <div><strong>Date:</strong> ${new Date(readingDateTime).toLocaleString()}</div>
            <div><strong>Querent:</strong> ${selectedQuerent === 'self' ? 'Self' : (querents.find(q => q._id === selectedQuerent)?.name || 'Unknown')}</div>
            <div><strong>Spread:</strong> ${spreadName || selectedSpread || 'No spread selected'}</div>
            <div><strong>Deck:</strong> ${decks.find(d => d._id === selectedDeck)?.deckName || 'Unknown deck'}</div>
          </div>

          <div class="section">
            <h3>Question</h3>
            <div>${question || 'No question specified'}</div>
          </div>

          <div class="section">
            <h3>Cards Drawn</h3>
            ${ (cardStates && cardStates.length ? cardStates : spreadCards.map(cardName => ({ title: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || '') }))).map(cs => `
              <div class="card-item">
                <div class="card-title">${cs.title || ''}${cs.selectedCard ? (cs.selectedSuit && cs.selectedSuit.toLowerCase() !== 'major arcana' ? ` - ${cs.selectedCard} of ${cs.selectedSuit}` : ` - ${cs.selectedCard}`) : ''}${cs.reversed ? ' (reversed)' : ''}</div>
                ${cs.interpretation ? `<div class="card-interpretation">${cs.interpretation}</div>` : ''}
                ${cs.image ? `<div style="margin-top:8px"><img src="${cs.image}" style="max-width:120px;max-height:160px"/></div>` : ''}
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h3>Interpretation</h3>
            <div>${interpretation || 'No overall interpretation provided'}</div>
          </div>

          <div class="footer-note">Exported: ${new Date().toLocaleString()}</div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      pushToast({ type: 'error', text: 'Unable to open print window. Please allow popups for this site.' })
      return
    }
    printWindow.document.write(exportHtml)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { try { printWindow.print(); printWindow.onafterprint = () => { try { printWindow.close() } catch (e) {} } } catch (err) { console.error('Print failed', err); pushToast({ type: 'error', text: 'Print failed.' }) } }, 300)
  }

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  // legacy forwarding removed; other modules should call `notify()` directly
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [question, setQuestion] = useState('')
  const [decks, setDecks] = useState([])
  const [selectedDeck, setSelectedDeck] = useState('')
  const [interpretation, setInterpretation] = useState('')
  // reading date/time (initialized to current local date/time, editable)
  const [readingDateTime, setReadingDateTime] = useState(() => {
    // default value suitable for <input type="datetime-local"> (local timezone)
    const dt = new Date()
    const offsetMs = dt.getTimezoneOffset() * 60000
    const local = new Date(dt.getTime() - offsetMs)
    return local.toISOString().slice(0,16)
  })

  // Export reading: try server-side PDF export first, fall back to print window
  const handleExportReading = async () => {
    const readingPayload = {
      by: user?.username || 'Guest',
      date: new Date(readingDateTime).toLocaleString(),
      querent: selectedQuerent === 'self' ? 'Self' : (querents.find(q => q._id === selectedQuerent)?.name || 'Unknown'),
      spread: spreadName || selectedSpread || 'No spread selected',
      deck: decks.find(d => d._id === selectedDeck)?.deckName || 'Unknown deck',
      question: question || '',
      cards: (cardStates && cardStates.length ? cardStates : spreadCards.map(cardName => ({ title: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || '') }))).map(cs => ({
        title: cs.title || '',
        suit: cs.selectedSuit || '',
        card: cs.selectedCard || (cs.title || ''),
        reversed: !!cs.reversed,
        interpretation: cs.interpretation || '',
        image: cs.image || null
      })),
      interpretation: interpretation || '',
      exportedAt: new Date().toLocaleString()
    }

  setExporting(true)
    try {
      const rawApi = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const apiBase = rawApi.replace(/\/$|\/api$/i, '')
      const debugUrl = `${apiBase}/api/export/pdf`
      console.debug('Export will POST to', debugUrl)
      const res = await apiFetch('/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reading: readingPayload, fileName: `tarot-reading-${new Date(readingDateTime).toISOString().split('T')[0]}.pdf` })
      })

      if (!res.ok) {
        let bodyText = ''
        try { bodyText = await res.text() } catch (e) { bodyText = '' }
        const snippet = bodyText ? (bodyText.length > 200 ? bodyText.slice(0,200) + '...' : bodyText) : ''
        const msg = `Server export failed: ${res.status} ${res.statusText} ${res.url ? '(' + res.url + ')' : ''} ${snippet}`
        console.error(msg)
        pushToast({ type: 'error', text: `Export failed: ${res.status} ${res.statusText}` })
        throw new Error('Server export failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tarot-reading-${new Date(readingDateTime).toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
  pushToast({ type: 'success', text: 'Exported PDF downloaded.' })
      setExporting(false)
      return
    } catch (err) {
      // fallback to client-side print if server export fails
      console.warn('Server export failed, falling back to print:', err)
  pushToast({ type: 'error', text: 'Server export failed, opening print dialog as fallback.' })
      setExporting(false)
    }

    // Fallback: open a print window (same content as before)
    const exportHtml = `
      <html>
        <head>
          <title>Tarot Reading - ${new Date(readingDateTime).toLocaleDateString()}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 20px; }
            h1 { text-align: center; color: #4a154b; }
            .meta { margin-bottom: 12px; }
            .section { margin-bottom: 18px; }
            .card-item { margin-bottom: 8px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
            .card-title { font-weight: 600; }
            .footer-note { margin-top: 28px; color: #555; font-size: 0.9rem; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Tarot Reading</h1>
          <div class="meta">
            <div><strong>Reading by:</strong> ${user?.username || 'Guest'}</div>
            <div><strong>Date:</strong> ${new Date(readingDateTime).toLocaleString()}</div>
            <div><strong>Querent:</strong> ${selectedQuerent === 'self' ? 'Self' : (querents.find(q => q._id === selectedQuerent)?.name || 'Unknown')}</div>
            <div><strong>Spread:</strong> ${selectedSpread || 'No spread selected'}</div>
            <div><strong>Deck:</strong> ${decks.find(d => d._id === selectedDeck)?.deckName || 'Unknown deck'}</div>
          </div>

          <div class="section">
            <h3>Question</h3>
            <div>${question || 'No question specified'}</div>
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
            <h3>Interpretation</h3>
            <div>${interpretation || 'No overall interpretation provided'}</div>
          </div>

          <div class="footer-note">Exported: ${new Date().toLocaleString()}</div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      pushToast({ type: 'error', text: 'Unable to open print window. Please allow popups for this site.' })
      return
    }
    printWindow.document.write(exportHtml)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { try { printWindow.print(); printWindow.onafterprint = () => { try { printWindow.close() } catch (e) {} } } catch (err) { console.error('Print failed', err) } }, 300)
    setExporting(false)
  }

  // Share reading (Web Share API with fallback)
  const handleShareReading = async () => {
    const cardsText = (cardStates && cardStates.length ? cardStates : spreadCards.map(cardName => ({ title: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || '') }))).map(cs => {
      const name = cs.title || ''
      const details = cs.selectedCard ? (cs.selectedSuit && cs.selectedSuit.toLowerCase() !== 'major arcana' ? `${cs.selectedCard} of ${cs.selectedSuit}` : cs.selectedCard) : ''
      const rev = cs.reversed ? ' (reversed)' : ''
      const interp = cs.interpretation ? ` — ${cs.interpretation}` : ''
      return `${name}${details ? ` — ${details}` : ''}${rev}${interp}`
    }).join('\n')

    const shareText = `🔮 Tarot Reading - ${new Date(readingDateTime).toLocaleDateString()}\n\n` +
      `Querent: ${selectedQuerent === 'self' ? 'Self' : (querents.find(q => q._id === selectedQuerent)?.name || 'Unknown')}\n` +
      `Spread: ${spreadName || selectedSpread || 'No spread selected'}\n` +
      `Question: ${question || 'No question specified'}\n\n` +
      `Cards:\n${cardsText}\n\n` +
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
          pushToast({ type: 'success', text: 'Reading copied to clipboard!' })
      } catch (err) {
        console.error('Failed to copy to clipboard:', err)
  pushToast({ type: 'error', text: 'Failed to copy reading to clipboard' })
      }
    }
  }

  // Save reading function
  // Reusable save helper: create (POST) if no readingId, otherwise update (PUT)
  const saveReading = async ({ explicit = false } = {}) => {
    if (explicit) setSavingReading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        if (explicit) throw new Error('Please sign in to save readings')
        return
      }

      // Build drawn cards from cardStates (prefer explicit edits) or fallback to spreadCards
      const drawnCards = (cardStates && cardStates.length ? cardStates : spreadCards.map((cardName) => ({
        title: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || ''),
        selectedSuit: '',
        selectedCard: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || ''),
        reversed: false,
        interpretation: '',
        image: null
      }))).map((cs) => ({
        title: cs.title || '',
        suit: cs.selectedSuit || cs.suit || '',
        card: cs.selectedCard || cs.card || cs.title || '',
        reversed: !!cs.reversed,
        interpretation: cs.interpretation || '',
        image: cs.image || null
      }))

      const readingData = {
        querent: selectedQuerent,
        spread: selectedSpread,
        image: uploadedImage,
        question: question,
        deck: selectedDeck,
        dateTime: readingDateTime,
        drawnCards,
        interpretation: interpretation,
        userId: user?._id
      }

      // If we don't have an id yet, create a new reading
      if (!readingId) {
        const res = await apiFetch('/api/readings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(readingData)
        })

        if (!res.ok) {
          const error = await res.json().catch(() => ({}))
          throw new Error(error.error || 'Failed to save reading')
        }

        const result = await res.json()
        if (result && result.reading && result.reading._id) {
          setReadingId(result.reading._id)
        }
        if (explicit) pushToast({ type: 'success', text: 'Reading saved successfully!' })
        return result
      }

      // Otherwise update existing reading. Note: server PUT currently updates question, interpretation, dateTime.
      const res = await apiFetch(`/api/readings/${readingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question, interpretation: interpretation, dateTime: readingDateTime })
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to update reading')
      }

      if (explicit) pushToast({ type: 'success', text: 'Reading updated.' })
      return await res.json()
    } catch (err) {
      console.error('Error saving/updating reading:', err)
      if (explicit) pushToast({ type: 'error', text: err.message || 'Failed to save reading' })
      return null
    } finally {
      if (explicit) setSavingReading(false)
    }
  }

  // Preserve previous API: form submit calls explicit save
  const handleSaveReading = async (e) => {
    e.preventDefault()
    await saveReading({ explicit: true })
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

  // Autosave effect: when enabled, debounce saves on relevant changes
  useEffect(() => {
    if (!autosaveEnabled) return
    // don't autosave until user is signed in
    const token = localStorage.getItem('token')
    if (!token) return

    // Build a small dependency fingerprint to detect changes that should trigger a save
    const trigger = JSON.stringify({ cardStates, question, interpretation, uploadedImage, selectedSpread, readingDateTime })

    const id = setTimeout(() => {
      // perform a non-explicit save (no spinner/toast unless error)
      saveReading({ explicit: false })
    }, 1000)

    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaveEnabled, cardStates, question, interpretation, uploadedImage, selectedSpread, readingDateTime])

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
        const cards = Array.isArray(data.cards) ? data.cards : []
        setSpreadCards(cards)
        // set spread display name (ensure we show the name, not an id)
        setSpreadName(data.spread || (isId ? '' : selectedSpread))
        // initialize cardStates to match the cards array length
        setCardStates(cards.map((c) => ({ title: typeof c === 'string' ? c : (c.name || c.title || ''), selectedSuit: '', selectedCard: '', reversed: false, interpretation: '', image: null })))
      } catch (err) {
        console.warn('Failed to load spread image', err)
        if (mounted) setSpreadImage(null)
      }
    }
    load()
    return () => { mounted = false }
  }, [selectedSpread])

  // camera handled by CameraModal component
  // When camera returns a data URL, auto-upload it to the server and attach to reading
  const handleCapturedImageUpload = async (dataUrl) => {
    if (!dataUrl) return
    setUploadedImage(dataUrl)
    setUploadedFile(null)
    try {
      setUploadingImage(true)
      const token = localStorage.getItem('token')
      if (!token) {
        pushToast({ type: 'error', text: 'Please sign in to attach images to readings.' })
        return
      }

      if (!readingId) {
        await saveReading({ explicit: false })
      }

      // Convert dataURL to Blob
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const name = `camera-${Date.now()}.jpg`
      const fileToUpload = new File([blob], name, { type: blob.type || 'image/jpeg' })

      const form = new FormData()
      form.append('image', fileToUpload)

      const uploadRes = await apiFetch(`/readings/${readingId}/image`, {
        method: 'POST',
        body: form
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}))
        throw new Error(err.error || 'Image upload failed')
      }

      const uploadResult = await uploadRes.json()
      if (uploadResult && uploadResult.image) {
        setUploadedImage(uploadResult.image)
        setUploadedFile(null)
        pushToast({ type: 'success', text: 'Camera image uploaded and attached to reading.' })
      }
    } catch (err) {
      console.error('Camera upload failed', err)
      pushToast({ type: 'error', text: err.message || 'Failed to upload camera image' })
    } finally {
      setUploadingImage(false)
    }
  }

  return (
    <AuthWrapper>
      <form id="reading" className="reading" onSubmit={handleSaveReading}>
  <Toasts toasts={toasts} onRemove={removeToast} />
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
                        setUploadedFile(f)
                      }} />
                    </label>

                    <button type="button" className="btn btn-outline-secondary mb-0" onClick={() => setShowCameraModal(true)}>Camera</button>

                    <button className="btn btn-tarot-primary" disabled={!uploadedImage || uploadingImage} onClick={async () => {
                      // Attach: upload image to server and persist permanent URL on reading
                      if (!uploadedImage) return
                      try {
                        setUploadingImage(true)
                        // Ensure reading exists (create if needed)
                        const token = localStorage.getItem('token')
                        if (!token) {
                          pushToast({ type: 'error', text: 'Please sign in to attach images to readings.' })
                          return
                        }

                        if (!readingId) {
                          // create reading quietly so we have an id to attach image to
                          await saveReading({ explicit: false })
                        }

                        // Prepare file to upload
                        let fileToUpload = uploadedFile
                        // If no File object (camera dataURL), convert dataURL to Blob
                        if (!fileToUpload && uploadedImage && uploadedImage.startsWith('data:')) {
                          const res = await fetch(uploadedImage)
                          const blob = await res.blob()
                          const name = `camera-${Date.now()}.jpg`
                          fileToUpload = new File([blob], name, { type: blob.type || 'image/jpeg' })
                        }

                        if (!fileToUpload) {
                          pushToast({ type: 'error', text: 'No uploadable image found.' })
                          return
                        }

                        const form = new FormData()
                        form.append('image', fileToUpload)

                        const uploadRes = await apiFetch(`/readings/${readingId}/image`, {
                          method: 'POST',
                          body: form
                        })

                        if (!uploadRes.ok) {
                          const err = await uploadRes.json().catch(() => ({}))
                          throw new Error(err.error || 'Image upload failed')
                        }

                        const uploadResult = await uploadRes.json()
                        if (uploadResult && uploadResult.image) {
                          setUploadedImage(uploadResult.image)
                          setUploadedFile(null)
                          pushToast({ type: 'success', text: 'Image uploaded and attached to reading.' })
                        }
                      } catch (err) {
                        console.error('Attach/upload failed', err)
                        pushToast({ type: 'error', text: err.message || 'Failed to upload image' })
                      } finally {
                        setUploadingImage(false)
                      }
                    }}>Attach</button>

                    <button className="btn btn-outline-danger" disabled={!uploadedImage} onClick={() => { setUploadedImage(null); /* legacy message cleared */ }}>Remove</button>
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
                  initialSelectedSuit={cardStates[idx]?.selectedSuit}
                  initialSelectedCard={cardStates[idx]?.selectedCard}
                  initialReversed={cardStates[idx]?.reversed}
                  initialInterpretation={cardStates[idx]?.interpretation}
                  initialImage={cardStates[idx]?.image}
                  onChange={(state) => {
                    setCardStates(prev => {
                      const copy = [...prev]
                      copy[idx] = { ...copy[idx], ...state }
                      return copy
                    })
                  }}
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
        <div className="d-flex align-items-center" style={{ gap: 12 }}>
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

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
            <input type="checkbox" checked={autosaveEnabled} onChange={(e) => setAutosaveEnabled(e.target.checked)} />
            <span style={{ fontSize: 12 }}>Autosave</span>
          </label>
        </div>
      </div>

      {/* Export/Share Actions */}
      <div className="mt-3 d-flex justify-content-center gap-2">
        <button 
          type="button" 
          className="btn btn-solid btn-solid-primary"
          onClick={handlePrintReading}
          disabled={exporting}
          title="Print reading"
        >
          Print
        </button>
        <button 
          type="button" 
          className="btn btn-solid btn-solid-secondary"
          onClick={handleExportReading}
          title="Export reading"
          disabled={exporting}
        >
          {exporting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Exporting...
            </>
          ) : (
            'Export'
          )}
        </button>
        <button 
          type="button" 
          className="btn btn-solid btn-solid-success"
          onClick={handleShareReading}
          disabled={exporting}
          title="Share reading"
        >
          Share
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

  <CameraModal show={showCameraModal} onClose={() => setShowCameraModal(false)} onCaptured={(dataUrl) => { setShowCameraModal(false); handleCapturedImageUpload(dataUrl) }} />
    </AuthWrapper>
  )
}
