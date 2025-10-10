import React from 'react'

// Shared modals used by export flows across pages
export function LargeImageWarningModal({ info, getImageSizeLimitBytes, onClose }) {
  if (!info) return null
  const { size, humanSize, resolve } = info
  const handleCancel = () => { resolve(false); if (onClose) onClose() }
  const handleContinue = () => { resolve(true); if (onClose) onClose() }
  return (
    <div className="modal show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Large image detected</h5>
            <button type="button" className="btn-close" onClick={handleCancel} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p>The image you are about to include is large ({humanSize}). Embedding it as a data URL may produce a very large export and could be slow or fail.</p>
            <div className="export-notice export-notice--muted" style={{ marginTop: 8 }}>Print/Export before pushing save button or retrieve from Readings page</div>
            {typeof getImageSizeLimitBytes === 'function' && (<p>Current configured limit: {(getImageSizeLimitBytes() / 1024 / 1024).toFixed(2)} MB</p>)}
            <p>Do you want to continue converting this image?</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleContinue}>Continue</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ExportSignInModal({ show, onClose }) {
  if (!show) return null
  return (
    <div className="modal show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Sign in required</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p>To export this reading with the attached image, please sign in so the image can be uploaded. You may sign in and then retry the export.</p>
            <div className="export-notice export-notice--muted" style={{ marginTop: 8 }}>Print/Export before pushing save button or retrieve from Readings page</div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => { window.location.href = '/auth' }}>Sign in</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ExportModals = { LargeImageWarningModal, ExportSignInModal }
export default ExportModals
