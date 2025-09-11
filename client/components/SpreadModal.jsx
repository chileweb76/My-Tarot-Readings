'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

export default function SpreadModal({ show, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [number, setNumber] = useState(3)
  const [cards, setCards] = useState([])
  const [meanings, setMeanings] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (show) {
      setName('')
      setNumber(3)
      setCards([])
      setMeanings([])
      setError(null)
    }
  }, [show])

  useEffect(() => {
    // ensure arrays match number
    setCards(prev => {
      const next = Array.from({ length: number }, (_, i) => prev[i] || `Card ${i+1}`)
      return next
    })
  }, [number])

  const handleCardNameChange = (idx, val) => {
    setCards(prev => {
      const copy = [...prev]
      copy[idx] = val
      return copy
    })
  }

  const handleCreate = async () => {
    setSaving(true)
    setError(null)
    try {
      // include a hidden image field for custom spreads that points to the public static asset
  const payload = { spread: name, cards, numberofCards: number, image: '/images/spreads/custom.png' }
      const res = await apiFetch('/spreads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create spread')
      }
      const data = await res.json()
      // notify other components
      try { window.dispatchEvent(new CustomEvent('spreadsUpdated', { detail: data })) } catch (e) {}
      if (onCreated) onCreated(data)
      onClose()
    } catch (e) {
      setError(e.message || 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (!show) return null

  return (
    <div className="modal show d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create Custom Spread</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="mb-3">
              <label className="form-label">Spread name</label>
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label">Number of cards</label>
              <input type="number" className="form-control" value={number} min={1} max={20} onChange={(e) => setNumber(Math.max(1, Number(e.target.value || 1)))} />
            </div>

            <div className="mb-3">
              <label className="form-label">Card names</label>
              {cards.map((c, i) => (
                <input key={i} className="form-control mb-2" value={c} onChange={(e) => handleCardNameChange(i, e.target.value)} />
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={saving || !name}>Create</button>
          </div>
        </div>
      </div>
    </div>
  )
}
