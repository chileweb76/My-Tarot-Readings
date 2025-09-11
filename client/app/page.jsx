"use client"

import { useEffect, useState, useRef } from 'react'
import AuthWrapper from '../components/AuthWrapper'
import { apiFetch } from '../lib/api'
import QuerentModal from '../components/QuerentModal'
import SpreadSelect from '../components/SpreadSelect'
import SpreadModal from '../components/SpreadModal'

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
  const [uploadedImage, setUploadedImage] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [message, setMessage] = useState(null)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

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
      } catch (err) {
        console.warn('Failed to load spread image', err)
        if (mounted) setSpreadImage(null)
      }
    }
    load()
    return () => { mounted = false }
  }, [selectedSpread])

  // start/stop camera when modal opens/closes
  useEffect(() => {
    let mounted = true
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (!mounted) {
          // stop immediately
          try { s.getTracks().forEach(t => t.stop()) } catch (e) {}
          return
        }
        streamRef.current = s
        if (videoRef.current) videoRef.current.srcObject = s
      } catch (err) {
        console.warn('Camera start failed', err)
        setMessage({ type: 'error', text: 'Unable to access camera.' })
        setShowCameraModal(false)
      }
    }
    if (showCameraModal) start()
    return () => { mounted = false }
  }, [showCameraModal])

  return (
    <AuthWrapper>
      <div id="reading" className="reading">
        {message && (
          <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`} role="alert">
            {message.text}
          </div>
        )}
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

          <button className="btn btn-tarot-primary btn-sm" id="addQuerentBtn" onClick={() => { setAddingQuerent(true); setNewQuerentName('') }}>Add</button>
        </div>
        
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
                        // optional: upload to server
                        // await uploadImageToServer(f)
                      }} />
                    </label>

                    <button type="button" className="btn btn-outline-secondary mb-0" onClick={() => setShowCameraModal(true)}>Camera</button>

                    <button className="btn btn-tarot-primary" disabled={!uploadedImage || uploadingImage} onClick={async () => {
                      // preview-only attach: mark image for later reading save; no server upload yet
                      if (!uploadedImage) return
                      setMessage({ type: 'success', text: 'Image attached to reading (preview only).' })
                    }}>Attach</button>

                    <button className="btn btn-outline-danger" disabled={!uploadedImage} onClick={() => { setUploadedImage(null); setMessage(null) }}>Remove</button>
                  </div>
                </div>
                <div className="card-footer small text-muted">Reading image (upload or camera)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    
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

      {/* Camera modal */}
      {showCameraModal && (
        <div className="modal show d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-md" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Capture Image</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={async () => { 
                  // stop stream
                  try { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()) } } catch(e) {}
                  streamRef.current = null
                  setShowCameraModal(false)
                }}></button>
              </div>
              <div className="modal-body text-center">
                <div style={{ width: '100%', height: 360, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <video ref={videoRef} autoPlay playsInline style={{ maxWidth: '100%', maxHeight: 360 }} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={async () => {
                  // stop and close
                  try { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()) } } catch(e) {}
                  streamRef.current = null
                  setShowCameraModal(false)
                }}>Cancel</button>
                <button className="btn btn-primary" onClick={async () => {
                  // capture snapshot
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
                    setUploadedImage(dataUrl)
                    // stop camera
                    try { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()) } } catch(e) {}
                    streamRef.current = null
                    setShowCameraModal(false)
                    setMessage({ type: 'success', text: 'Image captured (preview only).' })
                  } catch (err) {
                    console.error('Capture failed', err)
                    setMessage({ type: 'error', text: 'Failed to capture image.' })
                  }
                }}>Capture</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthWrapper>
  )
}
