"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import AuthWrapper from '../components/AuthWrapper'
import { apiFetch } from '../lib/api'
import { getSpreadImageUrl } from '../lib/imageService'

  // Vercel Blob utility functions
const extractBlobUrl = (uploadResponse) => {
  if (!uploadResponse) return null
  return uploadResponse.url || uploadResponse.image || uploadResponse.reading?.image
}

const prepareBlobUpload = (formData, options = {}) => {
  if (options.filename) formData.append('filename', options.filename)
  if (options.contentType) formData.append('contentType', options.contentType)
  if (options.cacheControl) formData.append('cacheControl', options.cacheControl)
  return formData
}
import { addListener } from '../lib/toast'
import QuerentModal from '../components/QuerentModal'
import SpreadSelect from '../components/SpreadSelect'
import SpreadModal from '../components/SpreadModal'
import CameraModal from '../components/CameraModal'
import Card from '../components/Card'
import Toasts from '../components/Toasts'
import ExportToolbar from '../components/ExportToolbar'
import { LargeImageWarningModal, ExportSignInModal } from '../components/modals'

export default function HomePage() {
  // Image size threshold (MB) can be configured via NEXT_PUBLIC_IMAGE_SIZE_LIMIT_MB (build-time)
  // or overridden at runtime via localStorage key 'IMAGE_SIZE_LIMIT_MB'. Default 5.0 MB.
  const DEFAULT_IMAGE_SIZE_LIMIT_MB = 5.0
  const envLimitMb = typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_IMAGE_SIZE_LIMIT_MB ? parseFloat(process.env.NEXT_PUBLIC_IMAGE_SIZE_LIMIT_MB) : null
  const [runtimeLimitMb, setRuntimeLimitMb] = useState(null)
  const getImageSizeLimitBytes = () => {
    const mb = runtimeLimitMb || envLimitMb || DEFAULT_IMAGE_SIZE_LIMIT_MB
    return Math.max(0.1, mb) * 1024 * 1024
  }
  const [largeImagePending, setLargeImagePending] = useState(null) // { size, humanSize, resolve }
  const [user, setUser] = useState(null)
  const [querents, setQuerents] = useState([])
  const [selectedQuerent, setSelectedQuerent] = useState('self')
  const [selectedSpread, setSelectedSpread] = useState('')
  const [showSpreadModal, setShowSpreadModal] = useState(false)
  const [addingQuerent, setAddingQuerent] = useState(false)
  const [newQuerentName, setNewQuerentName] = useState('')
  const [savingQuerent, setSavingQuerent] = useState(false)
  const [spreadImage, setSpreadImage] = useState(null)
  const [spreadCards, setSpreadCards] = useState([])
  const [spreadName, setSpreadName] = useState('')
  const [cardStates, setCardStates] = useState([])
  const [uploadedImage, setUploadedImage] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [savingReading, setSavingReading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [convertingImage, setConvertingImage] = useState(false)
  const [exporting, setExporting] = useState(false)
  // autosave removed: explicit save only
  const [readingId, setReadingId] = useState(null)
  const [manualOverride, setManualOverride] = useState(false)
  // legacy message state removed; use notify() global helper instead
  const [toasts, setToasts] = useState([])
  
  // Tags state
  const [tags, setTags] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [newTagName, setNewTagName] = useState('')
  const [addingTag, setAddingTag] = useState(false)

  // push a toast into the stack
  const pushToast = (t) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`
    setToasts(prev => [...prev, { id, ...t }])
    return id
  }

  // Register global toast listener so other modules can call `notify()`
  useEffect(() => {
    const off = addListener((msg) => {
      pushToast(msg)
    })
    return () => off()
  }, [])

  // read any runtime override from localStorage
  useEffect(() => {
    try {
      const v = localStorage.getItem('IMAGE_SIZE_LIMIT_MB')
      if (v) setRuntimeLimitMb(parseFloat(v))
    } catch (e) { /* ignore */ }
  }, [])

  // Print reading: open a print window (same content as export fallback)
  const handlePrintReading = async () => {
    // Build card objects from current state
    const cardsArr = (cardStates && cardStates.length ? cardStates : spreadCards.map(cardName => ({ title: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || '') }))).map(cs => ({
      title: cs.title || '',
      suit: cs.selectedSuit || '',
      card: cs.selectedCard || (cs.title || ''),
      reversed: !!cs.reversed,
      interpretation: cs.interpretation || '',
      image: cs.image || null
    }))

    // Convert any blob/object URLs to data URLs so the new window can render them
    const preparedCards = []
    for (const c of cardsArr) {
      const copy = { ...c }
      try {
          if (copy.image && typeof copy.image === 'string') {
          if (copy.image.startsWith('data:')) {
            // data: URL already contains the data; check size and warn if large
            try {
              const { proceed } = await fetchBlobWithSizeCheck(copy.image)
              if (!proceed) {
                // user cancelled conversion/embedding
                copy.image = null
              }
            } catch (e) {
              console.warn('Failed to check data: image size for print', e)
            }
          } else if (copy.image.startsWith('blob:') || copy.image.startsWith('object:')) {
            try {
              // Fetch the blob but check size first; if large, prompt user
              const { proceed, blob } = await fetchBlobWithSizeCheck(copy.image)
              if (!proceed) {
                // user cancelled conversion - leave image as-is (won't render in print)
              } else if (blob) {
                copy.image = await new Promise((resolve, reject) => {
                  const fr = new FileReader()
                  fr.onload = () => resolve(fr.result)
                  fr.onerror = reject
                  fr.readAsDataURL(blob)
                })
              }
            } catch (e) {
              console.warn('Failed to convert blob image for print:', e)
              // leave as-is if conversion fails
            }
          } else if (!/^https?:\/\//i.test(copy.image) && copy.image.startsWith('/')) {
            // make absolute
            copy.image = `${window.location.protocol}//${window.location.host}${copy.image}`
          }
        }
      } catch (e) {
        console.warn('Error preparing image for print', e)
      }
      preparedCards.push(copy)
    }

    const exportHtml = `
      <html>
        <head>
          <title>Tarot Reading - ${new Date(readingDateTime).toLocaleDateString()}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 20px; }
            h1 { text-align: center; color: #4a154b; }
            .meta { margin-bottom: 12px; }
            .section { margin-bottom: 18px; }
            .card-item { margin-bottom: 8px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
            .card-title { font-weight: 600; }
            .footer-note { margin-top: 28px; color: #555; font-size: 0.9rem; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Tarot Reading</h1>
          <div class="meta">
            <div><strong>Reading by:</strong> ${user?.username || 'Guest'}</div>
            <div><strong>Date:</strong> ${new Date(readingDateTime).toLocaleString()}</div>
            <div><strong>Querent:</strong> ${selectedQuerent === 'self' ? 'Self' : (querents.find(q => q._id === selectedQuerent)?.name || 'Unknown')}</div>
            <div><strong>Spread:</strong> ${spreadName || selectedSpread || 'No spread selected'}</div>
            <div><strong>Deck:</strong> ${decks.find(d => d._id === selectedDeck)?.deckName || 'Unknown deck'}</div>
          </div>

          <div class="section">
            <h3>Question</h3>
            <div>${question || 'No question specified'}</div>
          </div>

          <div class="section">
            <h3>Cards Drawn</h3>
            ${preparedCards.map(cs => `
              <div class="card-item">
                <div class="card-title">${cs.title || ''}${cs.card ? (cs.suit && cs.suit.toLowerCase() !== 'major arcana' ? ` - ${cs.card} of ${cs.suit}` : ` - ${cs.card}`) : ''}${cs.reversed ? ' (reversed)' : ''}</div>
                ${cs.interpretation ? `<div class="card-interpretation">${cs.interpretation}</div>` : ''}
                ${cs.image ? `<div style="margin-top:8px"><img src="${cs.image}" style="max-width:120px;max-height:160px"/></div>` : ''}
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h3>Interpretation</h3>
            <div>${interpretation || 'No overall interpretation provided'}</div>
          </div>

          <div class="footer-note">Exported: ${new Date().toLocaleString()}</div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      pushToast({ type: 'error', text: 'Unable to open print window. Please allow popups for this site.' })
      return
    }
    printWindow.document.write(exportHtml)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { try { printWindow.print(); printWindow.onafterprint = () => { try { printWindow.close() } catch (e) {} } } catch (err) { console.error('Print failed', err); pushToast({ type: 'error', text: 'Print failed.' }) } }, 300)
  }

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  // legacy forwarding removed; other modules should call `notify()` directly
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [showExportSignInModal, setShowExportSignInModal] = useState(false)
  const [question, setQuestion] = useState('')
  const [decks, setDecks] = useState([])
  const [selectedDeck, setSelectedDeck] = useState('')
  const [interpretation, setInterpretation] = useState('')
  // reading date/time (initialized to current local date/time, editable)
  const [readingDateTime, setReadingDateTime] = useState(() => {
    // default value suitable for <input type="datetime-local"> (local timezone)
    const dt = new Date()
    const offsetMs = dt.getTimezoneOffset() * 60000
    const local = new Date(dt.getTime() - offsetMs)
    return local.toISOString().slice(0,16)
  })

  // Export reading: try server-side PDF export first, fall back to print window
  const handleExportReading = async () => {
    // If we have a pending local image (blob/data or uploadedFile), ensure it's uploaded
    // so server-side export can fetch a permanent URL. If the user is not signed in,
    // surface a modal prompting them to sign in and retry the export.
    try {
      const hasLocalImage = uploadedFile || (uploadedImage && (uploadedImage.startsWith('data:') || uploadedImage.startsWith('blob:') || uploadedImage.startsWith('object:')))
      if (hasLocalImage) {
        const token = localStorage.getItem('token')
        if (!token) {
          // Show modal to prompt sign-in before export
          setShowExportSignInModal(true)
          return
        } else {
          // attempt a quiet save which also uploads pending image
          await saveReading({ explicit: false })
        }
      }
    } catch (err) {
      console.warn('Pre-export save failed', err)
      pushToast({ type: 'error', text: 'Failed to attach image before export. Falling back to print.' })
    }

    const readingPayload = {
      by: user?.username || 'Guest',
      date: new Date(readingDateTime).toLocaleString(),
      querent: selectedQuerent === 'self' ? 'Self' : (querents.find(q => q._id === selectedQuerent)?.name || 'Unknown'),
      spread: spreadName || selectedSpread || 'No spread selected',
      deck: decks.find(d => d._id === selectedDeck)?.deckName || 'Unknown deck',
      question: question || '',
      cards: (cardStates && cardStates.length ? cardStates : spreadCards.map(cardName => ({ title: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || '') }))).map(cs => ({
        title: cs.title || '',
        suit: cs.selectedSuit || '',
        card: cs.selectedCard || (cs.title || ''),
        reversed: !!cs.reversed,
        interpretation: cs.interpretation || '',
        image: cs.image || null
      })),
      interpretation: interpretation || '',
      // ensure we include the (possibly newly-uploaded) reading image
      image: uploadedImage || null,
      exportedAt: new Date().toLocaleString()
    }

  setExporting(true)
    // Ensure card images are either absolute URLs or data URLs. Convert blob/object URLs to data URLs
    try {
      for (let i = 0; i < readingPayload.cards.length; i++) {
        const c = readingPayload.cards[i]
        if (!c.image || typeof c.image !== 'string') continue
        if (c.image.startsWith('data:')) {
          // check size and confirm if necessary
          const { proceed, blob } = await fetchBlobWithSizeCheck(c.image)
          if (!proceed) {
            pushToast({ type: 'info', text: 'Export cancelled due to large image.' })
            setExporting(false)
            return
          }
          // if proceed, leave as data URL (we fetched blob mainly for size check)
        } else if (c.image.startsWith('blob:') || c.image.startsWith('object:')) {
          const { proceed, blob } = await fetchBlobWithSizeCheck(c.image)
          if (!proceed) {
            pushToast({ type: 'info', text: 'Export cancelled due to large image.' })
            setExporting(false)
            return
          }
          if (blob) {
            c.image = await new Promise((resolve, reject) => {
              const fr = new FileReader()
              fr.onload = () => resolve(fr.result)
              fr.onerror = reject
              fr.readAsDataURL(blob)
            })
          }
        } else if (!/^https?:\/\//i.test(c.image) && c.image.startsWith('/')) {
          c.image = `${window.location.protocol}//${window.location.host}${c.image}`
        }
      }
    } catch (e) {
      console.warn('Failed preparing images for export', e)
      pushToast({ type: 'error', text: 'Failed to prepare images for export.' })
      setExporting(false)
      return
    }
    try {
      const rawApi = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const apiBase = rawApi.replace(/\/$|\/api$/i, '')
      const debugUrl = `${apiBase}/api/export/pdf`
      console.debug('Export will POST to', debugUrl)
      const res = await apiFetch('/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reading: readingPayload, fileName: `tarot-reading-${new Date(readingDateTime).toISOString().split('T')[0]}.pdf` })
      })

      if (!res.ok) {
        let bodyText = ''
        try { bodyText = await res.text() } catch (e) { bodyText = '' }
        const snippet = bodyText ? (bodyText.length > 200 ? bodyText.slice(0,200) + '...' : bodyText) : ''
        const msg = `Server export failed: ${res.status} ${res.statusText} ${res.url ? '(' + res.url + ')' : ''} ${snippet}`
        console.error(msg)
        pushToast({ type: 'error', text: `Export failed: ${res.status} ${res.statusText}` })
        throw new Error('Server export failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tarot-reading-${new Date(readingDateTime).toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
  pushToast({ type: 'success', text: 'Exported PDF downloaded.' })
      setExporting(false)
      return
    } catch (err) {
      // fallback to client-side print if server export fails
      console.warn('Server export failed, falling back to print:', err)
  pushToast({ type: 'error', text: 'Server export failed, opening print dialog as fallback.' })
      setExporting(false)
    }

    // Fallback: open a print window (same content as before)
    const exportHtml = `
      <html>
        <head>
          <title>Tarot Reading - ${new Date(readingDateTime).toLocaleDateString()}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 20px; }
            h1 { text-align: center; color: #4a154b; }
            .meta { margin-bottom: 12px; }
            .section { margin-bottom: 18px; }
            .card-item { margin-bottom: 8px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
            .card-title { font-weight: 600; }
            .footer-note { margin-top: 28px; color: #555; font-size: 0.9rem; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Tarot Reading</h1>
          <div class="meta">
            <div><strong>Reading by:</strong> ${user?.username || 'Guest'}</div>
            <div><strong>Date:</strong> ${new Date(readingDateTime).toLocaleString()}</div>
            <div><strong>Querent:</strong> ${selectedQuerent === 'self' ? 'Self' : (querents.find(q => q._id === selectedQuerent)?.name || 'Unknown')}</div>
            <div><strong>Spread:</strong> ${selectedSpread || 'No spread selected'}</div>
            <div><strong>Deck:</strong> ${decks.find(d => d._id === selectedDeck)?.deckName || 'Unknown deck'}</div>
          </div>

          <div class="section">
            <h3>Question</h3>
            <div>${question || 'No question specified'}</div>
          </div>

          <div class="section">
            <h3>Cards Drawn</h3>
            ${readingPayload.cards.map(cs => `
              <div class="card-item">
                <div class="card-title">${cs.title || ''}${cs.card ? (cs.suit && cs.suit.toLowerCase() !== 'major arcana' ? ` - ${cs.card} of ${cs.suit}` : ` - ${cs.card}`) : ''}${cs.reversed ? ' (reversed)' : ''}</div>
                ${cs.interpretation ? `<div class="card-interpretation">${cs.interpretation}</div>` : ''}
                ${cs.image ? `<div style="margin-top:8px"><img src="${cs.image}" style="max-width:120px;max-height:160px"/></div>` : ''}
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h3>Interpretation</h3>
            <div>${interpretation || 'No overall interpretation provided'}</div>
          </div>

          <div class="footer-note">Exported: ${new Date().toLocaleString()}</div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      pushToast({ type: 'error', text: 'Unable to open print window. Please allow popups for this site.' })
      return
    }
    printWindow.document.write(exportHtml)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { try { printWindow.print(); printWindow.onafterprint = () => { try { printWindow.close() } catch (e) {} } } catch (err) { console.error('Print failed', err) } }, 300)
    setExporting(false)
  }

  // Export sign-in modal markup (rendered when a local image exists but user not signed in)
  // Shared modals imported from components/ExportModals

  // The settings UI has moved to the central Settings page. Listen for changes via window event.
  useEffect(() => {
    const onLimitChanged = (e) => {
      try {
        const v = localStorage.getItem('IMAGE_SIZE_LIMIT_MB')
        if (v) setRuntimeLimitMb(parseFloat(v))
      } catch (err) { }
    }
    window.addEventListener('imageSizeLimitChanged', onLimitChanged)
    return () => window.removeEventListener('imageSizeLimitChanged', onLimitChanged)
  }, [])

  // Helper to fetch a blob and present a confirmation if it exceeds size limit
  const fetchBlobWithSizeCheck = async (url) => {
    try {
      const res = await fetch(url)
      if (!res.ok) return { proceed: false, blob: null }
      const b = await res.blob()
  if (b.size > getImageSizeLimitBytes()) {
        // show modal and wait for user decision
        let resolved = false
        let userChoice = false
        const p = new Promise((resolve) => {
          // store resolve so modal buttons can call it
          setLargeImagePending({ size: b.size, humanSize: `${(b.size / 1024 / 1024).toFixed(2)} MB`, resolve })
        })
        userChoice = await p
        return { proceed: !!userChoice, blob: b }
      }
      return { proceed: true, blob: b }
    } catch (e) {
      console.warn('Failed to fetch blob for size check', e)
      return { proceed: false, blob: null }
    }
  }

  // Share reading (Web Share API with fallback)
  const handleShareReading = async () => {
    const cardsArr = (cardStates && cardStates.length ? cardStates : spreadCards.map(cardName => ({ title: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || '') }))).map(cs => ({
      title: cs.title || '',
      suit: cs.selectedSuit || '',
      card: cs.selectedCard || (cs.title || ''),
      reversed: !!cs.reversed,
      interpretation: cs.interpretation || '',
      image: cs.image || null
    }))

    const cardsText = cardsArr.map(cs => {
      const name = cs.title || ''
      const details = cs.card ? (cs.suit && cs.suit.toLowerCase() !== 'major arcana' ? `${cs.card} of ${cs.suit}` : cs.card) : ''
      const rev = cs.reversed ? ' (reversed)' : ''
      const interp = cs.interpretation ? ` — ${cs.interpretation}` : ''
      return `${name}${details ? ` — ${details}` : ''}${rev}${interp}`
    }).join('\n')

    const shareText = `🔮 Tarot Reading - ${new Date(readingDateTime).toLocaleDateString()}\n\n` +
      `Querent: ${selectedQuerent === 'self' ? 'Self' : (querents.find(q => q._id === selectedQuerent)?.name || 'Unknown')}\n` +
      `Spread: ${spreadName || selectedSpread || 'No spread selected'}\n` +
      `Question: ${question || 'No question specified'}\n\n` +
      `Cards:\n${cardsText}\n\n` +
      `Interpretation: ${interpretation || 'No interpretation provided'}`

    if (navigator.share) {
      try {
        // Try to include an image file if available and supported
        let filesToShare = null
        try {
          const candidateImage = uploadedImage || (cardsArr.find(c => c.image)?.image)
            if (candidateImage && typeof candidateImage === 'string') {
              let blob = null
              try {
                if (candidateImage.startsWith('data:')) {
                  const { proceed, blob: fetched } = await fetchBlobWithSizeCheck(candidateImage)
                  if (!proceed) blob = null
                  else blob = fetched
                } else if (candidateImage.startsWith('blob:') || candidateImage.startsWith('object:')) {
                  const { proceed, blob: fetched } = await fetchBlobWithSizeCheck(candidateImage)
                  if (!proceed) {
                    blob = null
                  } else {
                    blob = fetched
                  }
                } else if (/^\/images\//.test(candidateImage) || candidateImage.startsWith('/')) {
                  // make absolute and fetch
                  try {
                    const abs = candidateImage.startsWith('/') ? `${window.location.protocol}//${window.location.host}${candidateImage}` : candidateImage
                    const res = await fetch(abs)
                    if (res.ok) blob = await res.blob()
                  } catch (e) { /* ignore */ }
                }
                if (blob) {
                  const file = new File([blob], `tarot-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' })
                  filesToShare = [file]
                }
              } catch (e) {
                console.warn('Error preparing candidate image for share', e)
              }
          }
        } catch (e) {
          console.warn('Failed preparing image for share', e)
        }

        if (filesToShare && navigator.canShare && navigator.canShare({ files: filesToShare })) {
          await navigator.share({ files: filesToShare, title: 'Tarot Reading', text: shareText })
        } else {
          await navigator.share({ title: 'Tarot Reading', text: shareText })
        }
      } catch (err) {
        console.log('Share cancelled or failed:', err)
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText)
        pushToast({ type: 'success', text: 'Reading copied to clipboard!' })
      } catch (err) {
        console.error('Failed to copy to clipboard:', err)
        pushToast({ type: 'error', text: 'Failed to copy reading to clipboard' })
      }
    }
  }

  // Share as PDF: request server-side PDF and attempt to share via Web Share API (falls back to download)
  const handleShareAsPdf = async () => {
    setExporting(true)
    try {
      const hasLocalImage = uploadedFile || (uploadedImage && (uploadedImage.startsWith('data:') || uploadedImage.startsWith('blob:') || uploadedImage.startsWith('object:')))
      if (hasLocalImage) {
        const token = localStorage.getItem('token')
        if (!token) {
          setShowExportSignInModal(true)
          setExporting(false)
          return
        } else {
          // ensure pending image uploaded before server export
          await saveReading({ explicit: false })
        }
      }
    } catch (err) {
      console.warn('Pre-share save failed', err)
      pushToast({ type: 'error', text: 'Failed to attach image before sharing.' })
      setExporting(false)
      return
    }

    const readingPayload = {
      by: user?.username || 'Guest',
      date: new Date(readingDateTime).toLocaleString(),
      querent: selectedQuerent === 'self' ? 'Self' : (querents.find(q => q._id === selectedQuerent)?.name || 'Unknown'),
      spread: spreadName || selectedSpread || 'No spread selected',
      deck: decks.find(d => d._id === selectedDeck)?.deckName || 'Unknown deck',
      question: question || '',
      cards: (cardStates && cardStates.length ? cardStates : spreadCards.map(cardName => ({ title: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || '') }))).map(cs => ({
        title: cs.title || '',
        suit: cs.selectedSuit || '',
        card: cs.selectedCard || (cs.title || ''),
        reversed: !!cs.reversed,
        interpretation: cs.interpretation || '',
        image: cs.image || null
      })),
      interpretation: interpretation || '',
      image: uploadedImage || null,
      exportedAt: new Date().toLocaleString()
    }

    try {
      // Ensure card images are either absolute URLs or data URLs. Convert blob/object URLs to data URLs
      try {
        for (let i = 0; i < readingPayload.cards.length; i++) {
          const c = readingPayload.cards[i]
          if (!c.image || typeof c.image !== 'string') continue
          if (c.image.startsWith('data:')) {
            // check size and confirm if necessary
            const { proceed } = await fetchBlobWithSizeCheck(c.image)
            if (!proceed) {
              pushToast({ type: 'info', text: 'Share cancelled due to large image.' })
              setExporting(false)
              return
            }
            // if proceed, leave as data URL
          } else if (c.image.startsWith('blob:') || c.image.startsWith('object:')) {
            const { proceed, blob } = await fetchBlobWithSizeCheck(c.image)
            if (!proceed) {
              pushToast({ type: 'info', text: 'Share cancelled due to large image.' })
              setExporting(false)
              return
            }
            if (blob) {
              c.image = await new Promise((resolve, reject) => {
                const fr = new FileReader()
                fr.onload = () => resolve(fr.result)
                fr.onerror = reject
                fr.readAsDataURL(blob)
              })
            }
          } else if (!/^https?:\/\//i.test(c.image) && c.image.startsWith('/')) {
            c.image = `${window.location.protocol}//${window.location.host}${c.image}`
          }
        }
      } catch (e) {
        console.warn('Failed preparing images for share-as-pdf', e)
        pushToast({ type: 'error', text: 'Failed to prepare images for sharing.' })
        setExporting(false)
        return
      }

      const fileName = `tarot-reading-${new Date(readingDateTime).toISOString().split('T')[0]}.pdf`
      const res = await apiFetch('/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reading: readingPayload, fileName })
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('Server share PDF failed', res.status, res.statusText, text)
        pushToast({ type: 'error', text: 'Server failed to generate PDF for sharing.' })
        setExporting(false)
        return
      }

      const blob = await res.blob()
      const filename = `tarot-reading-${new Date(readingDateTime).toISOString().split('T')[0]}.pdf`

      // Try to share as a file using Web Share API
      try {
        const file = new File([blob], filename, { type: 'application/pdf' })
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Tarot Reading', text: 'Sharing a PDF of the tarot reading.' })
          pushToast({ type: 'success', text: 'PDF shared.' })
          setExporting(false)
          return
        }
      } catch (e) {
        // ignore and fall back to download
        console.warn('Web Share with files not available or failed', e)
      }

      // Fallback: trigger download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      pushToast({ type: 'success', text: 'PDF downloaded.' })
    } catch (err) {
      console.error('Share as PDF failed', err)
      pushToast({ type: 'error', text: 'Failed to share or download PDF.' })
    } finally {
      setExporting(false)
    }
  }

  // Reset reading to original state for new reading
  const resetReadingToOriginalState = () => {
    // Reset reading content
    setQuestion('')
    setInterpretation('')
    setReadingDateTime(() => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hour = String(now.getHours()).padStart(2, '0')
      const minute = String(now.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hour}:${minute}`
    })

    // Reset spread and cards
    setSelectedSpread('')
    setSpreadName('')
    setSpreadImage(null)
    setSpreadCards([])
    setCardStates([])

    // Reset image uploads
    setUploadedImage(null)
    setUploadedFile(null)

    // Reset reading metadata
    setReadingId(null)
    setSelectedTags([])

    // Keep querent and deck selections as they're likely to be reused
    // Keep user preferences like selectedQuerent and selectedDeck
  }

  // Save reading function
  // Reusable save helper: create (POST) if no readingId, otherwise update (PUT)
  const saveReading = async ({ explicit = false } = {}) => {
    if (explicit) setSavingReading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        if (explicit) throw new Error('Please sign in to save readings')
        return
      }

      // Build drawn cards from cardStates (prefer explicit edits) or fallback to spreadCards
      const drawnCards = (cardStates && cardStates.length ? cardStates : spreadCards.map((cardName) => ({
        title: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || ''),
        selectedSuit: '',
        selectedCard: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || ''),
        reversed: false,
        interpretation: '',
        image: null
      }))).map((cs) => ({
        title: cs.title || '',
        suit: cs.selectedSuit || cs.suit || '',
        card: cs.selectedCard || cs.card || cs.title || '',
        reversed: !!cs.reversed,
        interpretation: cs.interpretation || '',
        image: cs.image || null
      }))

      const readingData = {
        querent: selectedQuerent,
        spread: selectedSpread,
        image: uploadedImage,
        question: question,
        deck: selectedDeck,
        // Ensure we send an explicit ISO timestamp (includes timezone) so server
        // and DB store the intended moment instead of relying on ambiguous
        // local-only strings like "YYYY-MM-DDTHH:mm" which can be parsed
        // inconsistently between environments.
        dateTime: (function() {
          try { return new Date(readingDateTime).toISOString() } catch (e) { return readingDateTime }
        })(),
        drawnCards,
        interpretation: interpretation,
        selectedTags: selectedTags,
        userId: user?._id || (typeof window !== 'undefined' ? (() => { try { const u = localStorage.getItem('user'); return u ? JSON.parse(u).id || JSON.parse(u)._id : null } catch (e) { return null } })() : null)
      }

      // If we don't have an id yet, create a new reading
      if (!readingId) {
        const res = await apiFetch('/readings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(readingData)
        })

        if (!res.ok) {
          const error = await res.json().catch(() => ({}))
          throw new Error(error.error || 'Failed to save reading')
        }

        const result = await res.json()
        if (result && result.reading && result.reading._id) {
          setReadingId(result.reading._id)
        }
        // If there's a pending file to upload, do it now and patch the reading image
        if (uploadedFile) {
          try {
            setUploadingImage(true)
            const idToUse = (result && result.reading && result.reading._id) || result && result._id
            if (idToUse) {
              const form = new FormData()
              form.append('image', uploadedFile)
              
              // Add Vercel Blob metadata for reading image
              prepareBlobUpload(form, {
                filename: `reading-${idToUse}-${Date.now()}.${uploadedFile.type.split('/')[1] || 'jpg'}`,
                contentType: uploadedFile.type
              })
              
              const uploadRes = await apiFetch(`/blob-upload?id=${idToUse}`, { 
                method: 'POST', 
                body: form,
                headers: {
                  'X-Vercel-Blob-Store': 'true',
                }
              })
              if (uploadRes.ok) {
                const ures = await uploadRes.json().catch(() => ({}))
                // Handle Vercel Blob response format using utility
                const blobImageUrl = extractBlobUrl(ures)
                if (blobImageUrl) {
                  setUploadedImage(blobImageUrl)
                  // Update readingData.image so callers receive the final URL
                  readingData.image = blobImageUrl
                  pushToast({ type: 'success', text: 'Image uploaded to Vercel Blob and attached to reading.' })
                  // clear pending file
                  setUploadedFile(null)
                }
              } else {
                const err = await uploadRes.json().catch(() => ({}))
                console.warn('Image upload during save failed', err)
                // Roll back the created reading to avoid orphaned reading without image
                try {
                  await apiFetch(`/readings/${idToUse}`, { method: 'DELETE' })
                  setReadingId(null)
                  pushToast({ type: 'error', text: 'Image upload failed during save — reading was rolled back.' })
                } catch (delErr) {
                  console.error('Failed to rollback reading after image upload failure', delErr)
                  pushToast({ type: 'error', text: 'Image upload failed and rollback also failed. Please check server.' })
                }
                throw new Error('Image upload failed during save')
              }
            }
          } catch (err) {
            console.error('Failed to upload pending image during save', err)
            // Attempt rollback if we have a created reading id
            try {
              const idToUse = (result && result.reading && result.reading._id) || result && result._id
              if (idToUse) {
                await apiFetch(`/readings/${idToUse}`, { method: 'DELETE' })
                setReadingId(null)
                pushToast({ type: 'error', text: 'Failed to upload image during save — reading rolled back.' })
              }
            } catch (delErr) {
              console.error('Rollback failed', delErr)
              pushToast({ type: 'error', text: 'Failed to upload image and rollback failed.' })
            }
            throw err
          } finally {
            setUploadingImage(false)
          }
        }
        if (explicit) {
          pushToast({ type: 'success', text: 'Reading saved successfully!' })
          resetReadingToOriginalState()
        }
        return result
      }

      // Otherwise update existing reading. Note: server PUT currently updates question, interpretation, dateTime.
      // On update, send the full reading data so server can persist querent, spread, deck, drawnCards, image, etc.
      // If we have a pending image file, upload it first so we can include the final URL in the PUT
      // Ensure the reading still exists on the server before attempting an update. It's possible the
      // reading was rolled back (deleted) after a failed image upload in a prior attempt. If it's
      // missing, recreate it via POST and continue.
      try {
        if (readingId) {
          const checkRes = await apiFetch(`/readings/${readingId}`, { method: 'GET' })
          if (!checkRes.ok) {
            // If server says not found, clear readingId and fall back to create a new reading
            if (checkRes.status === 404) {
              setReadingId(null)
              pushToast({ type: 'info', text: 'Previous reading was missing on server — recreating.' })
              const createRes = await apiFetch('/readings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(readingData)
              })
              if (!createRes.ok) {
                const err = await createRes.json().catch(() => ({}))
                throw new Error(err.error || 'Failed to recreate reading on server')
              }
              const created = await createRes.json()
              if (created && created.reading && created.reading._id) {
                setReadingId(created.reading._id)
              }
            }
          }
        }
      } catch (checkErr) {
        console.warn('Failed to verify reading existence before update', checkErr)
      }

      if (uploadedFile) {
        try {
          setUploadingImage(true)
          const form = new FormData()
          form.append('image', uploadedFile)
          
          // Add Vercel Blob metadata for reading image update
          prepareBlobUpload(form, {
            filename: `reading-${idForUpload}-update-${Date.now()}.${uploadedFile.type.split('/')[1] || 'jpg'}`,
            contentType: uploadedFile.type
          })
          
          const idForUpload = readingId
          const uploadRes = await apiFetch(`/blob-upload?id=${idForUpload}`, { 
            method: 'POST', 
            body: form,
            headers: {
              'X-Vercel-Blob-Store': 'true',
            }
          })
          if (uploadRes.ok) {
            const ures = await uploadRes.json().catch(() => ({}))
            // Handle Vercel Blob response format using utility
            const blobImageUrl = extractBlobUrl(ures)
            if (blobImageUrl) {
              setUploadedImage(blobImageUrl)
              readingData.image = blobImageUrl
              setUploadedFile(null)
              pushToast({ type: 'success', text: 'Image uploaded to Vercel Blob and attached to reading.' })
            }
          } else {
            const err = await uploadRes.json().catch(() => ({}))
            console.warn('Image upload during save failed', err)
            pushToast({ type: 'error', text: 'Image upload failed during save.' })
          }
        } catch (err) {
          console.error('Failed to upload pending image during save', err)
          pushToast({ type: 'error', text: 'Failed to upload image during save.' })
        } finally {
          setUploadingImage(false)
        }
      }

      const res = await apiFetch(`/readings/${readingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readingData)
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to update reading')
      }

      if (explicit) {
        pushToast({ type: 'success', text: 'Reading updated.' })
        resetReadingToOriginalState()
      }
      return await res.json()
    } catch (err) {
      console.error('Error saving/updating reading:', err)
      if (explicit) pushToast({ type: 'error', text: err.message || 'Failed to save reading' })
      return null
    } finally {
      if (explicit) setSavingReading(false)
    }
  }

  // Preserve previous API: form submit calls explicit save
  const handleSaveReading = async (e) => {
    e.preventDefault()
    await saveReading({ explicit: true })
  }

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

  // Autosave removed: we only save when the user explicitly clicks Save.

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

  // load decks for deck select
  useEffect(() => {
    let mounted = true
    const loadDecks = async () => {
      try {
        const res = await apiFetch('/decks')
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        const list = Array.isArray(data) ? data : (data.decks || [])
        setDecks(list)
        if (list.length) {
          // Prefer a public Rider-Waite deck (no owner) or a deck explicitly named 'Rider-Waite Tarot'
          const publicRider = list.find(d => !d.owner && (d.deckName === 'Rider-Waite Tarot' || d.deckName.toLowerCase().includes('rider')))
          const byName = list.find(d => d.deckName === 'Rider-Waite Tarot')
          const defaultDeck = publicRider || byName || list[0]
          setSelectedDeck(prev => prev || defaultDeck._id)
        }
      } catch (err) {
        console.warn('Failed to load decks', err)
      }
    }
    loadDecks()
    return () => { mounted = false }
  }, [user])

  // load tags for tags dropdown
  useEffect(() => {
    let mounted = true
    const loadTags = async () => {
      try {
        const res = await apiFetch('/tags')
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        // Check if data has tags property, otherwise use empty array
        const tagsArray = data.tags || (Array.isArray(data) ? data : [])
        setTags(tagsArray)
      } catch (err) {
        console.warn('Failed to load tags', err)
      }
    }
    loadTags()
    return () => { mounted = false }
  }, [user])

  // load spread image when selectedSpread changes
  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!selectedSpread) { setSpreadImage(null); return }
      try {
        // First try to get image URL from the blob service (much faster)
        const blobImageUrl = await getSpreadImageUrl(selectedSpread)
        if (blobImageUrl && mounted) {
          console.log('📸 Using blob URL for spread:', blobImageUrl)
          setSpreadImage(blobImageUrl)
        }
        
        // Get spread data from API for cards and metadata
        const isId = /^[0-9a-fA-F]{24}$/.test(selectedSpread)
        const url = isId ? `/spreads/${selectedSpread}` : `/spreads/by-name?name=${encodeURIComponent(selectedSpread)}`
        const res = await apiFetch(url)
        if (!res.ok) {
          console.warn('[Spread load] fetch failed', url, res.status)
          return
        }
        const data = await res.json()
        
        // If we didn't get a blob URL, use the API image as fallback
        if (!blobImageUrl && data.image) {
          setSpreadImage(data.image)
        }
        
        // spreads store card position names in `cards` (array)
        // Handle different response formats: direct object vs wrapped in array/other structure
        let cards = []
        if (Array.isArray(data.cards)) {
          cards = data.cards
        } else if (data && Array.isArray(data)) {
          // If response is an array of spreads, find the matching one
          const spread = data.find(s => s._id === selectedSpread || s.spread === selectedSpread)
          if (spread && Array.isArray(spread.cards)) {
            cards = spread.cards
          }
        } else if (data.spread && Array.isArray(data.spread.cards)) {
          // If nested under spread property
          cards = data.spread.cards
        }
        
        setSpreadCards(cards)
        // set spread display name (ensure we show the name, not an id)
        const spreadDisplayName = data.spread || (data.name) || (isId ? '' : selectedSpread)
        setSpreadName(spreadDisplayName)
        // initialize cardStates to match the cards array length
        setCardStates(cards.map((c) => ({ title: typeof c === 'string' ? c : (c.name || c.title || ''), selectedSuit: '', selectedCard: '', reversed: false, interpretation: '', image: null })))
      } catch (err) {
        console.warn('Failed to load spread data', err)
        if (mounted) setSpreadImage(null)
      }
    }
    load()
    return () => { mounted = false }
  }, [selectedSpread])

  // camera handled by CameraModal component
  // When camera returns a data URL, auto-upload it to the server and attach to reading
  const handleCapturedImageUpload = async (dataUrl) => {
    if (!dataUrl) return
    try {
      // Convert dataURL to Blob and keep as a File in state so we can upload on Save
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const name = `camera-${Date.now()}.jpg`
      const fileToStore = new File([blob], name, { type: blob.type || 'image/jpeg' })

      // Show a preview and keep file pending for upload on Save
      try {
        const preview = URL.createObjectURL(fileToStore)
        setUploadedImage(preview)
      } catch (e) {
        // fallback to dataUrl preview
        setUploadedImage(dataUrl)
      }
      setUploadedFile(fileToStore)
      pushToast({ type: 'info', text: 'Image ready — it will be attached when you save the reading.' })
    } catch (err) {
      console.error('Failed to process captured image', err)
      pushToast({ type: 'error', text: 'Failed to process captured image' })
    }
  }

  // Handle adding new tag
  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      pushToast({ type: 'error', text: 'Please enter a tag name' })
      return
    }

    try {
      setAddingTag(true)
      const res = await apiFetch('/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() })
      })

      if (!res.ok) {
        throw new Error('Failed to create tag')
      }

      const data = await res.json()
      setTags(prev => [...prev, data.tag])
      setSelectedTags(prev => [...prev, data.tag._id])
      setNewTagName('')
      pushToast({ type: 'success', text: 'Tag created and added to reading' })
    } catch (err) {
      console.error('Error creating tag:', err)
      pushToast({ type: 'error', text: 'Failed to create tag' })
    } finally {
      setAddingTag(false)
    }
  }

  // Handle tag selection change
  const handleTagSelectionChange = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  return (
    <AuthWrapper>
      <form id="reading" className="reading" onSubmit={handleSaveReading}>
  <ExportSignInModal show={showExportSignInModal} onClose={() => setShowExportSignInModal(false)} />
  <LargeImageWarningModal info={largeImagePending} getImageSizeLimitBytes={getImageSizeLimitBytes} onClose={() => setLargeImagePending(null)} />
  <Toasts toasts={toasts} onRemove={removeToast} />
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

          <button type="button" className="btn btn-tarot-primary btn-sm" id="addQuerentBtn" onClick={() => { setAddingQuerent(true); setNewQuerentName('') }}>Add</button>
        </div>
    
            {/* ...existing code... */}
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
                <div className="card-body d-flex align-items-center justify-content-center" style={{ minHeight: 360 }}>
                  {spreadImage ? (
                    <Image
                      src={spreadImage}
                      alt="Spread"
                      width={1600}
                      height={720}
                      className="spread-image"
                      style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                      unoptimized={spreadImage?.includes('vercel-storage.com')}
                    />
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
                      {uploadedImage.startsWith('blob:') ? (
                        <img
                          src={uploadedImage}
                          alt="Uploaded preview"
                          style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain', maxHeight: '280px' }}
                        />
                      ) : (
                        <Image
                          src={uploadedImage}
                          alt="Uploaded preview"
                          width={600}
                          height={280}
                          style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="mb-2 text-center text-muted">No image chosen</div>
                  )}

                  <div className="mb-2 small text-muted">Image conversion limit: {(getImageSizeLimitBytes() / 1024 / 1024).toFixed(2)} MB</div>
                  <div className="d-flex align-items-center mb-3" style={{ gap: 8 }}>
                    <a href="/settings" className="btn btn-outline-secondary btn-sm">Settings</a>
                    <div className="form-text">Open Settings to change export image size threshold</div>
                  </div>

                  <div className="d-flex gap-2">
                    <label className="btn btn-outline-primary mb-0">
                      Choose file
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                        const f = e.target.files && e.target.files[0]
                        if (!f) return
                        
                        console.log('File selected:', f.name, f.type, f.size)
                        
                        try {
                          // Check if it's a HEIC file and show loading
                          const isHeic = f.type === 'image/heic' || f.name.toLowerCase().endsWith('.heic')
                          if (isHeic) {
                            setConvertingImage(true)
                          }
                          
                          const { ensurePreviewableImage } = await import('../lib/heicConverter')
                          const { file: maybeFile, previewUrl } = await ensurePreviewableImage(f)
                          
                          console.log('Converted file:', maybeFile?.name, maybeFile?.type, 'Preview URL:', previewUrl)
                          const finalUrl = previewUrl || URL.createObjectURL(maybeFile || f)
                          setUploadedImage(finalUrl)
                          setUploadedFile(maybeFile || f)
                          console.log('Set uploadedImage to:', finalUrl)
                          
                          if (isHeic) {
                            setConvertingImage(false)
                          }
                        } catch (err) {
                          console.warn('HEIC conversion failed:', err)
                          setConvertingImage(false)
                          const url = URL.createObjectURL(f)
                          setUploadedImage(url)
                          setUploadedFile(f)
                          console.log('Fallback: set uploadedImage to:', url)
                        }
                      }} />
                    </label>

                    {convertingImage && (
                      <div className="text-center mt-2 mb-2">
                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <small className="text-muted">Converting HEIC image...</small>
                      </div>
                    )}

                    <button type="button" className="btn btn-outline-secondary mb-0" onClick={() => setShowCameraModal(true)}>
                      Camera
                    </button>

                    <button className="btn btn-outline-danger" disabled={!uploadedImage} onClick={() => { setUploadedImage(null); /* legacy message cleared */ }}>Remove</button>
                  </div>
                </div>
                <div className="card-footer small text-muted">Reading image (upload or camera)</div>
              </div>
            </div>
          </div>
        </div>
      
      {/* Question input (matches Spread label styling) */}
      <div className="mt-3">
        <label htmlFor="readingQuestion" className="form-label mb-0">Question</label>
        <input id="readingQuestion" className="form-control" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Enter your question for the reading" />
      </div>

      {/* Deck select populated from API (label inline, centered, matching Spread label) */}
      <div className="mt-3 d-flex justify-content-center">
        <div className="d-flex align-items-center" style={{ gap: 12 }}>
          <label htmlFor="deckSelect" className="form-label mb-0 text-white me-2" style={{ fontSize: '20px', fontWeight: 400 }}>Deck</label>
          <select id="deckSelect" className="form-select" value={selectedDeck} onChange={(e) => setSelectedDeck(e.target.value)} style={{ width: 320 }}>
            <option value="">-- Select deck --</option>
            {decks.map(d => (
              <option key={d._id} value={d._id}>{d.deckName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards Drawn label aligned left with question and two-column section */}
      <div className="mt-2">
        <p className="mb-0 text-white" style={{ fontSize: '20px', fontWeight: 400, textAlign: 'left' }}>Cards Drawn:</p>
      </div>
      {/* Render a Card component for each position in the selected spread */}
      <div className="mt-3">
        <div className="row">
          {spreadCards && spreadCards.length ? (
            spreadCards.map((cardName, idx) => (
              <div key={idx} className="col-12 mb-3">
                <Card 
                  title={typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || '')} 
                  deck={decks.find(d => d._id === selectedDeck)?.deckName || 'rider-waite'}
                  deckData={decks.find(d => d._id === selectedDeck)}
                  initialSelectedSuit={cardStates[idx]?.selectedSuit}
                  initialSelectedCard={cardStates[idx]?.selectedCard}
                  initialReversed={cardStates[idx]?.reversed}
                  initialInterpretation={cardStates[idx]?.interpretation}
                  initialImage={cardStates[idx]?.image}
                  onChange={(state) => {
                    setCardStates(prev => {
                      const copy = [...prev]
                      copy[idx] = { ...copy[idx], ...state }
                      return copy
                    })
                  }}
                />
              </div>
            ))
          ) : (
            <div className="col-12 text-muted">No cards drawn — select a spread.</div>
          )}
        </div>
      </div>

      {/* Reading date & time (editable) - centered and smaller */}
      <div className="mt-3 d-flex flex-column align-items-center">
        <label htmlFor="readingDateTime" className="form-label mb-1 text-center">Reading date & time</label>
        <input
          id="readingDateTime"
          type="datetime-local"
          className="form-control text-center"
          style={{ width: 260 }}
          value={readingDateTime}
          onChange={(e) => { setReadingDateTime(e.target.value); setManualOverride(true) }}
        />
        <div className="form-text text-center">Local time — updates automatically until you edit it.</div>
      </div>
      {/* My Interpretation textarea (full width) */}
      <div className="mt-3">
        <label htmlFor="myInterpretation" className="form-label mb-1">My Interpretation</label>
        <textarea
          id="myInterpretation"
          className="form-control"
          rows={6}
          placeholder="Write your interpretation for this reading here..."
          value={interpretation}
          onChange={(e) => setInterpretation(e.target.value)}
        />
      </div>

      {/* Tags section */}
      <div className="mt-3">
        <label className="form-label mb-2">Tags</label>
        
        {/* Selected tags display */}
        {selectedTags.length > 0 && (
          <div className="mb-2 tags-badges">
            {selectedTags.map(tagId => {
              const tag = tags.find(t => t._id === tagId)
              if (!tag) return null
              return (
                <span 
                  key={tagId}
                  className="badge bg-secondary me-1 mb-1"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleTagSelectionChange(tagId)}
                  title="Click to remove"
                >
                  {tag.name} ×
                </span>
              )
            })}
          </div>
        )}

        {/* Tags dropdown and add button */}
        <div className="tags-row d-flex justify-content-center align-items-center gap-2">
          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '200px' }}
            value=""
            onChange={(e) => {
              if (e.target.value) {
                handleTagSelectionChange(e.target.value)
                e.target.value = ""
              }
            }}
          >
            <option value="">Select a tag...</option>
            {/* Global tags first */}
            {tags
              .filter(tag => tag.isGlobal && !selectedTags.includes(tag._id))
              .map(tag => (
                <option key={tag._id} value={tag._id}>
                  {tag.name}
                </option>
              ))
            }
            {/* Personal tags second */}
            {tags
              .filter(tag => !tag.isGlobal && !selectedTags.includes(tag._id))
              .map(tag => (
                <option key={tag._id} value={tag._id}>
                  {tag.name} (Personal)
                </option>
              ))
            }
          </select>

          {/* Add new tag input and button */}
          <div className="new-tag-input d-flex align-items-center gap-1">
            <input
              type="text"
              className="form-control"
              style={{ width: '150px' }}
              placeholder="New tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <button
              type="button"
              className="btn btn-tarot-primary btn-sm"
              onClick={handleAddTag}
              disabled={addingTag || !newTagName.trim()}
            >
              {addingTag ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : (
                'Add'
              )}
            </button>
          </div>
        </div>
        {/* Styles moved to `app/styles/_components.scss` */}
      </div>

      {/* Save Reading Button */}
      <div className="mt-4 d-flex justify-content-center">
        <div className="d-flex align-items-center" style={{ gap: 12 }}>
          <button 
            type="submit" 
            className="btn btn-tarot-primary btn-lg"
            disabled={savingReading}
          >
            {savingReading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Saving Reading...
              </>
            ) : (
              'Save Reading'
            )}
          </button>

          {/* Autosave removed - explicit Save only */}
        </div>
      </div>

      {/* Export/Share Actions (reusable) - add spacing from Save button */}
      <div className="mt-3 d-flex justify-content-center">
        <ExportToolbar
          onPrint={handlePrintReading}
          onSharePdf={handleShareAsPdf}
          onExport={handleExportReading}
          onShareText={handleShareReading}
          busy={exporting}
        />
      </div>
      </form>
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

  <CameraModal show={showCameraModal} onClose={() => setShowCameraModal(false)} onCaptured={(dataUrl) => { setShowCameraModal(false); handleCapturedImageUpload(dataUrl) }} />
    </AuthWrapper>
  )
}
