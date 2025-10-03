'use client'

import { useEffect, useState } from 'react'
import AuthWrapper from '../../components/AuthWrapper'
import DeckModal from '../../components/DeckModal'
import CameraModal from '../../components/CameraModal'
import SmartImageV2 from '../../components/SmartImageV2'
import { IMAGE_TYPES, getDeckImageUrl, getCardImageUrl } from '../../lib/imageServiceV3'
import {
  getDecksAction,
  getSingleDeckAction,
  createDeckAction,
  uploadDeckBlobAction,
  uploadCardBlobAction
} from '../../lib/actions'

// Vercel Blob utility functions
const extractBlobUrl = (uploadResponse) => {
  if (!uploadResponse) return null
  return uploadResponse.url || uploadResponse.image || uploadResponse.deck?.image || uploadResponse.card?.image
}

const prepareBlobUpload = (formData, options = {}) => {
  if (options.filename) formData.append('filename', options.filename)
  if (options.contentType) formData.append('contentType', options.contentType)
  if (options.cacheControl) formData.append('cacheControl', options.cacheControl)
  return formData
}

// Simple helper: since all images are now local, just return the URL as-is
function normalizeImageUrl(url) {
  return url
}

// Helper function to check if a deck is the Rider-Waite deck (not editable)
function isRiderWaiteDeck(deckDetails) {
  return deckDetails && deckDetails.deckName === 'Rider-Waite Tarot Deck'
}

function Toast({ message, type = 'info', onClose }) {
  if (!message) return null
  const bg = type === 'success' ? 'app-toast--success' : type === 'error' ? 'app-toast--error' : type === 'app-toast--info'
  // Prefer the shared .app-toast-wrapper/.app-toast styles so z-index is managed centrally.
  // Add an inline zIndex fallback extremely high to handle unexpected stacking contexts.
  return (
    <div className="app-toast-wrapper" style={{ zIndex: 99999999 }}>
      <div className={`app-toast ${bg} p-2`} role="alert">
        <div className="app-toast__body">{message}</div>
        <button type="button" className="app-toast__close" aria-label="Close" onClick={onClose}>✕</button>
      </div>
    </div>
  )
}

export default function DecksPage() {
  const [decks, setDecks] = useState([])
  const [selectedDeck, setSelectedDeckState] = useState('')
  
  // Wrap setSelectedDeck with logging
  const setSelectedDeck = (value) => {
    console.log('🎯 setSelectedDeck called with:', value)
    console.trace('🎯 setSelectedDeck stack trace')
    setSelectedDeckState(value)
  }
  const [deckDetails, setDeckDetails] = useState(null)
  const [loadingDeck, setLoadingDeck] = useState(false)
  const [showNewDeckModal, setShowNewDeckModal] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [newDeckDescription, setNewDeckDescription] = useState('')
  const [creatingDeck, setCreatingDeck] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'info' })
  const [uploadingCardIndex, setUploadingCardIndex] = useState(null)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [currentCardForCamera, setCurrentCardForCamera] = useState(null)
  const [showDeckEditModal, setShowDeckEditModal] = useState(false)
  const [uploadingDeckImage, setUploadingDeckImage] = useState(false)
  const [editingCard, setEditingCard] = useState(null) // stores card name being edited
  const [showCardEditModal, setShowCardEditModal] = useState(false)

  useEffect(() => {
    const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
    // Normalize base: remove trailing slashes and a trailing /api if present
    const apiBase = rawBase.replace(/\/+$|\/api$/i, '')

  async function loadDecks() {
      try {
        console.log('🔵 DeckPage: Attempting to fetch decks via Server Action...');
        const result = await getDecksAction()
        console.log('🔵 DeckPage: Raw result:', result)
        
        if (!result.success) {
          console.error('🔴 DeckPage: Failed to fetch decks:', result.error)
          setToast('Failed to load decks: ' + result.error)
          setDecks([])
          return
        }

        // Ensure we have an array to map over
        const arr = Array.isArray(result.decks) ? result.decks : []
        console.log('🔵 DeckPage: Raw decks array:', arr.length, 'decks')
        
        if (arr.length === 0) {
          console.warn('🟡 DeckPage: No decks returned from API')
          setToast('No decks available. Please check your connection.')
          setDecks([])
          return
        }

        const normalized = arr.map(d => {
          console.log('🔵 DeckPage: Normalizing deck:', d?.deckName || d?.name)
          return {
            ...d, // Keep all original properties
            _id: d._id || d.id || '',
            deckName: d.deckName || d.name || d.deck_name || 'Untitled'
          }
        })

        console.log('🟢 DeckPage: Successfully normalized', normalized.length, 'decks')
        console.log('🟢 DeckPage: Available decks:', normalized.map(d => ({ id: d._id, name: d.deckName })))
        
        setDecks(normalized)
        if (normalized.length) {
          console.log('🟢 DeckPage: Setting selected deck to:', normalized[0].deckName)
          setSelectedDeck(normalized[0]._id)
        }
      } catch (err) {
        console.error('🔴 DeckPage: Error loading decks:', err)
        setToast('Failed to load decks: ' + err.message)
        setDecks([])
      }
    }

    loadDecks()
  }, [])

  const handleSelectDeck = (deckId) => {
    console.log('handleSelectDeck called with:', deckId)
    console.trace('handleSelectDeck stack trace')
    setSelectedDeck(deckId)
  }

  // Helper to normalize API base
  const getApiBase = () => {
    const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
    return rawBase.replace(/\/+$/g, '').replace(/\/api$/i, '')
  }

  // Load selected deck details (cards)
  useEffect(() => {
    if (!selectedDeck) {
      setDeckDetails(null)
      return
    }

    // Validate that selectedDeck looks like a valid MongoDB ObjectId
    if (typeof selectedDeck !== 'string' || selectedDeck.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(selectedDeck)) {
      console.warn('🚫 Invalid deck ID format:', selectedDeck, 'Skipping load.')
      console.warn('🚫 Expected 24-character MongoDB ObjectId, got:', typeof selectedDeck, selectedDeck?.length)
      setDeckDetails(null)
      // Reset to empty string to prevent invalid IDs from persisting
      setSelectedDeck('')
      return
    }

    // Clear any uploading states when switching decks
    setUploadingCardIndex(null)
    setUploadingDeckImage(false)

    // Add a small delay to prevent race conditions and multiple rapid calls
    const timeoutId = setTimeout(async () => {
      let cancelled = false
      
      const loadDeck = async () => {
        setLoadingDeck(true)
        console.log('Loading deck with ID:', selectedDeck)
        try {
          const result = await getSingleDeckAction(selectedDeck)
          
          if (!result.success) {
            console.error('Failed to fetch deck:', result.error)
            console.error('Full result object:', result)
            setToast({ message: `Failed to load deck: ${result.error}`, type: 'error' })
            setDeckDetails(null)
            setLoadingDeck(false)
            return
          }
          
          const data = result.deck
          if (!cancelled) {
            // Workaround: Fix incorrect deck cover URL for Rider-Waite deck
            if (data && data.image === 'https://emfobsnlxploca6s.public.blob.vercel-storage.com/decks/Rider_Waite_Tarot_Deck_cover.jpg') {
              data.image = 'https://emfobsnlxploca6s.public.blob.vercel-storage.com/cards/rider-waite/cover-1KaB9HnbWmssDeiwAOtWqkifDAc9FW.jpg';
              console.log('Fixed deck image URL:', data.image);
            }
            setDeckDetails(data);
          }
        } catch (err) {
          console.error('Error loading deck details', err)
          if (!cancelled) setDeckDetails(null)
        } finally {
          if (!cancelled) setLoadingDeck(false)
        }
      }
      
      if (!cancelled) {
        await loadDeck()
      }
    }, 100) // 100ms delay to debounce rapid state changes
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [selectedDeck])

  // Upload a card image for a given card name
  const uploadCardImage = async (cardName, file) => {
    if (!selectedDeck || !file) return null
    try {
      const apiBase = getApiBase()
      const fd = new FormData()
      fd.append('image', file)
      
      // Add Vercel Blob metadata for card image
      prepareBlobUpload(fd, {
        filename: `deck-${selectedDeck}-card-${cardName}-${Date.now()}.${file.type.split('/')[1] || 'jpg'}`,
        contentType: file.type
      })
      
      // Add Vercel Blob metadata
      prepareBlobUpload(fd, {
        filename: `deck-${selectedDeck}-${Date.now()}.${file.type.split('/')[1] || 'jpg'}`,
        contentType: file.type,
        cacheControl: 'public, max-age=31536000'
      })
  // show uploading indicator by finding index
  const idx = deckDetails && Array.isArray(deckDetails.cards) ? deckDetails.cards.findIndex(c => (c.name||'').toLowerCase() === (cardName||'').toLowerCase()) : -1
  if (idx !== -1) setUploadingCardIndex(idx)

      // Create preview URL immediately for instant display
      const previewUrl = URL.createObjectURL(file)

      // Update local state immediately with preview
      setDeckDetails(prev => {
        if (!prev) return prev
        const cards = Array.isArray(prev.cards) ? [...prev.cards] : []
        const cardIdx = cards.findIndex(c => (c.name || '').toLowerCase() === (cardName || '').toLowerCase())
        if (cardIdx !== -1) {
          cards[cardIdx] = { ...cards[cardIdx], image: previewUrl, uploading: true }
        } else {
          cards.push({ name: cardName, image: previewUrl, uploading: true })
        }
        return { ...prev, cards }
      })

      // Add deckId and cardName to formData for Server Action
      fd.append('deckId', selectedDeck)
      fd.append('cardName', cardName)
      
      const result = await uploadCardBlobAction(fd)
      if (!result.success) {
        throw new Error(`Upload failed: ${result.error}`)
      }
      const updated = result
      
      // Handle Vercel Blob response format using utility
      const cardImageUrl = extractBlobUrl(updated)
      
      setToast({ message: 'Card image uploaded to Vercel Blob', type: 'success' })
  setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
  setUploadingCardIndex(null)
      
      // Update local deckDetails state with server response
      setDeckDetails(prev => {
        if (!prev) return prev
        const cards = Array.isArray(prev.cards) ? [...prev.cards] : []
        // match by name (case-insensitive)
        const idx = cards.findIndex(c => (c.name || '').toLowerCase() === (cardName || '').toLowerCase())
        if (idx !== -1) {
          // Clean up the preview URL and use server URL
          if (cards[idx].image && cards[idx].image.startsWith('blob:')) {
            URL.revokeObjectURL(cards[idx].image)
          }
          cards[idx] = { ...cards[idx], image: cardImageUrl || updated.image, uploading: false }
        } else {
          cards.push({...updated, uploading: false})
        }
        return { ...prev, cards }
      })
      return updated
    } catch (err) {
      console.error('Upload error', err)
      setUploadingCardIndex(null)
      
      // Remove preview on error
      setDeckDetails(prev => {
        if (!prev) return prev
        const cards = Array.isArray(prev.cards) ? [...prev.cards] : []
        const idx = cards.findIndex(c => (c.name || '').toLowerCase() === (cardName || '').toLowerCase())
        if (idx !== -1 && cards[idx].uploading) {
          if (cards[idx].image && cards[idx].image.startsWith('blob:')) {
            URL.revokeObjectURL(cards[idx].image)
          }
          cards[idx] = { ...cards[idx], image: '', uploading: false }
        }
        return { ...prev, cards }
      })
      
      setToast({ message: 'Failed to upload image', type: 'error' })
      setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
      return null
    }
  }

  const handleCameraCapture = async (dataUrl) => {
    if (!currentCardForCamera) return
    
    try {
      // Show the captured image immediately
      setDeckDetails(prev => {
        if (!prev) return prev
        const cards = Array.isArray(prev.cards) ? [...prev.cards] : []
        const cardIdx = cards.findIndex(c => (c.name || '').toLowerCase() === (currentCardForCamera || '').toLowerCase())
        if (cardIdx !== -1) {
          cards[cardIdx] = { ...cards[cardIdx], image: dataUrl, uploading: true }
        } else {
          cards.push({ name: currentCardForCamera, image: dataUrl, uploading: true })
        }
        return { ...prev, cards }
      })

      // Convert data URL to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      
      // Create a file from the blob
      const file = new File([blob], 'camera-capture.png', { type: 'image/png' })
      
      // Upload the captured image
      await uploadCardImage(currentCardForCamera, file)
      
      // Clear the current card state
      setCurrentCardForCamera(null)
      setToast({ message: 'Image captured and uploaded!', type: 'success' })
      setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
    } catch (err) {
      console.error('Camera capture upload error', err)
      setCurrentCardForCamera(null)
      
      // Remove the preview on error
      setDeckDetails(prev => {
        if (!prev) return prev
        const cards = Array.isArray(prev.cards) ? [...prev.cards] : []
        const cardIdx = cards.findIndex(c => (c.name || '').toLowerCase() === (currentCardForCamera || '').toLowerCase())
        if (cardIdx !== -1 && cards[cardIdx].uploading) {
          cards[cardIdx] = { ...cards[cardIdx], image: '', uploading: false }
        }
        return { ...prev, cards }
      })
      
      setToast({ message: 'Failed to upload captured image', type: 'error' })
      setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
    }
  }

  const uploadDeckImage = async (file) => {
    if (!selectedDeck || !file) return null
    
    try {
      setUploadingDeckImage(true)
      
      // Handle HEIC conversion if needed
      let processedFile = file
      let previewUrl = null
      
      try {
        const { ensurePreviewableImage } = await import('../../lib/heicConverter')
        const { file: maybeFile, previewUrl: maybePreviewUrl } = await ensurePreviewableImage(file)
        processedFile = maybeFile
        previewUrl = maybePreviewUrl
      } catch (heicError) {
        console.warn('HEIC conversion failed, using original file:', heicError)
        previewUrl = URL.createObjectURL(file)
      }
      
      const apiBase = getApiBase()
      const fd = new FormData()
      fd.append('deckImage', processedFile)

      // Use the preview URL from HEIC conversion or create new one
      if (!previewUrl) {
        previewUrl = URL.createObjectURL(processedFile)
      }

      // Update deck image in decks list immediately
      setDecks(prev => prev.map(deck => 
        deck._id === selectedDeck 
          ? { ...deck, image: previewUrl, uploading: true }
          : deck
      ))

      // Also update deckDetails if it's the current deck
      if (deckDetails && deckDetails._id === selectedDeck) {
        setDeckDetails(prev => ({ ...prev, image: previewUrl, uploading: true }))
      }

      // Add deckId to formData for Server Action
      fd.append('deckId', selectedDeck)
      
      const result = await uploadDeckBlobAction(fd)
      
      if (!result.success) {
        throw new Error(`Upload failed: ${result.error}`)
      }
      
      const updated = result
      
      // Handle Vercel Blob response format using utility
      const imageUrl = extractBlobUrl(updated)
      
      setToast({ message: 'Deck image uploaded to Vercel Blob', type: 'success' })
      setTimeout(() => setToast({ message: '', type: 'info' }), 2500)

      // Update with server response
      setDecks(prev => prev.map(deck => {
        if (deck._id === selectedDeck) {
          // Clean up preview URL
          if (deck.image && deck.image.startsWith('blob:')) {
            URL.revokeObjectURL(deck.image)
          }
          return { ...deck, image: imageUrl || updated.deck?.image, uploading: false }
        }
        return deck
      }))

      if (deckDetails && deckDetails._id === selectedDeck) {
        setDeckDetails(prev => ({ ...prev, image: imageUrl || updated.deck?.image, uploading: false }))
      }

      return updated
    } catch (err) {
      console.error('Deck image upload error', err)
      
      // Remove preview on error
      setDecks(prev => prev.map(deck => {
        if (deck._id === selectedDeck && deck.uploading) {
          if (deck.image && deck.image.startsWith('blob:')) {
            URL.revokeObjectURL(deck.image)
          }
          return { ...deck, image: '', uploading: false }
        }
        return deck
      }))

      if (deckDetails && deckDetails._id === selectedDeck) {
        setDeckDetails(prev => ({ ...prev, image: '', uploading: false }))
      }

      setToast({ message: 'Failed to upload deck image', type: 'error' })
      setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
      return null
    } finally {
      setUploadingDeckImage(false)
    }
  }

  const handleDeckCameraCapture = async (dataUrl) => {
    try {
      // Show the captured image immediately
      setDecks(prev => prev.map(deck => 
        deck._id === selectedDeck 
          ? { ...deck, image: dataUrl, uploading: true }
          : deck
      ))

      if (deckDetails && deckDetails._id === selectedDeck) {
        setDeckDetails(prev => ({ ...prev, image: dataUrl, uploading: true }))
      }

      // Convert data URL to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      
      // Create a file from the blob
      const file = new File([blob], 'deck-cover.png', { type: 'image/png' })
      
      // Upload the captured image
      await uploadDeckImage(file)
      
      setToast({ message: 'Deck image captured and uploaded!', type: 'success' })
      setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
    } catch (err) {
      console.error('Deck camera capture upload error', err)
      setToast({ message: 'Failed to upload captured deck image', type: 'error' })
      setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
    }
  }

  // Card editing functions
  const uploadCardImageEdit = async (cardName, file) => {
    const cardIndex = deckDetails.cards.findIndex(c => c.name === cardName)
    if (cardIndex === -1) return

    try {
      setUploadingCardIndex(cardIndex)
      
      // Show preview immediately
      const previewUrl = URL.createObjectURL(file)
      setDeckDetails(prev => {
        const cards = [...prev.cards]
        cards[cardIndex] = { ...cards[cardIndex], image: previewUrl, uploading: true }
        return { ...prev, cards }
      })

      const formData = new FormData()
      formData.append('image', file)
      formData.append('cardName', cardName)
      formData.append('deckId', selectedDeck)

      const result = await uploadCardBlobAction(formData)

      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      const updated = result.data

      // Update with server response
      setDeckDetails(prev => {
        const cards = [...prev.cards]
        // Clean up preview URL
        if (cards[cardIndex].image && cards[cardIndex].image.startsWith('blob:')) {
          URL.revokeObjectURL(cards[cardIndex].image)
        }
        cards[cardIndex] = { ...cards[cardIndex], ...updated, uploading: false }
        return { ...prev, cards }
      })

      setToast({ message: 'Card image updated successfully!', type: 'success' })
      setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
      
      // Close edit modal
      setShowCardEditModal(false)
      setEditingCard(null)

    } catch (err) {
      console.error('Card image edit upload error', err)
      
      // Clear uploading state on error
      setDeckDetails(prev => {
        const cards = [...prev.cards]
        if (cards[cardIndex]) {
          // Clean up preview URL if it exists
          if (cards[cardIndex].image && cards[cardIndex].image.startsWith('blob:')) {
            URL.revokeObjectURL(cards[cardIndex].image)
          }
          cards[cardIndex] = { ...cards[cardIndex], uploading: false }
        }
        return { ...prev, cards }
      })
      
      setToast({ message: 'Failed to update card image', type: 'error' })
      setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
    } finally {
      setUploadingCardIndex(null)
    }
  }

  const handleCardCameraEdit = async (dataUrl) => {
    if (!editingCard) return

    try {
      const cardIndex = deckDetails.cards.findIndex(c => c.name === editingCard)
      if (cardIndex === -1) return

      setUploadingCardIndex(cardIndex)

      // Show preview immediately
      setDeckDetails(prev => {
        const cards = [...prev.cards]
        cards[cardIndex] = { ...cards[cardIndex], image: dataUrl, uploading: true }
        return { ...prev, cards }
      })

      // Convert data URL to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      
      // Create a file from the blob
      const file = new File([blob], `${editingCard}.png`, { type: 'image/png' })
      
      // Upload the captured image
      await uploadCardImageEdit(editingCard, file)
      
    } catch (err) {
      console.error('Card camera edit error', err)
      
      // Clear uploading state on error
      const cardIndex = deckDetails.cards.findIndex(c => c.name === editingCard)
      if (cardIndex !== -1) {
        setDeckDetails(prev => {
          const cards = [...prev.cards]
          if (cards[cardIndex]) {
            cards[cardIndex] = { ...cards[cardIndex], uploading: false }
          }
          return { ...prev, cards }
        })
        setUploadingCardIndex(null)
      }
      
      setToast({ message: 'Failed to update card image', type: 'error' })
      setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
    }
  }

  const openCardEditModal = (cardName) => {
    // Prevent editing Rider-Waite deck cards
    if (isRiderWaiteDeck(deckDetails)) {
      setToast({ message: 'Rider-Waite Tarot cards cannot be edited', type: 'error' })
      setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
      return
    }
    
    setEditingCard(cardName)
    setShowCardEditModal(true)
  }

  // Helper function to clear all uploading states (for debugging stuck states)
  const clearAllUploadingStates = () => {
    setUploadingCardIndex(null)
    setUploadingDeckImage(false)
    setDeckDetails(prev => {
      if (!prev || !prev.cards) return prev
      const cards = prev.cards.map(card => ({ ...card, uploading: false }))
      return { ...prev, cards, uploading: false }
    })
  }

  const handleNewDeck = async () => {
    setNewDeckName('')
    setNewDeckDescription('')
    setShowNewDeckModal(true)
  }

  const createDeck = async () => {
    const name = (newDeckName || '').trim()
    if (!name) return
    setCreatingDeck(true)
    try {
      const formData = new FormData()
      formData.append('deckName', name)
      formData.append('description', newDeckDescription || '')
      
      const result = await createDeckAction(formData)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create deck')
      }
      
      const created = result.data
      setDecks(prev => [created, ...prev])
      setSelectedDeck(created._id)
      setShowNewDeckModal(false)
    } catch (err) {
      console.error(err)
      if (err.message && err.message.includes('401')) {
        alert('Unauthorized: please sign in and try again')
        window.location.href = '/auth'
      } else {
        alert('Could not create deck')
      }
    } finally {
      setCreatingDeck(false)
    }
  }

  return (
    <AuthWrapper>
      <div className="reading text-center my-4">
        <h2>Decks</h2>
      </div>

      <div className="row justify-content-center mb-4">
        <div className="col-md-6">
          <div className="d-flex align-items-center gap-3">
            <div style={{ minWidth: 120 }}>
              <label className="form-label mb-0 deck-select-label">Choose Deck</label>
            </div>

            <div style={{ flex: '1 1 auto' }}>
              <select
                className="form-select deck-select-input"
                value={selectedDeck}
                onChange={(e) => handleSelectDeck(e.target.value)}
              >
                {decks.length === 0 ? (
                  <option disabled>{'Loading decks...'}</option>
                ) : (
                  decks.map(d => (
                    <option key={d._id} value={d._id}>{d.deckName}</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <button className="btn btn-tarot-primary btn-new-deck" onClick={handleNewDeck}>
                New Deck
              </button>
            </div>
          </div>
        </div>
      </div>
      <DeckModal
        show={showNewDeckModal}
        onClose={() => setShowNewDeckModal(false)}
        onSave={createDeck}
        loading={creatingDeck}
        name={newDeckName}
        description={newDeckDescription}
        onNameChange={setNewDeckName}
        onDescriptionChange={setNewDeckDescription}
      />
      
      {/* Deck Edit Modal */}
      {showDeckEditModal && (
        <div className="modal show d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-md" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Deck Image</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  aria-label="Close" 
                  onClick={() => setShowDeckEditModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="text-center mb-3">
                  <div className="deck-image-preview mb-3" style={{ 
                    width: '200px', 
                    height: '280px', 
                    margin: '0 auto', 
                    border: '2px dashed #ccc', 
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8f9fa',
                    position: 'relative'
                  }}>
                    {deckDetails && deckDetails.image ? (
                      <>
                        {console.log('Frontend: Rendering deck image with src:', deckDetails.image)}
                        <SmartImageV2
                          src={deckDetails.image}
                          alt="Deck cover"
                          width={200}
                          height={280}
                          style={{ opacity: uploadingDeckImage ? 0.7 : 1 }}
                          imageType={IMAGE_TYPES.DECK}
                          imageContext={{ deckId: selectedDeck }}
                          enableTransform={false}
                        />
                        {uploadingDeckImage && (
                          <div style={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            bottom: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            backgroundColor: 'rgba(255, 255, 255, 0.8)' 
                          }}>
                            <span className="spinner-border text-primary"></span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-muted">
                        <div>📚</div>
                        <small>No deck image</small>
                      </div>
                    )}
                  </div>
                  
                  <div className="d-flex justify-content-center gap-2">
                    <button 
                      type="button" 
                      className="btn btn-outline-primary"
                      onClick={() => document.getElementById('deck-file-input')?.click()}
                      disabled={uploadingDeckImage}
                    >
                      📁 Upload File
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-primary"
                      onClick={() => {
                        setShowDeckEditModal(false)
                        setShowCameraModal(true)
                      }}
                      disabled={uploadingDeckImage}
                    >
                      📷 Camera
                    </button>
                  </div>
                  
                  <input 
                    id="deck-file-input"
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0]
                      if (!file) return
                      await uploadDeckImage(file)
                      e.target.value = ''
                      setShowDeckEditModal(false)
                    }} 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeckEditModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Edit Modal */}
      {showCardEditModal && editingCard && (
        <div className="modal show d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-md" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Card Image: {editingCard}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  aria-label="Close" 
                  onClick={() => {
                    setShowCardEditModal(false)
                    setEditingCard(null)
                    // Clear any stuck uploading states
                    clearAllUploadingStates()
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="text-center mb-3">
                  <div className="card-image-preview mb-3" style={{ 
                    width: '150px', 
                    height: '210px', 
                    margin: '0 auto', 
                    border: '2px dashed #dee2e6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {(() => {
                      const card = deckDetails?.cards?.find(c => c.name === editingCard)
                      const hasImage = card && card.image
                      const isUploading = card && card.uploading
                      const imgSrc = hasImage ? card.image : null
                      return hasImage ? (
                        <>
                              <SmartImageV2
                                src={imgSrc}
                                alt={editingCard}
                                width={150}
                                height={210}
                                style={{ opacity: isUploading ? 0.7 : 1 }}
                                imageType={IMAGE_TYPES.CARD}
                                imageContext={{ 
                                  cardName: editingCard,
                                  deck: selectedDeck
                                }}
                                enableTransform={false}
                              />
                          {isUploading && (
                            <div style={{ 
                              position: 'absolute', 
                              top: 0, 
                              left: 0, 
                              right: 0, 
                              bottom: 0, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              backgroundColor: 'rgba(255, 255, 255, 0.8)' 
                            }}>
                              <span className="spinner-border text-primary"></span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-muted">
                          <div style={{ fontSize: '2rem' }}>🃏</div>
                          <small>No image</small>
                        </div>
                      )
                    })()}
                  </div>
                  
                  <div className="d-flex gap-2 justify-content-center">
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={() => document.getElementById('card-edit-upload')?.click()}
                      disabled={uploadingDeckImage}
                    >
                      📁 Upload File
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setCurrentCardForCamera(editingCard)
                        setShowCameraModal(true)
                      }}
                      disabled={uploadingDeckImage}
                    >
                      📷 Camera
                    </button>
                  </div>
                  
                  <input 
                    id="card-edit-upload"
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0]
                      if (!file || !editingCard) return
                      await uploadCardImageEdit(editingCard, file)
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowCardEditModal(false)
                    setEditingCard(null)
                    // Clear any stuck uploading states
                    clearAllUploadingStates()
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Deck card grid */}
        <div className="row justify-content-center">
          <div className="col-12 col-md-10">
            {/* Deck Image Section */}
            {selectedDeck && deckDetails && (
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-body">
                      <div className="row align-items-center">
                        <div className="col-auto">
                          <div style={{ 
                            width: '120px', 
                            height: '168px', 
                            border: '2px dashed #ccc', 
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f8f9fa',
                            position: 'relative'
                          }}>
                            {deckDetails.image ? (
                              <>
                                <SmartImageV2
                                  src={deckDetails.image}
                                  alt="Deck cover"
                                  width={120}
                                  height={168}
                                  style={{ borderRadius: '6px', opacity: (deckDetails.uploading || uploadingDeckImage) ? 0.7 : 1 }}
                                  imageType={IMAGE_TYPES.DECK}
                                  imageContext={{ deckId: selectedDeck }}
                                  enableTransform={false}
                                />
                                {(deckDetails.uploading || uploadingDeckImage) && (
                                  <div style={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    left: 0, 
                                    right: 0, 
                                    bottom: 0, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    borderRadius: '6px'
                                  }}>
                                    <span className="spinner-border text-primary"></span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-muted text-center">
                                <div style={{ fontSize: '2rem' }}>📚</div>
                                <small>No image</small>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h4 className="card-title mb-0">{deckDetails.deckName}</h4>
                            {!isRiderWaiteDeck(deckDetails) && (
                              <button 
                                className="btn btn-outline-primary btn-sm" 
                                onClick={() => setShowDeckEditModal(true)}
                                title="Edit deck image"
                              >
                                ✏️ Edit Image
                              </button>
                            )}
                          </div>
                          {deckDetails.description && (
                            <p className="card-text text-muted">{deckDetails.description}</p>
                          )}
                          <p className="card-text">
                            <small className="text-muted">
                              {deckDetails.cards?.length || 0} cards
                            </small>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cards Grid */}
            {loadingDeck ? (
              <div className="text-center">Loading deck...</div>
            ) : deckDetails && Array.isArray(deckDetails.cards) ? (
              <div className="row g-3">
                {deckDetails.cards.map((card, i) => {
                  const hasImage = card && card.image
                  const inputId = `card-upload-${i}`
                  const isUploading = uploadingCardIndex === i || (card && card.uploading)
                  const imgSrc = hasImage ? card.image : null
                  return (
                    <div className="col-6 col-sm-4 col-md-3" key={(card && card.name) || i}>
                      <div className="card p-2 h-100">
                        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#f8f9fa', position: 'relative' }}>
                          {hasImage ? (
                            <>
                              <SmartImageV2
                                src={imgSrc}
                                alt={card.name || 'card'}
                                width={220}
                                height={160}
                                style={{ objectFit: 'cover', opacity: isUploading ? 0.7 : 1 }}
                                imageType={IMAGE_TYPES.CARD}
                                imageContext={{ 
                                  cardName: card.name,
                                  deck: selectedDeck
                                }}
                                enableTransform={false}
                              />
                            {/* Edit button overlay - only for non-Rider-Waite decks */}
                            {!isRiderWaiteDeck(deckDetails) && (
                              <button 
                                type="button" 
                                className="btn btn-outline-primary btn-sm" 
                                style={{ 
                                  position: 'absolute', 
                                  top: '8px', 
                                  right: '8px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.9)'
                                }}
                                onClick={() => openCardEditModal(card.name)}
                                title="Edit card image"
                              >
                                ✏️
                              </button>
                            )}
                            {isUploading && (
                              <div style={{ 
                                position: 'absolute', 
                                top: 0, 
                                left: 0, 
                                right: 0, 
                                bottom: 0, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                backgroundColor: 'rgba(255, 255, 255, 0.8)' 
                              }}>
                                <span className="spinner-border text-primary"></span>
                              </div>
                            )}
                            </>
                          ) : (
                            <div style={{ textAlign: 'center', width: '100%' }}>
                              <div className="d-flex flex-column gap-2">
                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => document.getElementById(inputId)?.click()}>
                                  {isUploading ? (<span className="spinner-border spinner-border-sm"></span>) : 'Upload File'}
                                </button>
                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => {
                                  setCurrentCardForCamera(card.name || `card-${i}`)
                                  setShowCameraModal(true)
                                }} title="Take photo with camera">
                                  📷 Camera
                                </button>
                              </div>
                              <input id={inputId} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                const file = e.target.files && e.target.files[0]
                                if (!file) return
                                await uploadCardImage(card.name || `card-${i}`, file)
                                // reset input
                                e.target.value = ''
                              }} />
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-center small text-truncate" title={card && card.name}>
                          <div className="text-truncate">{card && card.name}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : selectedDeck ? (
              <div className="text-center">No cards found for this deck.</div>
            ) : null}
          </div>
        </div>
  {/* debug removed */}
      
      <CameraModal 
        show={showCameraModal} 
        onClose={() => {
          setShowCameraModal(false)
          setCurrentCardForCamera(null)
        }} 
        onCaptured={(dataUrl) => {
          if (currentCardForCamera) {
            // Check if we're in edit mode
            if (showCardEditModal && editingCard === currentCardForCamera) {
              handleCardCameraEdit(dataUrl)
            } else {
              // Regular card upload
              handleCameraCapture(dataUrl)
            }
          } else {
            // This is for deck image
            handleDeckCameraCapture(dataUrl)
          }
        }}
        
      />
    </AuthWrapper>
  )
}
