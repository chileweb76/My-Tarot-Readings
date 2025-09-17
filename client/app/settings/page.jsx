'use client'

import { useState, useEffect } from 'react'
import AuthWrapper from '../../components/AuthWrapper'
import ConfirmModal from '../../components/ConfirmModal'
import { notify } from '../../lib/toast'
import { apiFetch } from '../../lib/api'

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    dailyReading: false,
    privateReadings: true,
    theme: 'dark',
    language: 'en'
  })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  // Simple UI for image export limit
  const ImageLimitSection = () => (
    <div className="card mb-3">
      <div className="card-body">
        <h5 className="card-title">Export image settings</h5>
        <p className="card-text">Configure when images should prompt for confirmation before embedding in exports.</p>
        <div className="d-flex align-items-center" style={{ gap: 12 }}>
          <input type="number" step="0.1" min="0.1" className="form-control" style={{ width: 160 }} value={imageLimitMb} onChange={(e) => setImageLimitMb(parseFloat(e.target.value))} />
          <div>
            <button className="btn btn-primary" onClick={saveImageLimit}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }))
  }

  const handleSaveSettings = () => {
    // Here you would save settings to the backend
    console.log('Saving settings:', settings)
    alert('Settings saved successfully!')
  }

  // IMAGE size limit control (client-side only)
  const [imageLimitMb, setImageLimitMb] = useState(() => {
    try { return parseFloat(localStorage.getItem('IMAGE_SIZE_LIMIT_MB')) || 2.0 } catch (e) { return 2.0 }
  })

  const saveImageLimit = () => {
    try {
      localStorage.setItem('IMAGE_SIZE_LIMIT_MB', String(imageLimitMb))
      // notify other windows/components
      try { window.dispatchEvent(new Event('imageSizeLimitChanged')) } catch (e) {}
      notify({ type: 'success', text: `Image size limit set to ${imageLimitMb} MB` })
    } catch (e) {
      notify({ type: 'error', text: 'Failed to save image limit' })
    }
  }

  const [usernameForm, setUsernameForm] = useState({ username: '' })
  const [pictureFile, setPictureFile] = useState(null)
  const [picturePreview, setPicturePreview] = useState(null)
  const [previewLoaded, setPreviewLoaded] = useState(true)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', verifyPassword: '' })
  // legacy per-page message state removed; use notify() for toasts
  const [loading, setLoading] = useState(false)
  // Add a local `message` state for inline alerts (keeps backwards compatibility)
  const [message, setMessage] = useState(null)
  const [linking, setLinking] = useState(false)
  const [querents, setQuerents] = useState([])
  const [selectedQuerentId, setSelectedQuerentId] = useState('')
  const [showDeleteQuerentModal, setShowDeleteQuerentModal] = useState(false)
  const [deleteQuerentVerifyName, setDeleteQuerentVerifyName] = useState('')
  const [loadingDeleteQuerent, setLoadingDeleteQuerent] = useState(false)
  const [decks, setDecks] = useState([])
  const [selectedDeckId, setSelectedDeckId] = useState('')
  const [showDeleteDeckModal, setShowDeleteDeckModal] = useState(false)
  const [deleteDeckVerifyName, setDeleteDeckVerifyName] = useState('')
  const [loadingDeleteDeck, setLoadingDeleteDeck] = useState(false)
  const [spreads, setSpreads] = useState([])
  const [selectedSpreadId, setSelectedSpreadId] = useState('')
  const [showDeleteSpreadModal, setShowDeleteSpreadModal] = useState(false)
  const [deleteSpreadVerifyName, setDeleteSpreadVerifyName] = useState('')
  const [loadingDeleteSpread, setLoadingDeleteSpread] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState('')
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('')
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

  // Normalize API base (remove trailing slashes and trailing /api if present)
  const getApiBase = () => {
    const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
    return raw.replace(/\/+$/g, '').replace(/\/api$/i, '')
  }

  useEffect(() => {
    if (user) setUsernameForm({ username: user.username })
    // prefer the small/thumb variants for preview if present
    if (user) {
      const rawPreview = user.profilePictureSmall || user.profilePictureThumb || user.profilePicture || null
      const normalize = (src) => {
        if (!src) return null
        try {
          const u = new URL(src)
          if (u.protocol && u.hostname) return src
        } catch (e) {}
        if (src.startsWith('/uploads/')) {
          const raw = process.env.NEXT_PUBLIC_API_URL || ''
          const apiBase = raw.replace(/\/api\/?$/i, '').replace(/\/$/, '') || window.location.origin
          return `${apiBase}${src}`
        }
        return src
      }
      const preview = normalize(rawPreview)
      if (typeof setPicturePreview === 'function') {
        setPicturePreview(preview)
      } else {
        // defensive: if the hook setter isn't available (unexpected), log for diagnosis
        // this shouldn't happen in normal React rendering
        // eslint-disable-next-line no-console
        console.warn('setPicturePreview is not a function at init', setPicturePreview)
      }
  // load querents for this user
  ;(async () => {
        try {
          const res = await apiFetch('/querents')
          if (!res.ok) return
          const data = await res.json()
          if (data.querents) {
            setQuerents(data.querents)
            if (data.querents.length) setSelectedQuerentId(data.querents[0]._id)
          }
        } catch (err) {
          console.warn('Failed to load querents', err)
        }
  })();
  // load decks for this user (only user-owned decks)
  ;(async () => {
          try {
            const res = await apiFetch('/api/decks')
            if (!res.ok) return
            const data = await res.json()
            const list = Array.isArray(data) ? data : (data.decks || [])
            
            // Filter to only show decks owned by the current user
            const userId = user && (user._id || user.id) ? String(user._id || user.id) : null
            const userOwnedDecks = list.filter(deck => {
              // Explicitly exclude Rider-Waite Tarot deck
              if (deck.deckName === 'Rider-Waite Tarot Deck') {
                return false
              }
              
              // If deck has an owner field, check if it matches current user
              if (deck.owner) {
                return String(deck.owner) === userId
              }
              
              // Exclude system decks (owner: null) and other decks without owner
              return false
            })
            
            setDecks(userOwnedDecks)
            if (userOwnedDecks.length) setSelectedDeckId(userOwnedDecks[0]._id)
          } catch (err) {
            console.warn('Failed to load decks', err)
          }
  })()
  // load spreads and pick user's custom spreads
  ;(async () => {
          try {
            const res = await apiFetch('/spreads')
            if (!res.ok) return
            const data = await res.json()
            // filter custom spreads owned by this user
            const meId = user && (user._id || user.id) ? String(user._id || user.id) : null
            const mySpreads = Array.isArray(data) ? data.filter(s => s.isCustom && s.owner && String(s.owner) === meId) : []
            setSpreads(mySpreads)
            if (mySpreads.length) setSelectedSpreadId(mySpreads[0]._id)
          } catch (err) {
            console.warn('Failed to load spreads', err)
          }
        })()
    }
  }, [user])

  const handleLinkGoogle = () => {
  // legacy message cleared
    setLinking(true)
    const oauthUrl = `${API_URL}/auth/google`
    const width = 600
    const height = 700
    const left = window.screenX + (window.innerWidth - width) / 2
    const top = window.screenY + (window.innerHeight - height) / 2
    const popup = window.open(oauthUrl, 'google_oauth', `width=${width},height=${height},left=${left},top=${top}`)
    if (!popup) {
      notify({ type: 'error', text: 'Failed to open popup. Please allow popups and try again.' })
      setLinking(false)
      return
    }

    let pollInterval = null
    const start = Date.now()

    pollInterval = setInterval(async () => {
      try {
        if (!popup || popup.closed) {
          clearInterval(pollInterval)
          setLinking(false)
          notify({ type: 'error', text: 'Popup closed before linking completed.' })
          return
        }

        // When the OAuth flow finishes the popup will redirect to our client URL /auth/success
        // At that point the popup is same-origin and we can read its location
        const href = popup.location.href
        const url = new URL(href)
        // detect the success page
        if (url.pathname === '/auth/success' || url.pathname.endsWith('/auth/success')) {
            const token = url.searchParams.get('token')
          if (token) {
            // store token and fetch user data
            localStorage.setItem('token', token)
            try {
              const res = await apiFetch('/auth/me')
                if (res.ok) {
                const data = await res.json()
                localStorage.setItem('user', JSON.stringify(data.user))
                setUser(data.user)
                try { window.dispatchEvent(new CustomEvent('userUpdated', { detail: data.user })) } catch (e) {}
                notify({ type: 'success', text: 'Google account linked.' })
              } else {
                notify({ type: 'error', text: 'Linked but failed to fetch user data.' })
              }
            } catch (err) {
              notify({ type: 'error', text: 'Error fetching user after link.' })
            }

            popup.close()
            clearInterval(pollInterval)
            setLinking(false)
            return
          }
        }
      } catch (err) {
        // Cross-origin access to popup.location will throw until it's redirected to our origin - ignore
      }

      // timeout after 2 minutes
      if (Date.now() - start > 2 * 60 * 1000) {
        try { if (popup && !popup.closed) popup.close() } catch (e) {}
  clearInterval(pollInterval)
  setLinking(false)
  notify({ type: 'error', text: 'Linking timed out. Please try again.' })
      }
    }, 500)
  }

  // fetch latest user info (including deletion fields)
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    let mounted = true
  apiFetch('/auth/me')
      .then(async (r) => {
        const ct = r.headers.get('content-type') || ''
        if (ct.includes('application/json')) return r.json()
        const text = await r.text()
        throw new Error(`Unexpected non-JSON response (${r.status}): ${text.slice(0,200)}`)
      })
      .then(data => {
        if (mounted && data.user) {
          setUser(data.user)
        }
      }).catch((err) => {
        console.error('Failed to fetch /api/auth/me:', err)
        // show a simple message but don't block the UI
        notify({ type: 'error', text: 'Failed to refresh session. Please log in again.' })
      })
    return () => { mounted = false }
  }, [])

  // countdown state
  const [countdown, setCountdown] = useState(null)
  useEffect(() => {
    if (!user?.isDeleted || !user?.deletedAt) return
    const retentionDays = user.softDeleteRetentionDays || 30
    const deletedAt = new Date(user.deletedAt)
    const target = new Date(deletedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000)

    const tick = () => {
      const now = new Date()
      const diff = target - now
      if (diff <= 0) {
        setCountdown('Expires now')
        return
      }
      const days = Math.floor(diff / (24*60*60*1000))
      const hours = Math.floor((diff % (24*60*60*1000)) / (60*60*1000))
      const mins = Math.floor((diff % (60*60*1000)) / (60*1000))
      setCountdown(`${days}d ${hours}h ${mins}m`)
    }
    tick()
    const id = setInterval(tick, 60*1000)
    return () => clearInterval(id)
  }, [user])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/auth'
  }

  const handleMarkForDeletion = async () => {
  // legacy message cleared
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')

      const res = await apiFetch('/auth/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      // defensive parse: server may return HTML (error page) instead of JSON
      let data
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text()
        data = { error: `Unexpected response (${res.status})`, raw: text }
      }

      if (!res.ok) throw new Error(data.error || data.message || 'Failed to mark for deletion')

      // refresh user (defensive)
      try {
  const meRes = await apiFetch('/auth/me')
        const meCt = meRes.headers.get('content-type') || ''
        if (meCt.includes('application/json')) {
          const meData = await meRes.json()
          if (meRes.ok && meData.user) {
            setUser(meData.user)
            localStorage.setItem('user', JSON.stringify(meData.user))
          }
        } else {
          console.warn('Non-JSON response when refreshing /api/auth/me')
        }
      } catch (err) {
        console.error('Error refreshing user after delete-request:', err)
      }

  notify({ type: 'success', text: data.message || 'Account marked for deletion' })
    } catch (err) {
      notify({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handlePictureChange = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setPictureFile(file)
    const url = URL.createObjectURL(file)
    if (typeof setPicturePreview === 'function') {
      setPicturePreview(url)
    } else {
      // eslint-disable-next-line no-console
      console.warn('setPicturePreview is not a function in handlePictureChange', setPicturePreview)
    }
  }

  const handleUploadPicture = async () => {
  // legacy message cleared
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')
      if (!pictureFile) throw new Error('No picture selected')

      const form = new FormData()
      form.append('picture', pictureFile)

      const res = await apiFetch('/auth/profile-picture', {
        method: 'PUT',
        body: form
      })

      const data = await (res.headers.get('content-type')?.includes('application/json') ? res.json() : Promise.resolve({ error: 'Unexpected response' }))
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      // update user with new picture urls (variants)
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      const updatedUser = {
        ...stored,
        profilePicture: data.profilePicture || stored.profilePicture,
        profilePictureSmall: data.profilePictureSmall || stored.profilePictureSmall,
        profilePictureThumb: data.profilePictureThumb || stored.profilePictureThumb
      }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
  // notify other components (Header) in the same tab
  try { window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser })) } catch (e) {}
  notify({ type: 'success', text: 'Profile picture updated' })
    } catch (err) {
      notify({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePicture = async () => {
  // legacy message cleared
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')
  const res = await apiFetch('/auth/profile-picture', { method: 'DELETE' })
      const data = await (res.headers.get('content-type')?.includes('application/json') ? res.json() : Promise.resolve({}))
      if (!res.ok) throw new Error(data.error || 'Failed to remove avatar')

      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      const updatedUser = { ...stored, profilePicture: null, profilePictureSmall: null, profilePictureThumb: null }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
  // notify other components (Header) in the same tab
  try { window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser })) } catch (e) {}
      setPictureFile(null)
      if (typeof setPicturePreview === 'function') {
        setPicturePreview(null)
      } else {
        // eslint-disable-next-line no-console
        console.warn('setPicturePreview is not a function in handleRemovePicture', setPicturePreview)
      }
  notify({ type: 'success', text: data.message || 'Profile picture removed' })
    } catch (err) {
      notify({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }


  const handleChangeUsername = async (e) => {
    e.preventDefault()
  // legacy message cleared
    if (!usernameForm.username || usernameForm.username.length < 2) {
  notify({ type: 'error', text: 'Username must be at least 2 characters' })
      return
    }
    const token = localStorage.getItem('token')
    setLoading(true)
    try {
  const res = await apiFetch('/auth/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameForm.username })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      const updatedUser = { ...(JSON.parse(localStorage.getItem('user') || '{}')), username: usernameForm.username }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
  // notify other components (Header) in the same tab
  try { window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser })) } catch (e) {}
  notify({ type: 'success', text: 'Username updated' })
    } catch (err) {
      notify({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
  // legacy message cleared
    if (!passwordForm.currentPassword) {
  notify({ type: 'error', text: 'Current password is required' })
      return
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
  notify({ type: 'error', text: 'New password must be at least 6 characters' })
      return
    }
    if (passwordForm.newPassword !== passwordForm.verifyPassword) {
  notify({ type: 'error', text: 'New passwords do not match' })
      return
    }
    const token = localStorage.getItem('token')
    setLoading(true)
    try {
  const res = await apiFetch('/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setPasswordForm({ currentPassword: '', newPassword: '', verifyPassword: '' })
  notify({ type: 'success', text: 'Password updated' })
    } catch (err) {
      notify({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setLoading(true)
  // legacy message cleared
    const token = localStorage.getItem('token')
    try {
  const res = await apiFetch('/auth/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: deleteConfirmPassword })
        })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')

      // clear client state and redirect
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/auth'
    } catch (err) {
      notify({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <AuthWrapper>
      <div className="row">
        <div className="col-lg-8 mx-auto">
          <div className="card card-reading p-4">
            <h1 className="text-center mb-4">
              <i className="fas fa-cog text-primary me-2"></i>
              Settings
            </h1>

            {/* Profile Section with editable username and logout */}
            <div className="mb-5">
              <h4 className="mb-3">
                <i className="fas fa-user-circle me-2"></i>
                Profile
              </h4>
              <div className="mb-3">
                <label className="d-block mb-2">Avatar</label>
                <div className="mb-2">
                  {picturePreview ? (
                    <img
                      key={picturePreview}
                      src={picturePreview}
                      alt="avatar preview"
                      onLoad={() => setPreviewLoaded(true)}
                      onError={() => setPreviewLoaded(true)}
                      className={`avatar-transition ${previewLoaded ? 'loaded' : ''}`}
                      style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: '50%' }}
                    />
                  ) : (
                    <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#eee', display: 'inline-block' }} />
                  )}
                </div>
                <div className="mb-3">
                  <input type="file" accept="image/*" onChange={handlePictureChange} />
                </div>
                <div className="mb-3 d-flex gap-2">
                  <button className="btn btn-primary me-2" onClick={handleUploadPicture} disabled={loading}>Upload</button>
                  <button className="btn btn-outline-secondary" onClick={handleRemovePicture} disabled={loading}>Remove avatar</button>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Username</label>
                  <form onSubmit={handleChangeUsername}>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        value={usernameForm.username}
                        onChange={(e) => setUsernameForm({ username: e.target.value })}
                      />
                      <button className="btn btn-outline-primary" type="submit">Save</button>
                    </div>
                  </form>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={user?.email || ''} 
                    readOnly 
                  />
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label">Account Linking</label>
                  <div>
                    {user?.authProvider === 'google' || user?.googleId ? (
                      <div className="badge bg-success text-white">Linked with Google</div>
                    ) : (
                      <div className="d-flex align-items-center gap-2">
                        <div className="text-muted">Not linked to Google</div>
                        <button className="btn btn-outline-danger btn-sm" onClick={handleLinkGoogle} disabled={linking}>{linking ? 'Linking...' : 'Link Google account'}</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                {!user?.isDeleted ? (
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt me-2"></i>
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="d-flex gap-2 align-items-center">
                    <div>
                      <strong>Marked for deletion</strong>
                      <div className="text-muted">Permanent deletion in: {countdown || 'calculating...'}</div>
                    </div>
                    <button className="btn btn-outline-primary" onClick={async () => {
                      await apiFetch('/auth/cancel-delete', { method: 'POST' })
                      const res = await apiFetch('/auth/me')
                      const data = await res.json()
                      setUser(data.user)
                    }}>Cancel deletion</button>
                  </div>
                )}
              </div>
            </div>

            <hr />

            {/* My Data */}
            <div className="mb-4 my-data">
              <h4 className="mb-3">
                <i className="fas fa-file-export me-2"></i>
                My Data
              </h4>
              <div className="mb-3">
                <h5>Delete Querent</h5>
                <div className="d-flex gap-2 align-items-center">
                  <select className="form-select" style={{ maxWidth: 300 }} value={selectedQuerentId} onChange={(e) => setSelectedQuerentId(e.target.value)}>
                    <option value="">Select querent...</option>
                    {querents.map(q => (
                      <option key={q._id} value={q._id}>{q.name}</option>
                    ))}
                  </select>
                  <button className="btn btn-outline-danger" disabled={!selectedQuerentId} onClick={() => { setShowDeleteQuerentModal(true); setDeleteQuerentVerifyName('') }}>Delete Querent</button>
                </div>
              </div>
              <div className="mb-3">
                <h5>Delete My Decks</h5>
                <p className="text-muted small">Only custom decks you created can be deleted. System decks like Rider-Waite cannot be deleted.</p>
                <div className="d-flex gap-2 align-items-center">
                  <select className="form-select" style={{ maxWidth: 300 }} value={selectedDeckId} onChange={(e) => setSelectedDeckId(e.target.value)}>
                    <option value="">Select your deck...</option>
                    {decks.map(d => (
                      <option key={d._id} value={d._id}>{d.deckName}</option>
                    ))}
                  </select>
                  <button className="btn btn-outline-danger" disabled={!selectedDeckId} onClick={() => { setShowDeleteDeckModal(true); setDeleteDeckVerifyName('') }}>Delete Deck</button>
                </div>
                {decks.length === 0 && (
                  <div className="text-muted mt-2">
                    <em>You don't have any custom decks to delete.</em>
                  </div>
                )}
              </div>
              <div className="mb-3">
                <h5>Delete Custom Spread</h5>
                <div className="d-flex gap-2 align-items-center">
                  <select className="form-select" style={{ maxWidth: 300 }} value={selectedSpreadId} onChange={(e) => setSelectedSpreadId(e.target.value)}>
                    <option value="">Select spread...</option>
                    {spreads.map(s => (
                      <option key={s._id} value={s._id}>{s.spread}</option>
                    ))}
                  </select>
                  <button className="btn btn-outline-danger" disabled={!selectedSpreadId} onClick={() => { setShowDeleteSpreadModal(true); setDeleteSpreadVerifyName('') }}>Delete Spread</button>
                </div>
              </div>
            </div>

            {/* Data & Security */}
            <div className="mb-5">
              <h4 className="mb-3">
                <i className="fas fa-database me-2"></i>
                Data & Security
              </h4>
              
              <div className="mb-3">
                <h5>Change Password</h5>
                <form onSubmit={handleChangePassword}>
                  <div className="mb-2">
                    <label className="form-label">Current Password</label>
                    <input type="password" className="form-control" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">New Password</label>
                    <input type="password" className="form-control" value={passwordForm.newPassword} onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Verify New Password</label>
                    <input type="password" className="form-control" value={passwordForm.verifyPassword} onChange={(e) => setPasswordForm(prev => ({ ...prev, verifyPassword: e.target.value }))} />
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-primary" type="submit">Update Password</button>
                  </div>
                </form>
              </div>

              

              {message && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
                  {message.text}
                </div>
              )}
            </div>

            {/* Export image settings (moved below Data & Security) */}
            <ImageLimitSection />

            <ConfirmModal
              show={showDeleteModal}
              title="Delete account"
              body={(
                <div>
                  <p>This will permanently delete your account and all associated data. This action cannot be undone.</p>
                  <p>Please type your username to confirm and enter your current password.</p>
                  <div className="mb-2">
                    <input className="form-control" placeholder="Type username to confirm" value={deleteConfirmUsername} onChange={(e) => setDeleteConfirmUsername(e.target.value)} />
                  </div>
                  <div className="mb-2">
                    <input className="form-control" type="password" placeholder="Current password" value={deleteConfirmPassword} onChange={(e) => setDeleteConfirmPassword(e.target.value)} />
                  </div>
                </div>
              )}
              confirmText={loading ? 'Deleting...' : 'Delete account'}
              onConfirm={handleDeleteAccount}
              onCancel={() => { setShowDeleteModal(false); setDeleteConfirmPassword(''); setDeleteConfirmUsername('') }}
              loading={loading}
              confirmDisabled={!(deleteConfirmUsername === user?.username && deleteConfirmPassword.length > 0)}
            />

            <ConfirmModal
              show={showDeleteQuerentModal}
              title="Delete querent"
              body={(
                <div>
                  <p>This will permanently delete the selected querent and their associated readings. This action cannot be undone.</p>
                  <p>Please type the querent's name to confirm.</p>
                  <div className="mb-2">
                    <input className="form-control" placeholder="Type querent name to confirm" value={deleteQuerentVerifyName} onChange={(e) => setDeleteQuerentVerifyName(e.target.value)} />
                  </div>
                </div>
              )}
                  confirmText={loadingDeleteQuerent ? 'Deleting...' : 'Delete querent'}
              onConfirm={async () => {
                setLoadingDeleteQuerent(true)
                // legacy message cleared
                try {
                  const token = localStorage.getItem('token')
                  if (!token) throw new Error('Not authenticated')
                  if (!selectedQuerentId) throw new Error('No querent selected')
                  const res = await apiFetch(`/querents/${selectedQuerentId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ verifyName: deleteQuerentVerifyName })
                  })
                  const data = await (res.headers.get('content-type')?.includes('application/json') ? res.json() : Promise.resolve({ error: 'Unexpected response' }))
                  if (!res.ok) throw new Error(data.error || data.message || 'Failed to delete querent')

                  // remove from local state
                  const updated = querents.filter(q => q._id !== selectedQuerentId)
                  setQuerents(updated)
                  setSelectedQuerentId(updated.length ? updated[0]._id : '')
                  notify({ type: 'success', text: data.message || 'Querent deleted' })
                } catch (err) {
                  notify({ type: 'error', text: err.message })
                } finally {
                  setLoadingDeleteQuerent(false)
                  setShowDeleteQuerentModal(false)
                  setDeleteQuerentVerifyName('')
                }
              }}
              onCancel={() => { setShowDeleteQuerentModal(false); setDeleteQuerentVerifyName('') }}
              loading={loadingDeleteQuerent}
              confirmDisabled={(() => {
                const selected = querents.find(q => q._id === selectedQuerentId)
                return !(selected && deleteQuerentVerifyName === selected.name)
              })()}
            />

            <ConfirmModal
              show={showDeleteDeckModal}
              title="Delete deck"
              body={(
                <div>
                  <p>This will permanently delete the selected deck and its uploaded images. This action cannot be undone.</p>
                  <p>Please type the deck name to confirm.</p>
                  <div className="mb-2">
                    <input className="form-control" placeholder="Type deck name to confirm" value={deleteDeckVerifyName} onChange={(e) => setDeleteDeckVerifyName(e.target.value)} />
                  </div>
                </div>
              )}
              confirmText={loadingDeleteDeck ? 'Deleting...' : 'Delete deck'}
              onConfirm={async () => {
                setLoadingDeleteDeck(true)
                // legacy message cleared
                try {
                  const token = localStorage.getItem('token')
                  if (!token) throw new Error('Not authenticated')
                  if (!selectedDeckId) throw new Error('No deck selected')
                  const res = await apiFetch(`/api/decks/${selectedDeckId}`, {
                    method: 'DELETE'
                  })
                  const data = await (res.headers.get('content-type')?.includes('application/json') ? res.json() : Promise.resolve({ error: 'Unexpected response' }))
                  if (!res.ok) throw new Error(data.error || data.message || 'Failed to delete deck')

                  // remove from local state
                  const updated = decks.filter(d => d._id !== selectedDeckId)
                  setDecks(updated)
                  setSelectedDeckId(updated.length ? updated[0]._id : '')
                  notify({ type: 'success', text: data.message || 'Deck deleted' })
                } catch (err) {
                  notify({ type: 'error', text: err.message })
                } finally {
                  setLoadingDeleteDeck(false)
                  setShowDeleteDeckModal(false)
                  setDeleteDeckVerifyName('')
                }
              }}
              onCancel={() => { setShowDeleteDeckModal(false); setDeleteDeckVerifyName('') }}
              loading={loadingDeleteDeck}
              confirmDisabled={(() => {
                const selected = decks.find(d => d._id === selectedDeckId)
                return !(selected && deleteDeckVerifyName === selected.deckName)
              })()}
            />

            <ConfirmModal
              show={showDeleteSpreadModal}
              title="Delete spread"
              body={(
                <div>
                  <p>This will permanently delete the selected custom spread. This action cannot be undone.</p>
                  <p>Please type the spread name to confirm.</p>
                  <div className="mb-2">
                    <input className="form-control" placeholder="Type spread name to confirm" value={deleteSpreadVerifyName} onChange={(e) => setDeleteSpreadVerifyName(e.target.value)} />
                  </div>
                </div>
              )}
              confirmText={loadingDeleteSpread ? 'Deleting...' : 'Delete spread'}
              onConfirm={async () => {
                setLoadingDeleteSpread(true)
                // legacy message cleared
                try {
                  const token = localStorage.getItem('token')
                  if (!token) throw new Error('Not authenticated')
                  if (!selectedSpreadId) throw new Error('No spread selected')
                  const res = await apiFetch(`/spreads/${selectedSpreadId}`, { method: 'DELETE' })
                  const data = await (res.headers.get('content-type')?.includes('application/json') ? res.json() : Promise.resolve({ error: 'Unexpected response' }))
                  if (!res.ok) throw new Error(data.error || data.message || 'Failed to delete spread')

                  // remove from local state
                  const updated = spreads.filter(s => s._id !== selectedSpreadId)
                  setSpreads(updated)
                  setSelectedSpreadId(updated.length ? updated[0]._id : '')
                  notify({ type: 'success', text: data.message || 'Spread deleted' })
                } catch (err) {
                  notify({ type: 'error', text: err.message })
                } finally {
                  setLoadingDeleteSpread(false)
                  setShowDeleteSpreadModal(false)
                  setDeleteSpreadVerifyName('')
                }
              }}
              onCancel={() => { setShowDeleteSpreadModal(false); setDeleteSpreadVerifyName('') }}
              loading={loadingDeleteSpread}
              confirmDisabled={(() => {
                const selected = spreads.find(s => s._id === selectedSpreadId)
                return !(selected && deleteSpreadVerifyName === selected.spread)
              })()}
            />

            {/* Save Button */}
            <div className="text-center">
              <button 
                className="btn btn-primary btn-lg"
                onClick={handleSaveSettings}
              >
                <i className="fas fa-save me-2"></i>
                Save Settings
              </button>
            </div>

            {/* Deletion Controls (moved below Save) */}
            <div className="text-center mt-3 deletion-controls">
              {!user?.isDeleted ? (
                <div className="d-flex justify-content-center gap-2">
                  <button className="btn btn-outline-danger" disabled={loading} onClick={handleMarkForDeletion}>
                    {loading ? 'Working...' : 'Mark for deletion'}
                  </button>
                  <button className="btn btn-outline-danger" onClick={() => setShowDeleteModal(true)}>
                    Delete Account
                  </button>
                </div>
              ) : (
                <div className="d-flex flex-column align-items-center gap-2">
                  <div>
                    <strong>Marked for deletion</strong>
                    <div className="text-muted">Permanent deletion in: {countdown || 'calculating...'}</div>
                  </div>
                  <button className="btn btn-outline-primary" onClick={async () => {
                    await apiFetch('/auth/cancel-delete', { method: 'POST' })
                    const res = await apiFetch('/auth/me')
                    const data = await res.json()
                    setUser(data.user)
                  }}>Cancel deletion</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  )
}
