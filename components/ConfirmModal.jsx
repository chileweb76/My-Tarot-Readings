 'use client'

import React from 'react'

export default function ConfirmModal({ show, title, body, confirmText = 'Confirm', onConfirm, onCancel, loading = false, confirmDisabled = false }) {
  if (!show) return null

  return (
    <div className="confirm-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '680px', maxWidth: '90%' }}>
        <div className="card-body">
          <h5 className="card-title">{title}</h5>
          <p className="card-text">{body}</p>

          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={loading || confirmDisabled}>
              {loading ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              ) : null}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
