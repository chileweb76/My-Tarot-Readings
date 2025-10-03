'use client'

import { useState, useEffect, useActionState } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCog, faUserCircle, faSignOutAlt, faFileExport, faDatabase, faSave } from '../../lib/icons'
import AuthWrapper from '../../components/AuthWrapper'
import ConfirmModal from '../../components/ConfirmModal'
import PushNotificationsUniversal from '../../components/PushNotificationsUniversal'
import NotificationTester from '../../components/NotificationTester'
import { notify } from '../../lib/toast'
import SmartImage from '../../components/SmartImage'

import { 
  changeUsernameAction, 
  changePasswordAction, 
  uploadProfilePictureAction, 
  removeProfilePictureAction,
  signOutAction,
  getCurrentUserAction,
  getQuerentsAction,
  getTagsAction,
  getDecksAction,
  getSpreadsAction,
  deleteQuerentAction,
  deleteDeckAction,
  deleteSpreadAction,
  deleteTagAction,
  requestAccountDeletionAction,
  cancelAccountDeletionAction
} from '../../lib/actions'

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    dailyReading: false,
    privateReadings: true,
    theme: 'dark',
    language: 'en'
  })

  // Server Action states
  const [usernameState, usernameFormAction, usernamePending] = useActionState(async (prevState, formData) => {
    const result = await changeUsernameAction(formData)
    if (result.success) {
      // Update user state
      const updatedUser = { ...user, username: formData.get('username') }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      notify({ type: 'success', text: result.message })
      return { success: true }
    } else {
      notify({ type: 'error', text: result.error })
      return { error: result.error }
    }
  }, { success: false, error: null })

  const [passwordState, passwordFormAction, passwordPending] = useActionState(async (prevState, formData) => {
    const result = await changePasswordAction(formData)
    if (result.success) {
      notify({ type: 'success', text: result.message })
      // Reset form by returning success state
      return { success: true, reset: true }
    } else {
      notify({ type: 'error', text: result.error })
      return { error: result.error }
    }
  }, { success: false, error: null })

  const [profilePictureState, profilePictureFormAction, profilePicturePending] = useActionState(async (prevState, formData) => {
    const result = await uploadProfilePictureAction(formData)
    if (result.success) {
      const updatedUser = { ...user, profilePicture: result.profilePicture }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setPicturePreview(result.profilePicture)
      notify({ type: 'success', text: result.message })
      return { success: true }
    } else {
      notify({ type: 'error', text: result.error })
      return { error: result.error }
    }
  }, { success: false, error: null })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  // Simple UI for image export limit with presets, stepper and validation
  const MIN_IMAGE_LIMIT_MB = 0.1
  const MAX_IMAGE_LIMIT_MB = 50
  const PRESETS = [
    { label: 'Small', value: 0.5 },
    { label: 'Medium', value: 5.0 },
    { label: 'Large', value: 8.0 }
  ]

  const ImageLimitSection = () => (
    <div className="card mb-3">
      <div className="card-body">
        <h5 className="card-title">Export image settings</h5>
        <p className="card-text">
          Control how the app treats large images when creating exports (PDFs or shared images).
          Images larger than this threshold (in megabytes) will prompt you to confirm before they
          are embedded in the output. This helps keep exported files smaller, reduces upload and
          processing time, and avoids unexpectedly large emails or shares. The setting is stored
          locally in your browser and affects only export/share workflows — it does not change
          images in existing readings.
        </p>
        <div className="d-flex align-items-center" style={{ gap: 12 }}>
          <div className="input-group" style={{ width: 220 }}>
            <button
              className="btn btn-outline-secondary"
              type="button"
              aria-label="Decrease image size limit"
              onClick={() => setImageLimitMb(prev => {
                const next = Number((Number(prev || 0) - 0.1).toFixed(1))
                return isFinite(next) ? Math.max(next, MIN_IMAGE_LIMIT_MB) : MIN_IMAGE_LIMIT_MB
              })}
            >-
            </button>
            <input
              type="number"
              step="0.1"
              min={MIN_IMAGE_LIMIT_MB}
              max={MAX_IMAGE_LIMIT_MB}
              className="form-control"
              style={{ textAlign: 'center' }}
              aria-label="Image size limit in megabytes"
              value={Number.isFinite(imageLimitMb) ? imageLimitMb : ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (Number.isFinite(v)) setImageLimitMb(v)
                else setImageLimitMb('')
              }}
            />
            <button
              className="btn btn-outline-secondary"
              type="button"
              aria-label="Increase image size limit"
              onClick={() => setImageLimitMb(prev => {
                const next = Number((Number(prev || 0) + 0.1).toFixed(1))
                return isFinite(next) ? Math.min(next, MAX_IMAGE_LIMIT_MB) : MIN_IMAGE_LIMIT_MB
              })}
            >+
            </button>
          </div>

          <div>
            <button type="button" className="btn btn-primary" onClick={saveImageLimit}>Save</button>
          </div>
        </div>

        <div className="d-flex gap-2 mt-3" role="group" aria-label="Quick presets for image size limit">
          {PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              className={`btn btn-solid ${Number(imageLimitMb) === p.value ? 'btn-solid-primary' : ''}`}
              onClick={() => setImageLimitMb(p.value)}
              aria-pressed={Number(imageLimitMb) === p.value}
            >{p.label}
            </button>
          ))}
        </div>

        <div className="form-text mt-2">
          Recommended: <strong>5.0 MB</strong>. Images above this size will ask for confirmation before
          embedding. Increase the value to embed more images automatically, or lower it to avoid
          large exports. Allowed range: {MIN_IMAGE_LIMIT_MB} MB — {MAX_IMAGE_LIMIT_MB} MB.
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
    try { return parseFloat(localStorage.getItem('IMAGE_SIZE_LIMIT_MB')) || 5.0 } catch (e) { return 5.0 }
  })

  const saveImageLimit = () => {
    try {
      // coerce to number and validate
      const raw = Number(imageLimitMb)
      if (!Number.isFinite(raw)) {
        notify({ type: 'error', text: 'Please enter a valid number for the image size limit.' })
        return
      }
      const MIN_IMAGE_LIMIT_MB = 0.1
      const MAX_IMAGE_LIMIT_MB = 50
      const clamped = Math.min(Math.max(Number(raw.toFixed(1)), MIN_IMAGE_LIMIT_MB), MAX_IMAGE_LIMIT_MB)
      localStorage.setItem('IMAGE_SIZE_LIMIT_MB', String(clamped))
      // update state to the clamped value so UI reflects stored value
      setImageLimitMb(clamped)
      // notify other windows/components
      try { window.dispatchEvent(new Event('imageSizeLimitChanged')) } catch (e) {}
      notify({ type: 'success', text: `Image size limit set to ${clamped} MB` })
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
  
  // Tags state
  const [tags, setTags] = useState([])
  const [selectedTagId, setSelectedTagId] = useState('')
  const [showDeleteTagModal, setShowDeleteTagModal] = useState(false)
  const [deleteTagVerifyName, setDeleteTagVerifyName] = useState('')
  const [loadingDeleteTag, setLoadingDeleteTag] = useState(false)
  
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
          const result = await getQuerentsAction()
          if (result.success && result.querents) {
            setQuerents(result.querents)
            if (result.querents.length) setSelectedQuerentId(result.querents[0]._id)
          }
        } catch (err) {
          console.warn('Failed to load querents', err)
        }
  })();
  // load tags for this user (only user-created tags)
  ;(async () => {
        try {
          const result = await getTagsAction()
          if (result.success && result.tags) {
            // Filter user-created tags (non-global)
            const userTags = result.tags.filter(tag => !tag.isGlobal)
            setTags(userTags)
            if (userTags.length) setSelectedTagId(userTags[0]._id)
          }
        } catch (err) {
          console.warn('Failed to load tags', err)
        }
  })();
  // load decks for this user (only user-owned decks)
  ;(async () => {
          try {
            console.log('🔵 Settings: Loading decks for user deletion management...')
            const result = await getDecksAction()
            console.log('🔵 Settings: Decks result:', result)
            
            if (result.success && result.decks) {
              // Filter to only show decks owned by the current user
              const userId = user && (user._id || user.id) ? String(user._id || user.id) : null
              console.log('🔵 Settings: Current user ID:', userId)
              console.log('🔵 Settings: All decks:', result.decks.map(d => ({ id: d._id, name: d.deckName, owner: d.owner })))
              
              const userOwnedDecks = result.decks.filter(deck => {
                // Explicitly exclude Rider-Waite Tarot deck
                if (deck.deckName === 'Rider-Waite Tarot Deck') {
                  console.log('🟡 Settings: Excluding system deck:', deck.deckName)
                  return false
                }
                
                // If deck has an owner field, check if it matches current user
                if (deck.owner) {
                  const isOwned = String(deck.owner) === userId
                  console.log(`🔵 Settings: Deck "${deck.deckName}" owner check:`, deck.owner, 'vs', userId, '=', isOwned)
                  return isOwned
                }
                
                // Exclude system decks (owner: null) and other decks without owner
                console.log('🟡 Settings: Excluding deck with no owner:', deck.deckName)
                return false
              })
              
              console.log('🟢 Settings: User-owned decks:', userOwnedDecks.length, userOwnedDecks.map(d => d.deckName))
              setDecks(userOwnedDecks)
              if (userOwnedDecks.length) setSelectedDeckId(userOwnedDecks[0]._id)
            } else {
              console.warn('🟡 Settings: No decks result or failed:', result)
            }
          } catch (err) {
            console.error('🔴 Settings: Failed to load decks', err)
          }
  })()
  // load spreads and pick user's custom spreads
  ;(async () => {
          try {
            const result = await getSpreadsAction()
            if (result.success && result.data) {
              // filter custom spreads owned by this user
              const meId = user && (user._id || user.id) ? String(user._id || user.id) : null
              const mySpreads = result.data.filter(s => s.isCustom && s.owner && String(s.owner) === meId)
              setSpreads(mySpreads)
              if (mySpreads.length) setSelectedSpreadId(mySpreads[0]._id)
            }
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
          // With Server Actions + HTTP-only cookies, we just need to refresh user data
          try {
            const result = await getCurrentUserAction()
            if (result.success && result.user) {
              localStorage.setItem('user', JSON.stringify(result.user))
              setUser(result.user)
              try { window.dispatchEvent(new CustomEvent('userUpdated', { detail: result.user })) } catch (e) {}
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
    let mounted = true
    
    const fetchUser = async () => {
      try {
        const result = await getCurrentUserAction()
        if (mounted) {
          if (result.success && result.user) {
            setUser(result.user)
          } else {
            // Authentication failed - redirect to auth page
            window.location.href = '/auth'
          }
        }
      } catch (err) {
        console.error('Failed to fetch current user:', err)
        if (mounted) {
          notify({ type: 'error', text: 'Failed to refresh session. Please log in again.' })
          window.location.href = '/auth'
        }
      }
    }
    
    fetchUser()
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
    setLoading(true)
    try {
      const result = await requestAccountDeletionAction()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to mark for deletion')
      }

      // Refresh user data
      try {
        const userResult = await getCurrentUserAction()
        if (userResult.success && userResult.user) {
          setUser(userResult.user)
          localStorage.setItem('user', JSON.stringify(userResult.user))
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

  const handlePictureChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    try {
      const { ensurePreviewableImage } = await import('../../lib/heicConverter')
      const { file: maybeFile, previewUrl } = await ensurePreviewableImage(file)
      setPictureFile(maybeFile || file)
      if (typeof setPicturePreview === 'function') {
        setPicturePreview(previewUrl || URL.createObjectURL(maybeFile || file))
      } else {
        // eslint-disable-next-line no-console
        console.warn('setPicturePreview is not a function in handlePictureChange', setPicturePreview)
      }
    } catch (err) {
      console.warn('HEIC conversion failed:', err)
      // Fallback: set raw file URL
      setPictureFile(file)
      try { if (typeof setPicturePreview === 'function') setPicturePreview(URL.createObjectURL(file)) } catch (e) {}
    }
  }

  const handleUploadPicture = async () => {
    setLoading(true)
    try {
      if (!pictureFile) throw new Error('No picture selected')

      const formData = new FormData()
      formData.append('picture', pictureFile)

      const result = await uploadProfilePictureAction(formData)
      if (!result.success) throw new Error(result.error)

      // update user state
      const updatedUser = {
        ...user,
        profilePicture: result.profilePicture
      }
      setUser(updatedUser)
      
      // notify other components (Header) in the same tab
      try { window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser })) } catch (e) {}
      notify({ type: 'success', text: result.message || 'Profile picture updated' })
    } catch (err) {
      notify({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePicture = async () => {
    setLoading(true)
    try {
      const result = await removeProfilePictureAction()
      if (!result.success) throw new Error(result.error)

      const updatedUser = { ...user, profilePicture: null }
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
      notify({ type: 'success', text: result.message || 'Profile picture removed' })
    } catch (err) {
      notify({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }


  const handleChangeUsername = async (e) => {
    e.preventDefault()
    if (!usernameForm.username || usernameForm.username.length < 2) {
      notify({ type: 'error', text: 'Username must be at least 2 characters' })
      return
    }
    
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('username', usernameForm.username)
      
      const result = await changeUsernameAction(formData)
      if (!result.success) throw new Error(result.error)
      
      const updatedUser = { ...user, username: usernameForm.username }
      setUser(updatedUser)
      
      // notify other components (Header) in the same tab
      try { window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser })) } catch (e) {}
      notify({ type: 'success', text: result.message || 'Username updated' })
    } catch (err) {
      notify({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
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
    
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('currentPassword', passwordForm.currentPassword)
      formData.append('newPassword', passwordForm.newPassword)
      formData.append('verifyPassword', passwordForm.verifyPassword)
      
      const result = await changePasswordAction(formData)
      if (!result.success) throw new Error(result.error)
      
      setPasswordForm({ currentPassword: '', newPassword: '', verifyPassword: '' })
      notify({ type: 'success', text: result.message || 'Password updated' })
    } catch (err) {
      notify({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('currentPassword', deleteConfirmPassword)
      
      const result = await requestAccountDeletionAction(formData)
      if (!result.success) throw new Error(result.error)

      // Update user state to show deletion status
      const currentUser = await getCurrentUserAction()
      if (currentUser.success) {
        setUser(currentUser.user)
      }
      
      notify({ type: 'success', text: result.message || 'Account marked for deletion' })
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
              <FontAwesomeIcon icon={faCog} className="text-primary me-2" />
              Settings
            </h1>

            {/* Profile Section with editable username and logout */}
            <div className="mb-5">
              <h4 className="mb-3">
                <FontAwesomeIcon icon={faUserCircle} className="me-2" />
                Profile
              </h4>
              <div className="mb-3">
                <label className="d-block mb-2">Avatar</label>
                <div className="mb-2">
                  {picturePreview ? (
                    <SmartImage
                      src={picturePreview}
                      alt="avatar preview"
                      onLoadingComplete={() => setPreviewLoaded(true)}
                      onError={() => setPreviewLoaded(true)}
                      className={`avatar-transition ${previewLoaded ? 'loaded' : ''}`}
                      width={96}
                      height={96}
                      style={{ objectFit: 'cover', borderRadius: '50%' }}
                    />
                  ) : (
                    <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#eee', display: 'inline-block' }} />
                  )}
                </div>
                <form action={profilePictureFormAction} className="mb-3">
                  <div className="mb-3">
                    <input 
                      type="file" 
                      name="picture"
                      accept="image/*" 
                      required
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-primary" type="submit" disabled={profilePicturePending}>
                      {profilePicturePending ? 'Uploading...' : 'Upload'}
                    </button>
                    <button 
                      className="btn btn-outline-secondary" 
                      type="button" 
                      onClick={async () => {
                        const result = await removeProfilePictureAction()
                        if (result.success) {
                          const updatedUser = { ...user, profilePicture: null }
                          setUser(updatedUser)
                          localStorage.setItem('user', JSON.stringify(updatedUser))
                          setPicturePreview(null)
                          notify({ type: 'success', text: result.message })
                        } else {
                          notify({ type: 'error', text: result.error })
                        }
                      }}
                      disabled={profilePicturePending}
                    >
                      Remove avatar
                    </button>
                  </div>
                </form>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Username</label>
                  <form action={usernameFormAction}>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        name="username"
                        defaultValue={user?.username || ''}
                        minLength="2"
                        required
                      />
                      <button className="btn btn-outline-primary" type="submit" disabled={usernamePending}>
                        {usernamePending ? 'Saving...' : 'Save'}
                      </button>
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
                      <FontAwesomeIcon icon={faSignOutAlt} className="me-2" />
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
                      const result = await cancelAccountDeletionAction()
                      if (result.success) {
                        const currentUser = await getCurrentUserAction()
                        if (currentUser.success) {
                          setUser(currentUser.user)
                        }
                      }
                    }}>Cancel deletion</button>
                  </div>
                )}
              </div>
            </div>

            <hr />

            {/* My Data */}
            <div className="mb-4 my-data">
              <h4 className="mb-3">
                <FontAwesomeIcon icon={faFileExport} className="me-2" />
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
                    <em>You do not have any custom decks to delete.</em>
                  </div>
                )}
              </div>
              <div className="mb-3">
                <h5>Delete Custom Spread</h5>
                <p className="text-muted small">Only custom spreads you created can be deleted. System spreads cannot be deleted.</p>
                <div className="d-flex gap-2 align-items-center">
                  <select className="form-select" style={{ maxWidth: 300 }} value={selectedSpreadId} onChange={(e) => setSelectedSpreadId(e.target.value)}>
                    <option value="">Select spread...</option>
                    {spreads.map(s => (
                      <option key={s._id} value={s._id}>{s.spread}</option>
                    ))}
                  </select>
                  <button className="btn btn-outline-danger" disabled={!selectedSpreadId} onClick={() => { setShowDeleteSpreadModal(true); setDeleteSpreadVerifyName('') }}>Delete Spread</button>
                </div>
                {spreads.length === 0 && (
                  <div className="text-muted mt-2">
                    <em>You do not have any custom spreads to delete.</em>
                  </div>
                )}
              </div>
              <div className="mb-3">
                <h5>Delete Tags</h5>
                <p className="text-muted small">Delete your personal tags. Global tags cannot be deleted.</p>
                <div className="d-flex gap-2 align-items-center">
                  <select className="form-select" style={{ maxWidth: 300 }} value={selectedTagId} onChange={(e) => setSelectedTagId(e.target.value)}>
                    <option value="">Select tag...</option>
                    {tags.map(tag => (
                      <option key={tag._id} value={tag._id}>{tag.name}</option>
                    ))}
                  </select>
                  <button className="btn btn-outline-danger" disabled={!selectedTagId} onClick={() => { setShowDeleteTagModal(true); setDeleteTagVerifyName('') }}>Delete Tag</button>
                </div>
              </div>
            </div>

            {/* Data & Security */}
            <div className="mb-5">
              <h4 className="mb-3">
                <FontAwesomeIcon icon={faDatabase} className="me-2" />
                Data & Security
              </h4>
              
              <div className="mb-3">
                <h5>Change Password</h5>
                <form action={passwordFormAction}>
                  <div className="mb-2">
                    <label className="form-label">Current Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      name="currentPassword"
                      required 
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">New Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      name="newPassword"
                      minLength="6"
                      required 
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Verify New Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      name="verifyPassword"
                      minLength="6"
                      required 
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-primary" type="submit" disabled={passwordPending}>
                      {passwordPending ? 'Updating...' : 'Update Password'}
                    </button>
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

            {/* Push Notifications Section */}
            <PushNotificationsUniversal />
            <NotificationTester />

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
                  <p>Please type the querent name to confirm.</p>
                  <div className="mb-2">
                    <input className="form-control" placeholder="Type querent name to confirm" value={deleteQuerentVerifyName} onChange={(e) => setDeleteQuerentVerifyName(e.target.value)} />
                  </div>
                </div>
              )}
                  confirmText={loadingDeleteQuerent ? 'Deleting...' : 'Delete querent'}
              onConfirm={async () => {
                setLoadingDeleteQuerent(true)
                try {
                  if (!selectedQuerentId) throw new Error('No querent selected')
                  
                  const formData = new FormData()
                  formData.append('querentId', selectedQuerentId)
                  
                  const result = await deleteQuerentAction(formData)
                  if (!result.success) throw new Error(result.error || 'Failed to delete querent')

                  // remove from local state
                  const updated = querents.filter(q => q._id !== selectedQuerentId)
                  setQuerents(updated)
                  setSelectedQuerentId(updated.length ? updated[0]._id : '')
                  notify({ type: 'success', text: result.message || 'Querent deleted' })
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
                try {
                  if (!selectedDeckId) throw new Error('No deck selected')
                  
                  const formData = new FormData()
                  formData.append('deckId', selectedDeckId)
                  
                  const result = await deleteDeckAction(formData)
                  if (!result.success) throw new Error(result.error)

                  // remove from local state
                  const updated = decks.filter(d => d._id !== selectedDeckId)
                  setDecks(updated)
                  setSelectedDeckId(updated.length ? updated[0]._id : '')
                  notify({ type: 'success', text: result.message || 'Deck deleted' })
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
                try {
                  if (!selectedSpreadId) throw new Error('No spread selected')
                  
                  const formData = new FormData()
                  formData.append('spreadId', selectedSpreadId)
                  
                  const result = await deleteSpreadAction(formData)
                  if (!result.success) throw new Error(result.error)

                  // remove from local state
                  const updated = spreads.filter(s => s._id !== selectedSpreadId)
                  setSpreads(updated)
                  setSelectedSpreadId(updated.length ? updated[0]._id : '')
                  notify({ type: 'success', text: result.message || 'Spread deleted' })
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

            <ConfirmModal
              show={showDeleteTagModal}
              title="Delete tag"
              body={(
                <div>
                  <p>This will permanently delete the selected tag from your personal tags. This action cannot be undone.</p>
                  <p>Please type the tag name to confirm.</p>
                  <div className="mb-2">
                    <input className="form-control" placeholder="Type tag name to confirm" value={deleteTagVerifyName} onChange={(e) => setDeleteTagVerifyName(e.target.value)} />
                  </div>
                </div>
              )}
              confirmText={loadingDeleteTag ? 'Deleting...' : 'Delete tag'}
              onConfirm={async () => {
                setLoadingDeleteTag(true)
                try {
                  if (!selectedTagId) throw new Error('No tag selected')
                  
                  const formData = new FormData()
                  formData.append('tagId', selectedTagId)
                  
                  const result = await deleteTagAction(formData)
                  if (!result.success) throw new Error(result.error)

                  // remove from local state
                  const updated = tags.filter(tag => tag._id !== selectedTagId)
                  setTags(updated)
                  setSelectedTagId(updated.length ? updated[0]._id : '')
                  notify({ type: 'success', text: result.message || 'Tag deleted' })
                } catch (err) {
                  notify({ type: 'error', text: err.message })
                } finally {
                  setLoadingDeleteTag(false)
                  setShowDeleteTagModal(false)
                  setDeleteTagVerifyName('')
                }
              }}
              onCancel={() => { setShowDeleteTagModal(false); setDeleteTagVerifyName('') }}
              loading={loadingDeleteTag}
              confirmDisabled={(() => {
                const selected = tags.find(tag => tag._id === selectedTagId)
                return !(selected && deleteTagVerifyName === selected.name)
              })()}
            />

            {/* Save Button */}
            <div className="text-center">
              <button 
                className="btn btn-primary btn-lg"
                onClick={handleSaveSettings}
              >
                <FontAwesomeIcon icon={faSave} className="me-2" />
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
                    const result = await cancelAccountDeletionAction()
                    if (result.success) {
                      const currentUser = await getCurrentUserAction()
                      if (currentUser.success) {
                        setUser(currentUser.user)
                      }
                    }
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
