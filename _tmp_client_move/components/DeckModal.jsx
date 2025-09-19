 'use client'

import React, { useEffect, useRef } from 'react'

export default function DeckModal({ show, onClose, onSave, loading = false, name = '', description = '', onNameChange, onDescriptionChange }) {
  const nameRef = useRef(null)

  useEffect(() => {
    if (show) {
      const t = setTimeout(() => {
        try { nameRef.current && nameRef.current.focus && nameRef.current.focus() } catch (e) {}
      }, 20)
      return () => clearTimeout(t)
    }
  }, [show])

  if (!show) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (loading) return
    onSave()
  }

  return (
    <div className="confirm-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '560px', maxWidth: '95%' }}>
        <div className="card-body">
          <h5 className="card-title">Create New Deck</h5>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Name of deck</label>
              <input ref={nameRef} className="form-control" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Enter deck name" />
            </div>

            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea className="form-control" value={description} onChange={(e) => onDescriptionChange(e.target.value)} placeholder="Optional description" />
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading || !name || !name.trim()}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> : null}
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
