"use client"

import { useEffect, useState, useActionState } from 'react'
import Image from 'next/image'
import AuthWrapper from '../components/AuthWrapper'

import { getSpreadImageUrl } from '../lib/imageServiceV3'
import { 
  saveReadingAction, 
  createTagAction,
  exportPdfAction,
  getReadingAction,
  deleteReadingAction,
  createReadingAction,
  updateReadingAction,
  uploadBlobAction,
  getQuerentsAction,
  getDecksAction,
  getSingleDeckAction,
  getTagsAction,
  getSpreadsAction,
  createQuerentAction
} from '../lib/actions'
import { uploadImageToBlob } from '../lib/blobUpload'

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
import logger from '../lib/logger'
import QuerentModal from '../components/QuerentModal'
import SpreadSelect from '../components/SpreadSelect'
import SpreadModal from '../components/SpreadModal'
import CameraModal from '../components/CameraModal'
import Card from '../components/Card'
import Toasts from '../components/Toasts'
import ToastPortal from '../components/ToastPortal'
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
  const [uploadedImage, setUploadedImage] = useState(null) // Actual Vercel Blob URL
  const [previewImage, setPreviewImage] = useState(null) // Browser blob URL for preview
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

  // Server Action states
  // Upload image handler (separate from Server Action)
  const handleImageUpload = async () => {
    if (!uploadedFile || uploadedFile.size === 0) {
      pushToast({ type: 'warning', text: 'Please choose an image first before uploading.' })
      return
    }
    
    try {
      setUploadingImage(true)
      
      // Use a temporary ID for new readings
      const tempReadingId = readingId || `temp-${Date.now()}`
      const uploadResult = await uploadImageToBlob(tempReadingId, uploadedFile)
      
      if (uploadResult.success) {
        const imageUrl = uploadResult.url || uploadResult.imageUrl
        setUploadedImage(imageUrl)
        setUploadedFile(null) // Clear pending file

        pushToast({ type: 'success', text: 'Image uploaded successfully' })
      } else {

        pushToast({ type: 'error', text: 'Image upload failed' })
      }
    } catch (error) {

      pushToast({ type: 'error', text: 'Image upload failed' })
    } finally {
      setUploadingImage(false)
    }
  }

  // Old handler (will be removed)
  const handleSaveReadingWithImage = async (formData) => {
    // Debug log removed
    
    let imageUrl = uploadedImage // Use existing image if available
    
    // If there's a pending file upload, do it first
    if (uploadedFile && uploadedFile.size > 0) {
      try {

        setUploadingImage(true)
        
        // Use a temporary ID for new readings
        const tempReadingId = readingId || `temp-${Date.now()}`
        const uploadResult = await uploadImageToBlob(tempReadingId, uploadedFile)
        
        if (uploadResult.success) {
          imageUrl = uploadResult.url || uploadResult.imageUrl
          setUploadedImage(imageUrl)
          setUploadedFile(null) // Clear pending file
        } else {

          pushToast({ type: 'warning', text: 'Image upload failed, saving reading without image' })
        }
      } catch (error) {
  logger.error('� handleSaveReading: Image upload error:', error)
        pushToast({ type: 'warning', text: 'Image upload failed, saving reading without image' })
      } finally {
        setUploadingImage(false)
      }
    }
    
    // Prepare reading data for server action
    const cards = cardStates.map(cs => ({
      title: cs.title || '',
      suit: cs.selectedSuit || '',
      card: cs.selectedCard || (cs.title || ''),
      reversed: !!cs.reversed,
      interpretation: cs.interpretation || '',
      image: cs.image || null
    }))
    
    // Add cards, tags, and image URL to form data
    formData.append('cards', JSON.stringify(cards))
    formData.append('tags', JSON.stringify(selectedTags))
    formData.append('readingId', readingId || '')
    formData.append('imageUrl', imageUrl || '')

    const result = await saveReadingAction(formData)
    
    if (result.success) {
      setReadingId(result.readingId)
      pushToast({ type: 'success', text: result.message })
      return { success: true, readingId: result.readingId }
    } else {
      pushToast({ type: 'error', text: result.error })
      return { error: result.error }
    }
  }

  const [readingState, readingFormAction, readingPending] = useActionState(async (prevState, formData) => {
    try {

      pushToast({ type: 'info', text: 'Saving reading...' })


      
      // Prepare reading data for server action
      const cards = cardStates.map(cs => ({
        title: cs.title || '',
        suit: cs.selectedSuit || '',
        card: cs.selectedCard || (cs.title || ''),
        reversed: !!cs.reversed,
        interpretation: cs.interpretation || '',
        image: cs.image || null
      }))
      
      // Add cards and tags to form data
      formData.append('cards', JSON.stringify(cards))
      formData.append('tags', JSON.stringify(selectedTags))
      formData.append('readingId', readingId || '')
      formData.append('imageUrl', uploadedImage || '') // Use existing uploaded image

      const result = await saveReadingAction(formData)
      
      if (result.success) {
        setReadingId(result.readingId)
        pushToast({ type: 'success', text: result.message })
        
        // Refresh the page after 2 seconds for a new reading
        setTimeout(() => {
          window.location.reload()
        }, 2000)
        
        return { success: true, readingId: result.readingId }
      } else {
        pushToast({ type: 'error', text: result.error })
        return { error: result.error }
      }
    } catch (error) {

      pushToast({ type: 'error', text: 'Failed to save reading' })
      return { error: error.message }
    }
  }, { success: false, error: null })

  const [tagState, tagFormAction, tagPending] = useActionState(async (prevState, formData) => {
    const result = await createTagAction(formData)
    if (result.success) {
      setTags(prev => [...prev, result.tag])
      setSelectedTags(prev => [...prev, result.tag._id])
      setNewTagName('')
      pushToast({ type: 'success', text: result.message })
      return { success: true, tag: result.tag }
    } else {
      pushToast({ type: 'error', text: result.error })
      return { error: result.error }
    }
  }, { success: false, error: null })

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

  // Note: Image upload is now handled before the Server Action in handleSaveReadingWithImage

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
              // Warning suppressed
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
              // Warning suppressed
              // leave as-is if conversion fails
            }
          } else if (!/^https?:\/\//i.test(copy.image) && copy.image.startsWith('/')) {
            // make absolute
            copy.image = `${window.location.protocol}//${window.location.host}${copy.image}`
          }
        }
      } catch (e) {
        // Warning suppressed
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
    setTimeout(() => { try { printWindow.print(); printWindow.onafterprint = () => { try { printWindow.close() } catch (e) {} } } catch (err) { pushToast({ type: 'error', text: 'Print failed.' }) } }, 300)
  }

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  // legacy forwarding removed; other modules should call `notify()` directly
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [showExportSignInModal, setShowExportSignInModal] = useState(false)
  const [question, setQuestion] = useState('')
  const [decks, setDecks] = useState([])
  const [selectedDeck, setSelectedDeck] = useState('')
  const [selectedDeckDetails, setSelectedDeckDetails] = useState(null) // Full deck with cards
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
      const hasLocalImage = uploadedFile || previewImage || (uploadedImage && (uploadedImage.startsWith('data:') || uploadedImage.startsWith('blob:') || uploadedImage.startsWith('object:')))
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
      // Warning suppressed
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
      // Warning suppressed
      pushToast({ type: 'error', text: 'Failed to prepare images for export.' })
      setExporting(false)
      return
    }
    try {
      const fileName = `tarot-reading-${new Date(readingDateTime).toISOString().split('T')[0]}.pdf`
      
  // Call export action with a plain object for consistent payload format
  const result = await exportPdfAction({ reading: readingPayload, fileName })
      
      if (!result.success) {
    logger.error('Server export failed:', result.error)
        pushToast({ type: 'error', text: `Export failed: ${result.error}` })
        throw new Error('Server export failed')
      }

      // Convert base64 to blob and download
      const binaryString = atob(result.data.blob)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: result.data.contentType || 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      pushToast({ type: 'success', text: 'Exported PDF downloaded.' })
      setExporting(false)
      return
    } catch (err) {
      // fallback to client-side print if server export fails
      // Warning suppressed
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
    setTimeout(() => { 
      try { 
        printWindow.print(); 
        printWindow.onafterprint = () => { 
          try { printWindow.close() } catch (e) {} 
        } 
      } catch (err) { 
        // Print failed 
      } 
    }, 300)
  }

  // Share reading as text
  const handleShareReading = async () => {
    try {
      const readingText = [
        `Tarot Reading - ${new Date(readingDateTime).toLocaleString()}`,
        `By: ${user?.username || 'Guest'}`,
        `Querent: ${selectedQuerent === 'self' ? 'Self' : (querents.find(q => q._id === selectedQuerent)?.name || 'Unknown')}`,
        `Spread: ${spreadName || selectedSpread || 'No spread selected'}`,
        `Deck: ${decks.find(d => d._id === selectedDeck)?.deckName || 'Unknown deck'}`,
        question ? `Question: ${question}` : '',
        '',
        'Cards:',
        ...(cardStates && cardStates.length ? cardStates : spreadCards.map(cardName => ({ title: typeof cardName === 'string' ? cardName : (cardName.name || cardName.title || '') }))).map((cs, i) => 
          `${i + 1}. ${cs.title || ''} ${cs.selectedCard || ''} ${cs.reversed ? '(Reversed)' : ''}\n   ${cs.interpretation || 'No interpretation'}`
        ),
        '',
        interpretation ? `Overall Interpretation: ${interpretation}` : '',
        '',
        'Generated by My Tarot Readings'
      ].filter(Boolean).join('\n')

      if (navigator.share) {
        await navigator.share({
          title: 'Tarot Reading',
          text: readingText
        })
        pushToast({ type: 'success', text: 'Reading shared successfully.' })
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(readingText)
        pushToast({ type: 'success', text: 'Reading copied to clipboard.' })
      }
    } catch (err) {
  logger.error('Share reading failed:', err)
      pushToast({ type: 'error', text: 'Failed to share reading.' })
    }
  }

  // Share reading as PDF
  const handleShareAsPdf = async () => {
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

    setExporting(true)
    
    try {
      // Ensure card images are properly formatted
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
      // Warning suppressed
      pushToast({ type: 'error', text: 'Failed to prepare images for sharing.' })
      setExporting(false)
      return
    }

    try {
      const fileName = `tarot-reading-${new Date(readingDateTime).toISOString().split('T')[0]}.pdf`
      
  // Call export action with a plain object for consistent payload format
  const result = await exportPdfAction({ reading: readingPayload, fileName })

      if (!result.success) {
        // Server share PDF failed
        pushToast({ type: 'error', text: 'Server failed to generate PDF for sharing.' })
        setExporting(false)
        return
      }

      // Convert base64 to blob
      const binaryString = atob(result.data.blob)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: result.data.contentType || 'application/pdf' })
      const filename = `tarot-reading-${new Date(readingDateTime).toISOString().split('T')[0]}.pdf`

      // Try to share as a file using Web Share API
      try {
        const file = new File([blob], filename, { type: 'application/pdf' })
        // Check if share API is available and file sharing is supported
        if (navigator.share && navigator.canShare) {
          // Verify the file can be shared before attempting
          const canShareFile = navigator.canShare({ files: [file] })
          if (canShareFile) {
            await navigator.share({ files: [file], title: 'Tarot Reading', text: 'Sharing a PDF of the tarot reading.' })
            pushToast({ type: 'success', text: 'PDF shared.' })
            setExporting(false)
            return
          }
        }
        // If we reach here, sharing is not available - fall through to download
      } catch (e) {
        // Share failed or was cancelled - fall back to download
        // Errors are expected and handled gracefully (user may cancel, permissions denied, etc.)
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
  logger.error('Share as PDF failed', err)
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
        // Don't include image in initial creation - will be added after blob upload
        image: null,
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

      // Debug log removed

      // If we don't have an id yet, create a new reading
      if (!readingId) {
        const formData = new FormData()
        formData.append('readingData', JSON.stringify(readingData))
        const createResult = await createReadingAction(formData)

        if (!createResult.success) {
          throw new Error(createResult.error || 'Failed to save reading')
        }

        if (createResult.reading && createResult.reading._id) {
          setReadingId(createResult.reading._id)
          
          // Trigger notification for new reading (non-blocking)
          import('../lib/notificationTriggers.js').then(({ NotificationTriggers }) => {
            NotificationTriggers.onReadingCreated({
              _id: createResult.reading._id,
              spread: selectedSpread,
              querent: selectedQuerent
            })
          })// Debug log removed
        }
        // If there's a pending file to upload, do it now and patch the reading image
        // Debug log removed
        if (uploadedFile && uploadedFile.size > 0) {
          try {
            // Debug log removed
            setUploadingImage(true)
            const idToUse = (createResult && createResult.reading && createResult.reading._id) || createResult && createResult._id
            if (idToUse) {

              const uploadResult = await uploadImageToBlob(idToUse, uploadedFile)

              if (uploadResult.success) {
                // Handle Vercel Blob response format using utility
                const blobImageUrl = extractBlobUrl(uploadResult)

                if (blobImageUrl) {
                  setUploadedImage(blobImageUrl)
                  // Update readingData.image so callers receive the final URL
                  readingData.image = blobImageUrl
                  pushToast({ type: 'success', text: 'Image uploaded to Vercel Blob and attached to reading.' })
                  // clear pending file
                  setUploadedFile(null)
                }
              } else {

                // Roll back the created reading to avoid orphaned reading without image
                try {
                  const deleteFormData = new FormData()
                  deleteFormData.append('readingId', idToUse)
                  await deleteReadingAction(deleteFormData)
                  setReadingId(null)
                  pushToast({ type: 'error', text: 'Image upload failed during save — reading was rolled back.' })
                } catch (delErr) {
            logger.error('Failed to rollback reading after image upload failure', delErr)
                  pushToast({ type: 'error', text: 'Image upload failed and rollback also failed. Please check server.' })
                }
                throw new Error('Image upload failed during save')
              }
            }
          } catch (err) {
            logger.error('Failed to upload pending image during save', err)
            // Attempt rollback if we have a created reading id
            try {
              const idToUse = (createResult && createResult.reading && createResult.reading._id) || createResult && createResult._id
              if (idToUse) {
                const deleteFormData = new FormData()
                deleteFormData.append('readingId', idToUse)
                await deleteReadingAction(deleteFormData)
                setReadingId(null)
                pushToast({ type: 'error', text: 'Failed to upload image during save — reading rolled back.' })
              }
            } catch (delErr) {
              logger.error('Rollback failed', delErr)
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
          const checkResult = await getReadingAction(readingId)
          if (!checkResult.success) {
            // If server says not found, clear readingId and fall back to create a new reading
            if (checkResult.error === 'Reading not found') {
              setReadingId(null)
              pushToast({ type: 'info', text: 'Previous reading was missing on server — recreating.' })
              const createFormData = new FormData()
              createFormData.append('readingData', JSON.stringify(readingData))
              const recreateResult = await createReadingAction(createFormData)
              if (!recreateResult.success) {
                throw new Error(recreateResult.error || 'Failed to recreate reading on server')
              }
              if (recreateResult.reading && recreateResult.reading._id) {
                setReadingId(recreateResult.reading._id)
              }
            }
          }
        }
      } catch (checkErr) {
        // Warning suppressed
      }

      if (uploadedFile) {
        try {
          setUploadingImage(true)
          const idForUpload = readingId
          const form = new FormData()
          form.append('image', uploadedFile)
          form.append('readingId', idForUpload)
          
          // Add Vercel Blob metadata for reading image update
          prepareBlobUpload(form, {
            filename: `reading-${idForUpload}-update-${Date.now()}.${uploadedFile.type.split('/')[1] || 'jpg'}`,
            contentType: uploadedFile.type
          })
          
          const updateUploadResult = await uploadImageToBlob(readingId, uploadedFile)
          if (updateUploadResult.success) {
            // Handle Vercel Blob response format using utility
            const blobImageUrl = extractBlobUrl(updateUploadResult)
            if (blobImageUrl) {
              setUploadedImage(blobImageUrl)
              readingData.image = blobImageUrl
              setUploadedFile(null)
              pushToast({ type: 'success', text: 'Image uploaded to Vercel Blob and attached to reading.' })
            }
          } else {
            // Warning suppressed
            pushToast({ type: 'error', text: 'Image upload failed during save.' })
          }
        } catch (err) {
          logger.error('Failed to upload pending image during save', err)
          pushToast({ type: 'error', text: 'Failed to upload image during save.' })
        } finally {
          setUploadingImage(false)
        }
      }

      const updateFormData = new FormData()
      updateFormData.append('readingId', readingId)
      updateFormData.append('readingData', JSON.stringify(readingData))
      
      const updateResult = await updateReadingAction(updateFormData)

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update reading')
      }

      if (explicit) {
        pushToast({ type: 'success', text: 'Reading updated.' })
        resetReadingToOriginalState()
      }
      return updateResult.reading
    } catch (err) {
  logger.error('Error saving/updating reading:', err)
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
      if (!user) return
      try {
        const result = await getQuerentsAction()
        if (result.success && result.querents) {
          setQuerents(result.querents)
        }
      } catch (err) {
        // ignore load errors silently
        // Warning suppressed
      }
    }
    load()
  }, [user])

  // load decks for deck select
  useEffect(() => {
    let mounted = true
    const loadDecks = async () => {
      try {

        // Fetch directly from the frontend proxy so the browser sends cookies
        const resp = await fetch('/api/decks', { method: 'GET', credentials: 'include', headers: { 'Accept': 'application/json' } })
        if (!resp.ok) {
          const text = await resp.text().catch(() => '')

          pushToast({ type: 'error', text: `Failed to load decks: ${resp.statusText}` })
          return
        }

        const data = await resp.json()
        // The proxy returns either an array of decks or an object with decks
        const list = Array.isArray(data) ? data : (data.decks || [])


        if (!mounted) return

        // Normalize _id and owner to string so the select values are stable
        const normalized = list.map(d => {
          const rawId = d._id
          let idStr = null
          try {
            if (!rawId) idStr = ''
            else if (typeof rawId === 'string') idStr = rawId
            else if (rawId.$oid) idStr = rawId.$oid
            else if (rawId.toString) idStr = rawId.toString()
            else idStr = String(rawId)
          } catch (e) {
            idStr = String(rawId)
          }

          let ownerStr = null
          try {
            const rawOwner = d.owner
            if (!rawOwner) ownerStr = null
            else if (typeof rawOwner === 'string') ownerStr = rawOwner
            else if (rawOwner.$oid) ownerStr = rawOwner.$oid
            else if (rawOwner.toString) ownerStr = rawOwner.toString()
            else ownerStr = String(rawOwner)
          } catch (e) {
            ownerStr = d.owner
          }

          return {
            ...d,
            _id: idStr,
            owner: ownerStr
          }
        })

        setDecks(normalized)
        
        if (list.length) {
          // Prefer a public Rider-Waite deck (no owner) or a deck explicitly named 'Rider-Waite Tarot'
          const publicRider = list.find(d => !d.owner && (d.deckName === 'Rider-Waite Tarot' || d.deckName.toLowerCase().includes('rider')))
          const byName = list.find(d => d.deckName === 'Rider-Waite Tarot')
          const defaultDeck = publicRider || byName || list[0]

          // If there's a previously selected deck, verify it still exists in the new list
          setSelectedDeck(prev => {
            try {
              if (prev && list.find(d => d._id === prev)) return prev
            } catch (e) {
              // fallthrough
            }
            return defaultDeck._id
          })
        } else {

          pushToast({ type: 'warning', text: 'No decks available. Please create a deck first.' })
        }
      } catch (err) {

        pushToast({ type: 'error', text: 'Failed to load decks: ' + err.message })
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
        const result = await getTagsAction()
        if (!result || !result.success) {
          // Warning suppressed
          return
        }
        if (!mounted) return
        // Check if data has tags property, otherwise use empty array
        const tagsArray = result.tags || []
        setTags(tagsArray)
      } catch (err) {
        // Warning suppressed
      }
    }
    loadTags()
    return () => { mounted = false }
  }, [user])

  // Load full deck details (including cards) when selectedDeck changes
  useEffect(() => {
    if (!selectedDeck) {
      setSelectedDeckDetails(null)
      return
    }

    let mounted = true
    const loadDeckDetails = async () => {
      try {
        const result = await getSingleDeckAction(selectedDeck)
        if (!result || !result.success) {
          return
        }
        if (!mounted) return
        setSelectedDeckDetails(result.deck)
      } catch (err) {
  logger.error('Failed to load deck details:', err)
      }
    }
    loadDeckDetails()
    return () => { mounted = false }
  }, [selectedDeck])

  // load spread image when selectedSpread changes
  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!selectedSpread) { setSpreadImage(null); return }
      try {
        // First try to get image URL from the blob service (much faster)
        const blobImageUrl = await getSpreadImageUrl(selectedSpread)
        if (blobImageUrl && mounted) {

          setSpreadImage(blobImageUrl)
        }
        
        // Get spread data from API for cards and metadata
        const result = await getSpreadsAction()
        if (!result.success) {
          // Warning suppressed
          return
        }
        
        // Find the selected spread in the results
        const isId = /^[0-9a-fA-F]{24}$/.test(selectedSpread)
        const spreads = result.data || []
        const data = spreads.find(s => 
          isId ? (s._id === selectedSpread || s.spread === selectedSpread) : s.name === selectedSpread
        )
        
        if (!data) {
          // Warning suppressed
          return
        }
        
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
        // Warning suppressed
        if (mounted) setSpreadImage(null)
      }
    }
    load()
    return () => { mounted = false }
  }, [selectedSpread])

  // camera handled by CameraModal component
  // When camera returns a data URL, auto-upload it to the server and attach to reading
  const handleCapturedImageUpload = async (dataUrlOrUrl) => {
    if (!dataUrlOrUrl) return
    try {
      // If CameraModal already uploaded the capture and returned a URL, treat it as final
      if (typeof dataUrlOrUrl === 'string' && (dataUrlOrUrl.startsWith('http') || dataUrlOrUrl.startsWith('/'))) {
        setUploadedImage(dataUrlOrUrl)
        setPreviewImage(dataUrlOrUrl)
        setUploadedFile(null)
        pushToast({ type: 'success', text: 'Captured image uploaded and attached.' })
        return
      }

      // Otherwise prepare image using shared helper (handles dataURL and Blobs)
      const { prepareImageForUpload } = await import('../lib/imageUploader')
      const prep = await prepareImageForUpload(dataUrlOrUrl)
      if (!prep.success) {
        pushToast({ type: 'error', text: prep.error || 'Captured image not acceptable' })
        return
      }

      const fileToStore = prep.file
      const preview = prep.previewUrl || null

      setPreviewImage(preview || dataUrlOrUrl)
      setUploadedImage(null)
      setUploadedFile(fileToStore)
      pushToast({ type: 'info', text: 'Image ready — it will be attached when you save the reading.' })
    } catch (err) {
  logger.error('Failed to process captured image', err)
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
      const formData = new FormData()
      formData.append('name', newTagName.trim())
      
      const result = await createTagAction(formData)

      if (!result.success) {
        throw new Error(result.error || 'Failed to create tag')
      }

      setTags(prev => [...prev, result.tag])
      setSelectedTags(prev => [...prev, result.tag._id])
      setNewTagName('')
      pushToast({ type: 'success', text: 'Tag created and added to reading' })
    } catch (err) {
  logger.error('Error creating tag:', err)
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
      <>
        <ExportSignInModal show={showExportSignInModal} onClose={() => setShowExportSignInModal(false)} />
        <LargeImageWarningModal info={largeImagePending} getImageSizeLimitBytes={getImageSizeLimitBytes} onClose={() => setLargeImagePending(null)} />
        <ToastPortal>
          <Toasts toasts={toasts} onRemove={removeToast} />
        </ToastPortal>
        
        <form id="reading" className="reading" action={readingFormAction}>
        <p>Reading by: {user?.username || 'Guest'}</p>
        <h2>Reading</h2>

        <div className="mt-3 querent-row">
          <label htmlFor="querentSelect" className="form-label mb-0">Querent</label>
          <select
            id="querentSelect"
            name="querent"
            className="form-select"
            style={{ width: '100%', minWidth: '200px', maxWidth: '220px' }}
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

              setSelectedSpread(val)
              try { localStorage.setItem('selectedSpread', val) } catch (e) { /* ignore */ }
            }}
          />

          <button
            type="button"
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
                  <div className="mb-3">
                    <div className="fw-bold mb-2">📸 Add Image to Reading</div>
                    <div className="small text-muted">
                      • Choose a file from your device or use your camera<br/>
                      • After selecting, click "Upload Image" to save to cloud
                    </div>
                  </div>
                  {(uploadedImage || previewImage) ? (
                    <div className="mb-2 text-center">
                      {/* Show upload status */}
                      {uploadedImage && (
                        <div className="text-success small mb-1">✓ Uploaded to cloud storage</div>
                      )}
                      {previewImage && !uploadedImage && (
                        <div className="text-warning small mb-1">⚠️ Preview only - not yet uploaded</div>
                      )}
                      
                      {/* Display the image */}
                      {((uploadedImage || previewImage).startsWith('blob:') || (uploadedImage || previewImage).startsWith('data:')) ? (
                        <img
                          src={uploadedImage || previewImage}
                          alt={uploadedImage ? "Uploaded image" : "Preview"}
                          style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain', maxHeight: '280px' }}
                        />
                      ) : (
                        <Image
                          src={uploadedImage || previewImage}
                          alt={uploadedImage ? "Uploaded image" : "Preview"}
                          width={600}
                          height={280}
                          style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="mb-2 text-center text-muted">No image chosen</div>
                  )}

                  <div className="mb-2 small text-muted">💡 Maximum file size: {(getImageSizeLimitBytes() / 1024 / 1024).toFixed(1)}MB</div>

                  <div className="d-flex gap-2">
                    <label className="btn btn-outline-primary mb-0">
                      Choose file
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                        const f = e.target.files && e.target.files[0]

                        if (!f) {

                          return
                        }

                        // Check file size using the same limit as other functions
                        const maxSizeBytes = getImageSizeLimitBytes()
                        if (f.size > maxSizeBytes) {
                          const sizeMB = (f.size / (1024 * 1024)).toFixed(2)
                          const limitMB = (maxSizeBytes / (1024 * 1024)).toFixed(2)
                          pushToast({ 
                            type: 'error', 
                            text: `File too large (${sizeMB}MB). Please choose a file smaller than ${limitMB}MB or compress the image.` 
                          })
                          e.target.value = '' // Clear the input
                          return
                        }
                        
                        try {
                          // Check if it's a HEIC file and show loading
                          const isHeic = f.type === 'image/heic' || f.name.toLowerCase().endsWith('.heic')
                          if (isHeic) {
                            setConvertingImage(true)
                          }
                          
                          const { ensurePreviewableImage } = await import('../lib/heicConverter')
                          const { file: maybeFile, previewUrl } = await ensurePreviewableImage(f)
                          
                          // Debug log removed
          const finalUrl = previewUrl || URL.createObjectURL(maybeFile || f)
          setPreviewImage(finalUrl) // Use previewImage for display
          setUploadedImage(null) // Clear any previous upload
          setUploadedFile(maybeFile || f)
          
          if (isHeic) {
            setConvertingImage(false)
          }
                        } catch (err) {
                          // Warning suppressed
                          setConvertingImage(false)
                          const url = URL.createObjectURL(f)
                          setPreviewImage(url) // Use previewImage for display
                          setUploadedImage(null) // Clear any previous upload
                          setUploadedFile(f)
                          // Debug log removed
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

                    <button 
                      type="button" 
                      className="btn btn-outline-primary mb-0" 
                      disabled={!uploadedFile || uploadingImage} 
                      onClick={handleImageUpload}
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    </button>

                    <button 
                      className="btn btn-outline-danger" 
                      disabled={!uploadedImage && !previewImage} 
                      onClick={() => { 
                        setUploadedImage(null); 
                        setPreviewImage(null);
                        setUploadedFile(null);
                      }}
                    >
                      Remove
                    </button>
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
        <input 
          id="readingQuestion" 
          name="question"
          className="form-control" 
          defaultValue={question}
          onChange={(e) => setQuestion(e.target.value)} 
          placeholder="Enter your question for the reading" 
        />
      </div>

      {/* Deck select populated from API (label inline, centered, matching Spread label) */}
      <div className="mt-3 d-flex justify-content-center">
        <div className="deck-row d-flex align-items-center flex-column flex-md-row" style={{ gap: 12, width: '100%', maxWidth: '600px' }}>
          <label htmlFor="deckSelect" className="form-label mb-0 text-white me-2" style={{ fontSize: '20px', fontWeight: 400 }}>Deck</label>
          <select 
            id="deckSelect" 
            name="deck"
            className="form-select" 
            value={selectedDeck} 
            onChange={(e) => setSelectedDeck(e.target.value)} 
            style={{ width: '100%', minWidth: '280px', maxWidth: '320px' }}
          >
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
                  deckData={selectedDeckDetails}
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
          name="interpretation"
          className="form-control"
          rows={6}
          placeholder="Write your interpretation for this reading here..."
          defaultValue={interpretation}
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
            disabled={readingPending}
          >
            {readingPending ? (
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
        {/* Hidden inputs for form data */}
        <input type="hidden" name="spread" value={selectedSpread} />
        <input type="hidden" name="spreadName" value={spreadName} />
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
          try {
            setSavingQuerent(true)
            const formData = new FormData()
            formData.append('name', name)
            
            const result = await createQuerentAction(formData)
            if (!result.success) {
              throw new Error(result.error || 'Failed to save querent')
            }
            
            setQuerents(prev => [result.querent, ...prev])
            setSelectedQuerent(result.querent._id)
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
      </>
    </AuthWrapper>
  )
}

