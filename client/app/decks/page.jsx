'use client'

import { useEffect, useState } from 'react'
import AuthWrapper from '../../components/AuthWrapper'
import DeckModal from '../../components/DeckModal'
import { apiFetch } from '../../lib/api'
import { stripCdnToLocal } from '../../lib/cdn'

// Simple Toast component
function Toast({ message, type = 'info', onClose }) {
  if (!message) return null
  const bg = type === 'success' ? 'bg-success text-white' : type === 'error' ? 'bg-danger text-white' : 'bg-secondary text-white'
  return (
    <div style={{ position: 'fixed', right: 20, top: 20, zIndex: 2000 }}>
      <div className={`toast ${bg} p-2`} role="alert">
        <div className="d-flex">
          <div className="toast-body">{message}</div>
          <button type="button" className="btn-close btn-close-white ms-2 m-auto" aria-label="Close" onClick={onClose}></button>
        </div>
      </div>
    </div>
  )
}

export default function DecksPage() {
  const [decks, setDecks] = useState([])
  const [selectedDeck, setSelectedDeck] = useState('')
  const [deckDetails, setDeckDetails] = useState(null)
  const [loadingDeck, setLoadingDeck] = useState(false)
  const [showNewDeckModal, setShowNewDeckModal] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [newDeckDescription, setNewDeckDescription] = useState('')
  const [creatingDeck, setCreatingDeck] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'info' })
  const [uploadingCardIndex, setUploadingCardIndex] = useState(null)
  const [renamingCardIndex, setRenamingCardIndex] = useState(null)

  useEffect(() => {
    const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
    // Normalize base: remove trailing slashes and a trailing /api if present
    const apiBase = rawBase.replace(/\/+$|\/api$/i, '')

  async function loadDecks() {
      try {
    const res = await apiFetch('/api/decks')
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          console.error('Failed to fetch /api/decks:', res.status, text)
          setDecks([])
          return
        }

        const data = await res.json().catch(err => {
          console.error('Failed to parse JSON from /api/decks', err)
          return null
        })

        // Ensure we have an array to map over
        const arr = Array.isArray(data) ? data : (data && Array.isArray(data.decks) ? data.decks : [])

        const normalized = arr.map(d => ({
          _id: d._id || d.id || '',
          deckName: d.deckName || d.name || d.deck_name || 'Untitled'
        }))

        setDecks(normalized)
        if (normalized.length) setSelectedDeck(normalized[0]._id)
      } catch (err) {
        console.error('Failed to load decks', err)
        setDecks([])
      }
    }

    loadDecks()
  }, [])

  const handleSelectDeck = (deckId) => {
    setSelectedDeck(deckId)
    console.log(`Selected deck: ${deckId}`)
  }

  // Helper to normalize API base
  const getApiBase = () => {
    const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
    return rawBase.replace(/\/+$/g, '').replace(/\/api$/i, '')
  }

  // Load selected deck details (cards)
  useEffect(() => {
    if (!selectedDeck) {
      setDeckDetails(null)
      return
    }

    let cancelled = false
    async function loadDeck() {
      setLoadingDeck(true)
      try {
        const apiBase = getApiBase()
  const res = await apiFetch(`/api/decks/${selectedDeck}`)
        if (!res.ok) {
          console.error('Failed to fetch deck', res.status)
          setDeckDetails(null)
          setLoadingDeck(false)
          return
        }
        const data = await res.json()
        if (!cancelled) setDeckDetails(data)
      } catch (err) {
        console.error('Error loading deck details', err)
        if (!cancelled) setDeckDetails(null)
      } finally {
        if (!cancelled) setLoadingDeck(false)
      }
    }

    loadDeck()
    return () => { cancelled = true }
  }, [selectedDeck])

  // Upload a card image for a given card name
  const uploadCardImage = async (cardName, file) => {
    if (!selectedDeck || !file) return null
    try {
      const apiBase = getApiBase()
      const fd = new FormData()
      fd.append('card', file)
  // show uploading indicator by finding index
  const idx = deckDetails && Array.isArray(deckDetails.cards) ? deckDetails.cards.findIndex(c => (c.name||'').toLowerCase() === (cardName||'').toLowerCase()) : -1
  if (idx !== -1) setUploadingCardIndex(idx)
      const res = await apiFetch(`/api/decks/${selectedDeck}/card/${encodeURIComponent(cardName)}/upload`, {
        method: 'POST',
        body: fd
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Upload failed: ${res.status} ${txt}`)
      }
      const updated = await res.json()
  setToast({ message: 'Image uploaded', type: 'success' })
  setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
  setUploadingCardIndex(null)
      // Update local deckDetails state
      setDeckDetails(prev => {
        if (!prev) return prev
        const cards = Array.isArray(prev.cards) ? [...prev.cards] : []
        // match by name (case-insensitive)
        const idx = cards.findIndex(c => (c.name || '').toLowerCase() === (cardName || '').toLowerCase())
        if (idx !== -1) {
          cards[idx] = { ...cards[idx], ...updated }
        } else {
          cards.push(updated)
        }
        return { ...prev, cards }
      })
      return updated
    } catch (err) {
      console.error('Upload error', err)
      alert('Failed to upload image')
      return null
    }
  }

  // Rename a card
  const renameCard = async (oldName, newName) => {
    if (!selectedDeck || !oldName || !newName || oldName === newName) return null
    try {
      // client-side duplicate check
      if (deckDetails && Array.isArray(deckDetails.cards)) {
        const dup = deckDetails.cards.find(c => (c.name||'').toLowerCase() === (newName||'').toLowerCase())
        if (dup && (dup.name||'').toLowerCase() !== (oldName||'').toLowerCase()) {
          setToast({ message: 'Another card with that name already exists', type: 'error' })
          setTimeout(() => setToast({ message: '', type: 'info' }), 3000)
          return null
        }
      }
      const apiBase = getApiBase()
      const idx = deckDetails && Array.isArray(deckDetails.cards) ? deckDetails.cards.findIndex(c => (c.name||'').toLowerCase() === (oldName||'').toLowerCase()) : -1
      if (idx !== -1) setRenamingCardIndex(idx)
      const res = await apiFetch(`/api/decks/${selectedDeck}/card/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName })
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        if (res.status === 409) {
          setToast({ message: 'Duplicate card name', type: 'error' })
        } else {
          setToast({ message: 'Rename failed', type: 'error' })
        }
        setTimeout(() => setToast({ message: '', type: 'info' }), 3000)
        setRenamingCardIndex(null)
        throw new Error(`Rename failed: ${res.status} ${txt}`)
      }
      const body = await res.json()
      const updatedCard = body.card
      setDeckDetails(prev => {
        if (!prev) return prev
        const cards = Array.isArray(prev.cards) ? prev.cards.map(c => ((c.name || '').toLowerCase() === (oldName || '').toLowerCase() ? { ...c, name: updatedCard.name } : c)) : []
        return { ...prev, cards }
      })
      setToast({ message: 'Card renamed', type: 'success' })
      setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
      setRenamingCardIndex(null)
      return updatedCard
    } catch (err) {
      console.error('Rename error', err)
      setToast({ message: 'Failed to rename card', type: 'error' })
      setTimeout(() => setToast({ message: '', type: 'info' }), 3000)
      return null
    }
  }

  const handleNewDeck = async () => {
    setNewDeckName('')
    setNewDeckDescription('')
    setShowNewDeckModal(true)
  }

  const createDeck = async () => {
    const name = (newDeckName || '').trim()
    if (!name) return
    setCreatingDeck(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('You must be signed in to create a deck')
        setCreatingDeck(false)
        return
      }
      const res = await apiFetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckName: name, description: newDeckDescription || '', cards: [] })
      })
      if (!res.ok) throw new Error('Failed to create deck')
      const created = await res.json()
      setDecks(prev => [created, ...prev])
      setSelectedDeck(created._id)
      setShowNewDeckModal(false)
    } catch (err) {
      console.error(err)
      if (err.message && err.message.includes('401')) {
        alert('Unauthorized: please sign in and try again')
        window.location.href = '/auth'
      } else {
        alert('Could not create deck')
      }
    } finally {
      setCreatingDeck(false)
    }
  }

  return (
    <AuthWrapper>
      <div className="reading text-center my-4">
        <h2>Decks</h2>
      </div>

      <div className="row justify-content-center mb-4">
        <div className="col-md-6">
          <div className="d-flex align-items-center gap-3">
            <div style={{ minWidth: 120 }}>
              <label className="form-label mb-0 deck-select-label">Choose Deck</label>
            </div>

            <div style={{ flex: '1 1 auto' }}>
              <select
                className="form-select deck-select-input"
                value={selectedDeck}
                onChange={(e) => handleSelectDeck(e.target.value)}
              >
                {decks.length === 0 ? (
                  <option disabled>{'Loading decks...'}</option>
                ) : (
                  decks.map(d => (
                    <option key={d._id} value={d._id}>{d.deckName}</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <button className="btn btn-tarot-primary btn-new-deck" onClick={handleNewDeck}>
                New Deck
              </button>
            </div>
          </div>
        </div>
      </div>
      <DeckModal
        show={showNewDeckModal}
        onClose={() => setShowNewDeckModal(false)}
        onSave={createDeck}
        loading={creatingDeck}
        name={newDeckName}
        description={newDeckDescription}
        onNameChange={setNewDeckName}
        onDescriptionChange={setNewDeckDescription}
      />
        {/* Deck card grid */}
        <div className="row justify-content-center">
          <div className="col-12 col-md-10">
            {loadingDeck ? (
              <div className="text-center">Loading deck...</div>
            ) : deckDetails && Array.isArray(deckDetails.cards) ? (
              <div className="row g-3">
                {deckDetails.cards.map((card, i) => {
                  const hasImage = card && card.image
                  const inputId = `card-upload-${i}`
                  const isUploading = uploadingCardIndex === i
                  const isRenaming = renamingCardIndex === i
                  const imgSrc = hasImage ? stripCdnToLocal(card.image) : null
                  return (
                    <div className="col-6 col-sm-4 col-md-3" key={(card && card.name) || i}>
                      <div className="card p-2 h-100">
                        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#f8f9fa' }}>
                          {hasImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imgSrc}
                              alt={card.name || 'card'}
                              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                try {
                                  const el = e.currentTarget
                                  // avoid infinite loop
                                  el.onerror = null
                                  const url = imgSrc || ((card && card.image) || '')
                                  // If the URL contains an /images/ path, use the local path as fallback
                                  const idx = url.indexOf('/images/')
                                  let fallback = ''
                                  if (idx !== -1) {
                                    fallback = url.slice(idx)
                                  } else {
                                    const idx2 = url.indexOf('/client/public')
                                    if (idx2 !== -1) {
                                      // convert /.../client/public/images/... to /images/...
                                      fallback = url.slice(idx2 + '/client/public'.length)
                                    } else if (url.includes('rider-waite-tarot')) {
                                      // last resort: take the filename and map to /images/rider-waite-tarot/<file>
                                      const parts = url.split('/')
                                      const file = parts[parts.length - 1] || ''
                                      if (file) fallback = '/images/rider-waite-tarot/' + file
                                    }
                                  }
                                  if (!fallback) {
                                    // inline SVG placeholder
                                    fallback = 'data:image/svg+xml;utf8,' + encodeURIComponent(
                                      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="#f8f9fa"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6c757d" font-family="Arial, sans-serif" font-size="16">Image unavailable</text></svg>`
                                    )
                                  }
                                  el.src = fallback
                                } catch (err) {
                                  // ignore
                                }
                              }}
                            />
                          ) : (
                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => document.getElementById(inputId)?.click()}>
                                  {isUploading ? (<span className="spinner-border spinner-border-sm"></span>) : 'Upload'}
                                </button>
                              <input id={inputId} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                const file = e.target.files && e.target.files[0]
                                if (!file) return
                                await uploadCardImage(card.name || `card-${i}`, file)
                                // reset input
                                e.target.value = ''
                              }} />
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-center small text-truncate" title={card && card.name}>
                            <CardNameEditor
                              card={card}
                              onSave={async (newName) => {
                                // if name didn't change do nothing
                                if (!newName || newName.trim() === (card && card.name)) return
                                await renameCard(card.name, newName.trim())
                              }}
                              saving={isRenaming}
                            />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : selectedDeck ? (
              <div className="text-center">No cards found for this deck.</div>
            ) : null}
          </div>
        </div>
  {/* debug removed */}
    </AuthWrapper>
  )
}

function CardNameEditor({ card, onSave, saving = false }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(card && card.name)

  useEffect(() => { setValue(card && card.name) }, [card])

  if (!editing) {
    return (
      <div>
        <div className="text-truncate">{card && card.name}</div>
        <div className="mt-1">
          <button className="btn btn-link btn-sm p-0 me-2" onClick={() => setEditing(true)}>Edit</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <input className="form-control form-control-sm mb-1" value={value || ''} onChange={(e) => setValue(e.target.value)} />
      <div className="d-flex justify-content-center gap-2">
        <button className="btn btn-sm btn-primary" onClick={async () => { await onSave(value); setEditing(false) }} disabled={saving}>
          {saving ? <span className="spinner-border spinner-border-sm me-1"></span> : null}
          Save
        </button>
        <button className="btn btn-sm btn-secondary" onClick={() => { setValue(card && card.name); setEditing(false) }} disabled={saving}>Cancel</button>
      </div>
    </div>
  )
}
