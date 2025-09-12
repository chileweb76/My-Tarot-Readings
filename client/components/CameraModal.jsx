"use client"

import { useEffect, useRef } from 'react'

export default function CameraModal({ show, onClose, onCaptured, setMessage }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    let mounted = true
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (!mounted) {
          try { s.getTracks().forEach(t => t.stop()) } catch (e) {}
          return
        }
        streamRef.current = s
        if (videoRef.current) videoRef.current.srcObject = s
      } catch (err) {
        console.warn('Camera start failed', err)
        if (setMessage) setMessage({ type: 'error', text: 'Unable to access camera.' })
        if (onClose) onClose()
      }
    }
    if (show) start()
    return () => { mounted = false; try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()) } catch (e) {} }
  }, [show, onClose, setMessage])

  if (!show) return null

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
                if (setMessage) setMessage({ type: 'success', text: 'Image captured (preview only).' })
              } catch (err) {
                console.error('Capture failed', err)
                if (setMessage) setMessage({ type: 'error', text: 'Failed to capture image.' })
              }
            }}>Capture</button>
          </div>
        </div>
      </div>
    </div>
  )
}
