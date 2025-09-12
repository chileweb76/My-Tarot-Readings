"use client"

import React, { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

export default function Card({
  className = '',
  style = {},
  deck = 'rider-waite',
  getCardImageUrl = null,
  title = '',
  deckData = null
}) {
  const [currentImage, setCurrentImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedSuit, setSelectedSuit] = useState('')
  const [selectedCard, setSelectedCard] = useState('')
  const [reversed, setReversed] = useState(false)
  const [interpretation, setInterpretation] = useState('')
  // Get suits from deckData if available, otherwise use default
  const availableSuits = deckData?.cards ? 
    [...new Set(deckData.cards.map(card => {
      // Extract suit from card name for minor arcana, or use "Major Arcana" for major arcana
      if (card.name?.includes(' of ')) {
        return card.name.split(' of ')[1]
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
          .filter(card => !card.name?.includes(' of '))
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

  useEffect(() => {
    if (selectedSuit && selectedCard) {
      fetchCardImage()
    } else if (title && deck) {
      // Try to fetch image using the title prop (for spread positions)
      fetchCardImageByTitle()
    } else {
      setCurrentImage(null)
    }
  }, [selectedSuit, selectedCard, deck, title])

  const fetchCardImageByTitle = async () => {
    setLoading(true)
    try {
      if (getCardImageUrl) {
        const imageUrl = getCardImageUrl(title)
        setCurrentImage(imageUrl)
      } else {
        // Only try to fetch image if title looks like an actual tarot card name
        const isActualCardName = isValidTarotCardName(title)
        if (isActualCardName) {
          if (deck === 'rider-waite' || deck?.toLowerCase().includes('rider-waite')) {
            // For Rider-Waite, use direct static paths
            const imageUrl = generateRiderWaiteStaticUrl(title)
            setCurrentImage(imageUrl)
          } else if (deckData && deckData.cards) {
            // For custom decks, look up the card image in deckData
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
          } else {
            console.log(`Fetching image for card: "${title}" from deck: "${deck}"`)
            try {
              const response = await apiFetch(`/api/card-image?name=${encodeURIComponent(title)}&deck=${encodeURIComponent(deck)}`)
              console.log('API response:', response)
              if (response.imageUrl) {
                setCurrentImage(response.imageUrl)
              } else {
                console.log('No image URL returned from API')
                setCurrentImage(null)
              }
            } catch (apiError) {
              console.error('API call failed:', apiError)
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
  }

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

  const fetchCardImage = async () => {
    setLoading(true)
    try {
      if (getCardImageUrl) {
        const imageUrl = getCardImageUrl(selectedSuit, selectedCard)
        setCurrentImage(imageUrl)
      } else {
        const cardName = selectedSuit.toLowerCase() === 'major arcana' 
          ? selectedCard 
          : `${selectedCard} of ${selectedSuit}`
        
        if (deck === 'rider-waite' || deck?.toLowerCase().includes('rider-waite')) {
          // For Rider-Waite, use direct static paths
          const imageUrl = generateRiderWaiteStaticUrl(cardName)
          setCurrentImage(imageUrl)
        } else if (deckData && deckData.cards) {
          // For custom decks, look up the card image in deckData
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
        } else {
          console.log(`Fetching image for card: "${cardName}" from deck: "${deck}"`)
          try {
            const response = await apiFetch(`/api/card-image?name=${encodeURIComponent(cardName)}&deck=${encodeURIComponent(deck)}`)
            console.log('API response:', response)
            if (response.imageUrl) {
              setCurrentImage(response.imageUrl)
            } else {
              console.log('No image URL returned from API')
              setCurrentImage(null)
            }
          } catch (apiError) {
            console.error('API call failed:', apiError)
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
  }

  return (
    <div className={`card ${className}`} style={style}>
      <div className="card-body">
        {/* Top section with title on left and image on right */}
        <div className="row mb-3">
          {/* Title - Top Left */}
          <div className="col-4">
            <h5 className="card-title mb-0">{title}</h5>
          </div>
          
          {/* Center Column - Suit, Card, Reversed */}
          <div className="col-4">
            {/* Suit Selection */}
            <div className="mb-2">
              <label className="form-label small">Suit</label>
              <select
                className="form-select form-select-sm"
                value={selectedSuit}
                onChange={(e) => {
                  setSelectedSuit(e.target.value)
                  setSelectedCard('') // Reset card when suit changes
                }}
              >
                <option value="">Select Suit</option>
                {availableSuits.map(suit => (
                  <option key={suit} value={suit}>{suit}</option>
                ))}
              </select>
            </div>

            {/* Card Selection */}
            <div className="mb-2">
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

            {/* Reversed Checkbox */}
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id={`reversed-${title}`}
                checked={reversed}
                onChange={(e) => setReversed(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor={`reversed-${title}`}>
                Reversed
              </label>
            </div>
          </div>

          {/* Card Image - Right Side */}
          <div className="col-4">
            {loading ? (
              <div className="text-center">
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : currentImage ? (
              <img 
                src={currentImage} 
                alt={selectedCard ? `${selectedCard} of ${selectedSuit}` : 'Card'}
                className="img-fluid"
                style={{ 
                  maxHeight: '200px', 
                  objectFit: 'contain',
                  transform: reversed ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.3s ease'
                }}
                onError={(e) => {
                  console.error('Image failed to load:', currentImage)
                  setCurrentImage(null)
                }}
              />
            ) : (
              <div 
                className="text-center p-3 border rounded d-flex flex-column justify-content-center align-items-center"
                style={{ 
                  backgroundColor: 'var(--tarot-primary)',
                  color: 'white',
                  minHeight: '150px',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                <i className="fas fa-magic mb-2" style={{ fontSize: '1.5rem', opacity: 0.8 }}></i>
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

        {/* Bottom section - Interpretation */}
        <div className="row">
          <div className="col-12">
            <label className="form-label">Interpretation</label>
            <textarea
              className="form-control"
              rows={4}
              placeholder="Your interpretation of this card..."
              value={interpretation}
              onChange={(e) => setInterpretation(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}