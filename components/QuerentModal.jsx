'use client'

import React, { useEffect, useRef } from 'react'

export default function QuerentModal({ show, onClose, onSave, loading = false, value = '', onChange }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (show) {
      // small timeout ensures input is mounted before focusing
      const t = setTimeout(() => {
        try { inputRef.current && inputRef.current.focus && inputRef.current.focus() } catch (e) {}
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
      <div className="card" style={{ width: '520px', maxWidth: '95%' }}>
        <div className="card-body">
          <h5 className="card-title">Add Querent</h5>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Querent name</label>
              <input ref={inputRef} className="form-control" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Enter name" />
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading || !value || value.trim().length === 0}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> : null}
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
