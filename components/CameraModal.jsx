"use client"

import { useEffect, useRef, useState } from 'react'
import { notify } from '../lib/toast'

export default function CameraModal({ show, onClose, onCaptured }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraError, setCameraError] = useState(null)
  const attemptRef = useRef(false)
  const notifiedRef = useRef(false)

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
    }
    return () => {
      mounted = false
      attemptRef.current = false
      notifiedRef.current = false
      try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()) } catch (e) {}
    }
  }, [show])

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
                </div>
              </div>
            )}
          </div>
          <div className="px-3 pb-2 text-center text-muted" style={{ fontSize: '0.9rem' }}>
            Note: images larger than <strong>{Number.isFinite(imageLimitMb) ? imageLimitMb.toFixed(1) : '5.0'} MB</strong> will prompt for confirmation when embedding in exports.
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => { try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()) } catch(e) {} ; if (onClose) onClose() }}>Cancel</button>
            <button className="btn btn-primary" onClick={() => {
              try {
                const video = videoRef.current
                if (!video) return
                const w = video.videoWidth || 640
                const h = video.videoHeight || 480
                const canvas = document.createElement('canvas')
                canvas.width = w
                canvas.height = h
                const ctx = canvas.getContext('2d')
                ctx.drawImage(video, 0, 0, w, h)
                const dataUrl = canvas.toDataURL('image/png')
                try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()) } catch(e) {}
                if (onCaptured) onCaptured(dataUrl)
                if (onClose) onClose()
                notify({ type: 'success', text: 'Image captured (preview only).' })
              } catch (err) {
                console.error('Capture failed', err)
                notify({ type: 'error', text: 'Failed to capture image.' })
              }
            }}>Capture</button>
          </div>
        </div>
      </div>
    </div>
  )
}
