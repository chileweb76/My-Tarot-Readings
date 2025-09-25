"use client"

import React, { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { apiFetch } from '../lib/api'
import { getCardImageUrl as getCardImageUrlService, IMAGE_TYPES } from '../lib/imageService'
import ConfirmModal from './ConfirmModal'
import { notify } from '../lib/toast'

export default function Card({
  className = '',
  style = {},
  deck = 'rider-waite',
  getCardImageUrl = null,
  title = '',
  deckData = null,
  onChange = null,
  // initial values for prefilling cards when editing saved readings
  initialSelectedSuit = '',
  initialSelectedCard = '',
  initialReversed = false,
  initialInterpretation = '',
  initialImage = null
}) {
  const [currentImage, setCurrentImage] = useState(initialImage || null)
  const [loading, setLoading] = useState(false)
  const [selectedSuit, setSelectedSuit] = useState(initialSelectedSuit || '')
  const [selectedCard, setSelectedCard] = useState(initialSelectedCard || '')
  const [reversed, setReversed] = useState(!!initialReversed)
  const [interpretation, setInterpretation] = useState(initialInterpretation || '')
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  // Get suits from deckData if available, otherwise use default
  // Known Major Arcana names (normalized to lowercase) — some have the substring ' of ' (e.g. "Wheel of Fortune")
  const MAJOR_ARCANA = new Set([
    'the fool', 'the magician', 'the high priestess', 'the empress', 'the emperor',
    'the hierophant', 'the lovers', 'the chariot', 'strength', 'the hermit',
    'wheel of fortune', 'justice', 'the hanged man', 'death', 'temperance',
    'the devil', 'the tower', 'the star', 'the moon', 'the sun', 'judgement', 'the world'
  ])

  const availableSuits = deckData?.cards ? 
    [...new Set(deckData.cards.map(card => {
      // Extract suit from card name for minor arcana, or use "Major Arcana" for major arcana
      const name = (card.name || '').trim()
      if (name && name.toLowerCase && MAJOR_ARCANA.has(name.toLowerCase())) {
        return 'Major Arcana'
      }
      if (name.includes(' of ')) {
        return name.split(' of ')[1]
      } else {
        return 'Major Arcana'
      }
    }))] : 
    ['Major Arcana', 'Wands', 'Cups', 'Swords', 'Pentacles']

  // Card options based on selected suit and available deck data
  const cardOptions = selectedSuit ? (() => {
    if (deckData?.cards) {
      // Use cards from deck data
      if (selectedSuit.toLowerCase() === 'major arcana') {
        return deckData.cards
          .filter(card => {
            const name = (card.name || '').trim()
            // Include if it doesn't look like a ' of ' minor arcana card OR if it's a known Major Arcana name
            return !name.includes(' of ') || MAJOR_ARCANA.has(name.toLowerCase())
          })
          .map(card => card.name)
      } else {
        return deckData.cards
          .filter(card => card.name?.includes(` of ${selectedSuit}`))
          .map(card => card.name.split(' of ')[0])
      }
    } else {
      // Fallback to standard tarot structure
      if (selectedSuit.toLowerCase() === 'major arcana') {
        return [
          'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
          'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
          'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
          'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World'
        ]
      } else {
        return [
          'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
          'Page', 'Knight', 'Queen', 'King'
        ]
      }
    }
  })() : []

  // Wrap functions in useCallback to keep stable references for effects
  const fetchCardImage = useCallback(async () => {
    setLoading(true)
    try {
      if (getCardImageUrl) {
        const imageUrl = getCardImageUrl(selectedSuit, selectedCard)
        setCurrentImage(imageUrl)
      } else {
        const cardName = selectedSuit.toLowerCase() === 'major arcana' 
          ? selectedCard 
          : `${selectedCard} of ${selectedSuit}`
        
        if (deckData && deckData.cards) {
          // For any deck with card data (including Rider-Waite), use the deck data directly
          const card = deckData.cards.find(c => 
            (c.name || '').toLowerCase() === cardName.toLowerCase()
          )
          if (card && card.image) {
            console.log(`Found card image for "${cardName}":`, card.image)
            setCurrentImage(card.image)
          } else {
            console.log(`No image found for card "${cardName}" in deck data`)
            setCurrentImage(null)
          }
        } else if (deck === 'rider-waite' || deck?.toLowerCase().includes('rider-waite')) {
          // For Rider-Waite without deck data, use the image service which will check blob mapping first
          try {
            const imageUrl = await getCardImageUrlService(cardName, deck)
            if (imageUrl) {
              console.log('Got image URL from service:', imageUrl)
              setCurrentImage(imageUrl)
            } else {
              console.log('No image URL returned from service')
              setCurrentImage(null)
            }
          } catch (apiError) {
            console.error('Image service call failed:', apiError)
            setCurrentImage(null)
          }
        } else {
          console.log(`Fetching image for card: "${cardName}" from deck: "${deck}"`)
          try {
            // Use the new image service for backend API calls
            const imageUrl = await getCardImageUrlService(cardName, deck)
            if (imageUrl) {
              console.log('Got image URL from service:', imageUrl)
              setCurrentImage(imageUrl)
            } else {
              console.log('No image URL returned from service')
              setCurrentImage(null)
            }
          } catch (apiError) {
            console.error('Image service call failed:', apiError)
            setCurrentImage(null)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching card image:', error)
      setCurrentImage(null)
    } finally {
      setLoading(false)
    }
  }, [getCardImageUrl, selectedSuit, selectedCard, deck, deckData])

  const fetchCardImageByTitle = useCallback(async () => {
    setLoading(true)
    try {
      if (getCardImageUrl) {
        const imageUrl = getCardImageUrl(title)
        setCurrentImage(imageUrl)
      } else {
        // Only try to fetch image if title looks like an actual tarot card name
        const isActualCardName = isValidTarotCardName(title)
        if (isActualCardName) {
          if (deckData && deckData.cards) {
            // For any deck with card data (including Rider-Waite), use the deck data directly
            const card = deckData.cards.find(c => 
              (c.name || '').toLowerCase() === title.toLowerCase()
            )
            if (card && card.image) {
              console.log(`Found card image for "${title}":`, card.image)
              setCurrentImage(card.image)
            } else {
              console.log(`No image found for card "${title}" in deck data`)
              setCurrentImage(null)
            }
          } else if (deck === 'rider-waite' || deck?.toLowerCase().includes('rider-waite')) {
            // For Rider-Waite without deck data, use the image service which will check blob mapping first
            try {
              const imageUrl = await getCardImageUrlService(title, deck)
              if (imageUrl) {
                console.log('Got image URL from service:', imageUrl)
                setCurrentImage(imageUrl)
              } else {
                console.log('No image URL returned from service')
                setCurrentImage(null)
              }
            } catch (apiError) {
              console.error('Image service call failed:', apiError)
              setCurrentImage(null)
            }
          } else {
            console.log(`Fetching image for card: "${title}" from deck: "${deck}"`)
            try {
              // Use the new image service for backend API calls
              const imageUrl = await getCardImageUrlService(title, deck)
              if (imageUrl) {
                console.log('Got image URL from service:', imageUrl)
                setCurrentImage(imageUrl)
              } else {
                console.log('No image URL returned from service')
                setCurrentImage(null)
              }
            } catch (apiError) {
              console.error('Image service call failed:', apiError)
              setCurrentImage(null)
            }
          }
        } else {
          // Title is likely a spread position, don't try to fetch image
          setCurrentImage(null)
        }
      }
    } catch (error) {
      console.error('Error fetching card image by title:', error)
      setCurrentImage(null)
    } finally {
      setLoading(false)
    }
  }, [getCardImageUrl, title, deck, deckData])

  useEffect(() => {
    if (selectedSuit && selectedCard) {
      fetchCardImage()
    } else if (title && deck) {
      // Try to fetch image using the title prop (for spread positions)
      fetchCardImageByTitle()
    } else {
      setCurrentImage(null)
    }
  }, [selectedSuit, selectedCard, deck, title, fetchCardImage, fetchCardImageByTitle])

  // Notify parent of current card state when relevant values change
  const onChangeRef = React.useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  useEffect(() => {
    try {
      const fn = onChangeRef.current
      if (typeof fn === 'function') {
        fn({
          title,
          selectedSuit,
          selectedCard,
          reversed,
          interpretation,
          image: currentImage
        })
      }
    } catch (e) {
      // ignore
    }
    // Intentionally exclude onChange from deps to avoid infinite loops when parent
    // provides a new function reference each render; we sync the ref above.
  }, [title, selectedSuit, selectedCard, reversed, interpretation, currentImage])


  // Helper function to check if a title is likely a tarot card name
  const isValidTarotCardName = (name) => {
    if (!name) return false
    
    const majorArcana = [
      'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
      'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
      'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
      'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World'
    ]
    
    // Check if it's a major arcana card
    if (majorArcana.some(card => card.toLowerCase() === name.toLowerCase())) {
      return true
    }
    
    // Check if it's a minor arcana pattern (e.g., "Two of Cups", "King of Wands")
    const minorArcanaPattern = /^(Ace|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Page|Knight|Queen|King)\s+of\s+(Wands|Cups|Swords|Pentacles)$/i
    if (minorArcanaPattern.test(name)) {
      return true
    }
    
    return false
  }

  // Helper function to generate static Rider-Waite image URLs
  const generateRiderWaiteStaticUrl = (cardName) => {
    if (!cardName) return null
    
    // Major Arcana cards
    const majorArcana = [
      'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
      'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
      'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
      'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World'
    ]
    
    // Check if it's a Major Arcana card
    const isMajorArcana = majorArcana.some(major => 
      major.toLowerCase() === cardName.toLowerCase()
    )
    
    if (isMajorArcana) {
      // For Major Arcana: major_arcana_<name>.png
      let fileName = cardName.toLowerCase()
        .replace(/^the\s+/i, '') // Remove "The" prefix first
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
      
      // Handle special cases based on actual filenames
      if (fileName === 'wheel_of_fortune') fileName = 'fortune'
      if (fileName === 'hanged_man') fileName = 'hanged'
      if (fileName === 'high_priestess') fileName = 'priestess'
      
      return `/images/rider-waite-tarot/major_arcana_${fileName}.png`
    } else if (cardName.includes(' of ')) {
      // Minor Arcana cards
      const parts = cardName.split(' of ')
      if (parts.length === 2) {
        const cardPart = parts[0].toLowerCase()
        let suitPart = parts[1].toLowerCase()
        
        // Normalize suit names
        if (suitPart.includes('wand')) suitPart = 'wands'
        else if (suitPart.includes('cup')) suitPart = 'cups'
        else if (suitPart.includes('sword')) suitPart = 'swords'
        else if (suitPart.includes('pentacle') || suitPart.includes('coin')) suitPart = 'pentacles'
        
        // Handle number cards and face cards
        const cardMappings = {
          'ace': 'ace',
          'one': 'ace',
          'two': '2',
          'three': '3', 
          'four': '4',
          'five': '5',
          'six': '6', 
          'seven': '7',
          'eight': '8',
          'nine': '9',
          'ten': '10',
          'page': 'page',
          'knight': 'knight', 
          'queen': 'queen',
          'king': 'king'
        }
        
        const cardFileName = cardMappings[cardPart] || cardPart
        return `/images/rider-waite-tarot/minor_arcana_${suitPart}_${cardFileName}.png`
      }
    }
    
    // For spread position names or unknown cards, return null
    return null
  }



  return (
  <div className={`card card-with-image ${className}`} style={style}>
      <ConfirmModal
        show={showSaveConfirm}
        title="Image not uploaded"
  body={"This image appears to be a local preview and is not available to the server. Please save the reading to upload the image before sharing."}
        confirmText="Scroll to Save"
        onConfirm={() => {
          setShowSaveConfirm(false)
          try {
            window.scrollTo({ top: 0, behavior: 'smooth' })
            const saveBtn = document.querySelector('button[type="submit"], button.btn-tarot-primary')
            if (saveBtn && typeof saveBtn.focus === 'function') saveBtn.focus()
            notify({ type: 'info', text: 'Please save the reading to upload the image before sharing.' })
          } catch (e) { console.warn(e) }
        }}
        onCancel={() => { setShowSaveConfirm(false) }}
      />
      <div className="card-body">
        {/* Top section: left = title + controls + interpretation, right = image */}
        <div className="row mb-3 align-items-stretch">
          <div className="col-lg-8 card-left">
            <h5 className="card-title mb-3">{title}</h5>

            <div className="row">
              <div className="col-12 col-md-6 mb-2">
                <label className="form-label small">Suit</label>
                <select
                  className="form-select form-select-sm"
                  value={selectedSuit}
                  onChange={(e) => {
                    setSelectedSuit(e.target.value)
                    setSelectedCard('')
                  }}
                >
                  <option value="">Select Suit</option>
                  {availableSuits.map(suit => (
                    <option key={suit} value={suit}>{suit}</option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-6 mb-2">
                <label className="form-label small">Card</label>
                <select
                  className="form-select form-select-sm"
                  value={selectedCard}
                  onChange={(e) => setSelectedCard(e.target.value)}
                  disabled={!selectedSuit}
                >
                  <option value="">Select Card</option>
                  {cardOptions.map(card => (
                    <option key={card} value={card}>{card}</option>
                  ))}
                </select>
              </div>

              <div className="col-auto align-self-center mb-2">
                <div className="form-check d-inline-flex align-items-center">
                  <input
                    className="form-check-input reversed-checkbox-input"
                    type="checkbox"
                    id={`reversed-${title}`}
                    checked={reversed}
                    onChange={(e) => setReversed(e.target.checked)}
                  />
                  <label className="form-check-label small mb-0" htmlFor={`reversed-${title}`}>
                    Reversed
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-3 interpretation-fill">
              <label className="form-label">Interpretation</label>
              <textarea
                className="form-control h-100"
                placeholder="Your interpretation of this card..."
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
              />
            </div>
          </div>

          <div className="col-lg-4 d-flex h-100">
            {loading ? (
              <div className="card-image-spinner">
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : currentImage ? (
              <div className="card-image-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Image
                  src={currentImage}
                  alt={selectedCard ? `${selectedCard} of ${selectedSuit}` : 'Card'}
                  className={`card-image ${reversed ? 'reversed' : ''}`}
                  onError={() => {
                    console.error('Image failed to load:', currentImage)
                    setCurrentImage(null)
                  }}
                  onLoadingComplete={() => { /* no-op, kept for parity with previous loader */ }}
                  width={220}
                  height={320}
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
                <div className="mt-2 d-flex justify-content-center">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={async () => {
                      try {
                        // If the image is a blob/object/data URL or otherwise not an absolute URL,
                        // warn the user to save the reading (so the image is uploaded) before sharing.
                        const img = currentImage
                        const looksLocal = typeof img === 'string' && img.length && !/^https?:\/\//i.test(img) && !img.startsWith('/')
                        if (looksLocal) {
                          // Show in-app confirm modal prompting user to save so image uploads
                          setShowSaveConfirm(true)
                          return
                        }

                        // Build a minimal reading payload for this single card
                        const readingPayload = {
                          by: 'Guest',
                          date: new Date().toLocaleString(),
                          querent: title || 'Card',
                          spread: 'Single card',
                          deck: deck || 'Unknown',
                          question: '',
                          cards: [{ title: title || '', suit: selectedSuit || '', card: selectedCard || '', reversed: reversed, interpretation: interpretation || '', image: currentImage }],
                          interpretation: interpretation || '',
                          image: currentImage || null,
                          exportedAt: new Date().toLocaleString()
                        }
                        const res = await apiFetch('/export/pdf', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ reading: readingPayload, fileName: `tarot-card-${(selectedCard||title||'card').replace(/\s+/g,'-').toLowerCase()}.pdf` })
                        })
                        if (!res.ok) {
                          const text = await res.text().catch(() => '')
                          console.error('Server PDF failed', res.status, res.statusText, text)
                          notify({ type: 'error', text: 'Failed to generate PDF for sharing.' })
                          return
                        }
                        const blob = await res.blob()
                        const filename = `tarot-card-${(selectedCard||title||'card').replace(/\s+/g,'-').toLowerCase()}.pdf`
                        try {
                          const file = new File([blob], filename, { type: 'application/pdf' })
                          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({ files: [file], title: 'Tarot Card', text: `Sharing ${title}` })
                            return
                          }
                        } catch (e) {
                          // fall back to download
                        }
                        const url = URL.createObjectURL(blob)
                        const link = document.createElement('a')
                        link.href = url
                        link.download = filename
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        URL.revokeObjectURL(url)
                      } catch (e) {
                        console.error('Share card as PDF failed', e)
                        notify({ type: 'error', text: 'Failed to share or download PDF for this card.' })
                      }
                    }}
                  >
                    Share as PDF
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="text-center p-3 border rounded d-flex flex-column justify-content-center align-items-center w-100 card-image-fallback"
              >
                <div className="mb-2" style={{ fontSize: '1.5rem', opacity: 0.8 }}>✨</div>
                <div className="text-center">
                  {selectedCard && selectedSuit ? (
                    `${selectedCard}${selectedSuit.toLowerCase() !== 'major arcana' ? ` of ${selectedSuit}` : ''}`
                  ) : title ? (
                    title
                  ) : (
                    'Select a card'
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom interpretation removed — interpretation is inside the left column */}
      </div>
    </div>
  )
}