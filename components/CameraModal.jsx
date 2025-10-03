"use client"

import { useEffect, useRef, useState } from 'react'
import { notify } from '../lib/toast'
import { uploadImageToBlob } from '../lib/blobUpload'
import { prepareImageForUpload } from '../lib/imageUploader'

export default function CameraModal({ show, onClose, onCaptured }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraError, setCameraError] = useState(null)
  const attemptRef = useRef(false)
  const notifiedRef = useRef(false)
  const [diag, setDiag] = useState(null)
  const [showDiagPanel, setShowDiagPanel] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let mounted = true
    const start = async () => {
      // Prevent multiple concurrent attempts (parent may re-render and recreate handlers)
      if (attemptRef.current) return
      attemptRef.current = true
      try {
        // Try to query permissions but do not treat it as authoritative in all browsers
        let permState = null
        try {
          if (navigator.permissions && navigator.permissions.query) {
            const p = await navigator.permissions.query({ name: 'camera' })
            permState = p.state
            console.log('Camera permission state:', permState)
          }
        } catch (e) {
          // ignore permission API failures
          console.warn('Permissions API query failed', e)
        }

        // Try to acquire the camera regardless of Permissions API state because desktop
        // browsers sometimes misreport. We will handle errors from getUserMedia gracefully
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
          if (!mounted) {
            try { s.getTracks().forEach(t => t.stop()) } catch (e) {}
            return
          }
          streamRef.current = s
          if (videoRef.current) videoRef.current.srcObject = s
          // Clear any previous error/notifications on success
          setCameraError(null)
          notifiedRef.current = false
          return
        } catch (gmErr) {
          console.warn('getUserMedia failed after permissions check', gmErr)
          // Fall through to unified error handling below
          throw gmErr
        }
      } catch (err) {
        console.warn('Camera start failed', err)
        setCameraError(err)

        // Only notify once per modal open to avoid spamming toasts
        if (!notifiedRef.current) {
          if (err && err.name === 'NotAllowedError') {
            notify({ type: 'error', text: 'Camera permission denied. Please allow camera access to use this feature.' })
          } else if (err && err.name === 'NotFoundError') {
            notify({ type: 'error', text: 'No camera found on this device.' })
          } else {
            notify({ type: 'error', text: 'Unable to access camera. Please check your camera permissions.' })
          }
          notifiedRef.current = true
        }

        // Don't auto-close modal on desktop - let user take action
      }
    }
    if (show) {
      // reset attempt/notify flags when modal opens so user can retry manually
      attemptRef.current = false
      notifiedRef.current = false
      start()
      // run diagnostics automatically to gather permission/policy info
      try { runDiagnostics().then(r => setDiag(r)).catch(() => {}) } catch(e) {}
    }
    return () => {
      mounted = false
      attemptRef.current = false
      notifiedRef.current = false
      try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()) } catch (e) {}
    }
  }, [show])

  // Diagnostics: gather info useful for investigating Permissions Policy issues
  async function runDiagnostics() {
    const out = {
      ts: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      inIframe: (typeof window !== 'undefined') ? (window.top !== window.self) : null,
      permissionsQuery: null,
      enumerateDevices: null,
      headers: {}
    }

    // Permissions API
    try {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const p = await navigator.permissions.query({ name: 'camera' })
          out.permissionsQuery = { state: p.state }
        } catch (pq) {
          out.permissionsQuery = { error: pq && pq.message ? pq.message : String(pq) }
        }
      } else {
        out.permissionsQuery = { supported: false }
      }
    } catch (e) {
      out.permissionsQuery = { error: e && e.message ? e.message : String(e) }
    }

    // enumerateDevices (may have empty labels if no permission)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices()
        out.enumerateDevices = devices.map(d => ({ kind: d.kind, label: d.label, id: d.deviceId }))
      } else {
        out.enumerateDevices = { supported: false }
      }
    } catch (e) {
      out.enumerateDevices = { error: e && e.message ? e.message : String(e) }
    }

    // Fetch response headers from same-origin HEAD request to detect Permissions-Policy
    try {
      const resp = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
      const names = ['permissions-policy', 'feature-policy', 'permissions-policy-report-only', 'feature-policy-report-only']
      names.forEach(n => {
        const v = resp.headers.get(n)
        if (v) out.headers[n] = v
      })
      // include any known header variants
      Array.from(resp.headers.keys()).forEach(k => { if (!out.headers[k]) out.headers[k] = resp.headers.get(k) })
    } catch (e) {
      out.headers.error = e && e.message ? e.message : String(e)
    }

    return out
  }

  if (!show) return null
  // Determine current image size limit (MB) from localStorage or build-time env
  let imageLimitMb = 5.0
  try {
    const v = typeof window !== 'undefined' ? localStorage.getItem('IMAGE_SIZE_LIMIT_MB') : null
    if (v) imageLimitMb = parseFloat(v)
    else if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_IMAGE_SIZE_LIMIT_MB) imageLimitMb = parseFloat(process.env.NEXT_PUBLIC_IMAGE_SIZE_LIMIT_MB)
  } catch (e) { /* ignore */ }

  return (
    <div className="modal show d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-md" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Capture Image</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={() => { try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()) } catch(e) {} ; if (onClose) onClose() }}></button>
          </div>
          <div className="modal-body text-center">
            <div style={{ width: '100%', height: 360, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video ref={videoRef} autoPlay playsInline style={{ maxWidth: '100%', maxHeight: 360 }} />
            </div>

            {/* When camera failed to start, show inline helpful instructions */}
            {cameraError && (
              <div className="mt-3 text-start">
                <h6>Can't access your camera?</h6>
                <p className="small text-muted">Desktop browsers sometimes block camera access until you explicitly allow it for this site. Try the steps below:</p>
                <ol className="small">
                  <li>Open your browser's site settings for this page (click the padlock in the address bar).</li>
                  <li>Ensure Camera permission is set to <strong>Allow</strong>.</li>
                  <li>If you changed settings, reload this page and re-open the camera.</li>
                </ol>
                <div className="d-flex gap-2 mt-2">
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => {
                    try { navigator.clipboard.writeText(window.location.origin); notify({ type: 'success', text: 'Origin copied to clipboard' }) } catch(e) { notify({ type: 'error', text: 'Failed to copy origin' }) }
                  }}>Copy site origin</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    try { window.open(window.location.origin, '_blank') } catch(e) { notify({ type: 'error', text: 'Failed to open settings tab' }) }
                  }}>Open site in new tab</button>
                  <button className="btn btn-outline-info btn-sm ms-auto" onClick={() => setShowDiagPanel(!showDiagPanel)}>{showDiagPanel ? 'Hide diagnostics' : 'Show diagnostics'}</button>
                </div>
              </div>
            )}

            {/* Diagnostics panel (visible when diagnostics have been collected) */}
            {diag && showDiagPanel && (
              <div className="mt-3 text-start">
                <h6>Diagnostics</h6>
                <div className="d-flex gap-2 mb-2">
                  <button className="btn btn-sm btn-outline-secondary" onClick={async () => {
                    try { await navigator.clipboard.writeText(JSON.stringify(diag, null, 2)); notify({ type: 'success', text: 'Diagnostics copied to clipboard' }) } catch (e) { notify({ type: 'error', text: 'Failed to copy diagnostics' }) }
                  }}>Copy diagnostics</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowDiagPanel(false)}>Close</button>
                </div>
                <pre style={{ maxHeight: 240, overflow: 'auto', background: '#f8f9fa', padding: 12, borderRadius: 6 }}>{JSON.stringify(diag, null, 2)}</pre>
              </div>
            )}
          </div>
          <div className="px-3 pb-2 text-center text-muted" style={{ fontSize: '0.9rem' }}>
            Note: images larger than <strong>{Number.isFinite(imageLimitMb) ? imageLimitMb.toFixed(1) : '5.0'} MB</strong> will prompt for confirmation when embedding in exports.
          </div>
            <div className="modal-footer">
            <button className="btn btn-secondary" disabled={uploading} onClick={() => { try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()) } catch(e) {} ; if (onClose) onClose() }}>Cancel</button>
            <button className="btn btn-primary" disabled={uploading} onClick={async () => {
              try {
                setUploading(true)
                const video = videoRef.current
                if (!video) return
                const w = video.videoWidth || 1280
                const h = video.videoHeight || 720
                const canvas = document.createElement('canvas')
                canvas.width = w
                canvas.height = h
                const ctx = canvas.getContext('2d')
                ctx.drawImage(video, 0, 0, w, h)

                // Convert canvas to blob and prepare file with shared helper
                const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
                if (!blob) throw new Error('Failed to create image blob')
                const prep = await prepareImageForUpload(blob)
                if (!prep.success) {
                  notify({ type: 'error', text: prep.error || 'Captured image not acceptable' })
                  throw new Error(prep.error || 'Captured image not acceptable')
                }

                const file = prep.file
                notify({ type: 'info', text: 'Uploading captured image...' })
                const tempReadingId = `temp-${Date.now()}`
                const result = await uploadImageToBlob(tempReadingId, file)
                if (!result.success) {
                  notify({ type: 'error', text: 'Upload failed: ' + (result.error || 'unknown') })
                  throw new Error(result.error || 'Upload failed')
                }

                const imageUrl = result.url || result.image || null
                try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()) } catch(e) {}
                if (onCaptured) onCaptured(imageUrl)
                if (onClose) onClose()
                notify({ type: 'success', text: 'Image captured and uploaded.' })
              } catch (err) {
                console.error('Capture failed', err)
                notify({ type: 'error', text: 'Failed to capture or upload image.' })
              } finally {
                setUploading(false)
              }
            }}>
              {uploading ? (<><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Uploading...</>) : 'Capture'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
