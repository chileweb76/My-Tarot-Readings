'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import AuthWrapper from '../../../../components/AuthWrapper'
import { apiFetch } from '../../../../lib/api'
import SmartImageV2 from '../../../../components/SmartImageV2'
import { IMAGE_TYPES } from '../../../../lib/imageService'
import { notify } from '../../../../lib/toast'

export default function EditReadingPage() {
  const params = useParams()
  const router = useRouter()
  const [reading, setReading] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [flashSave, setFlashSave] = useState(false)
  
  // Form fields
  const [question, setQuestion] = useState('')
  const [interpretation, setInterpretation] = useState('')
  const [outcome, setOutcome] = useState('')
  const [drawnCards, setDrawnCards] = useState([])

  useEffect(() => {
    const fetchReading = async () => {
      try {
        setLoading(true)
        const response = await apiFetch(`/api/readings/${params.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch reading')
        }
        
        const data = await response.json()
        const readingData = data.reading || data
        
        setReading(readingData)
        setQuestion(readingData.question || '')
        setInterpretation(readingData.interpretation || '')
        setOutcome(readingData.outcome || '')
        setDrawnCards(readingData.drawnCards || [])
        
      } catch (err) {
        console.error('Error fetching reading:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchReading()
    }
  }, [params.id])

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const updateData = {
        question,
        interpretation,
        outcome,
        drawnCards
      }
      
      const response = await apiFetch(`/api/readings/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to save reading')
      }
      // show toast and flash Save button briefly, then redirect
      try { notify({ type: 'success', text: 'Outcome saved.' }) } catch (e) {}
      setFlashSave(true)
      setTimeout(() => {
        setFlashSave(false)
        router.push('/reading')
      }, 700)
      
    } catch (err) {
      console.error('Error saving reading:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCardInterpretationChange = (cardIndex, newInterpretation) => {
    const updatedCards = [...drawnCards]
    updatedCards[cardIndex] = {
      ...updatedCards[cardIndex],
      interpretation: newInterpretation
    }
    setDrawnCards(updatedCards)
  }

  const handleExportPDF = async () => {
    try {
      // Format the reading data for PDF export
      const formattedReading = {
        by: 'User', // Could get from auth context if available
        date: new Date(reading.dateTime || reading.createdAt).toLocaleString(),
        querent: (reading.querent && typeof reading.querent === 'object') ? 
          reading.querent.name : 
          (reading.querentName || 'Self'),
        spread: (reading.spread && typeof reading.spread === 'object') ?
          (reading.spread.spread || reading.spread.title || reading.spread.name) :
          (reading.spreadName || 'Unknown spread'),
        deck: (reading.deck && typeof reading.deck === 'object') ? 
          (reading.deck.deckName || reading.deck.name) :
          (reading.deckName || 'Unknown deck'),
        question: question || '',
        cards: drawnCards.map(card => ({
          title: card.title || '',
          suit: card.suit || '',
          card: card.card || card.name || card.cardName || '',
          reversed: !!card.reversed,
          interpretation: card.interpretation || '',
          image: card.image || null
        })),
        interpretation: interpretation || '',
        outcome: outcome || '',
        image: reading.image || null,
        exportedAt: new Date().toLocaleString()
      }

      const response = await apiFetch('/export/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reading: formattedReading,
          fileName: `tarot-reading-${params.id}.pdf`
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to export PDF')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tarot-reading-${params.id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (err) {
      console.error('Error exporting PDF:', err)
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <AuthWrapper>
        <div className="d-flex justify-content-center mt-5">
          <div className="text-white">Loading reading...</div>
        </div>
      </AuthWrapper>
    )
  }

  if (error) {
    return (
      <AuthWrapper>
        <div className="d-flex justify-content-center mt-5">
          <div className="text-danger">Error: {error}</div>
        </div>
      </AuthWrapper>
    )
  }

  if (!reading) {
    return (
      <AuthWrapper>
        <div className="d-flex justify-content-center mt-5">
          <div className="text-white">Reading not found</div>
        </div>
      </AuthWrapper>
    )
  }

  return (
    <AuthWrapper>
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            
            {/* Header with actions */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 className="text-white">Add Outcome</h1>
              <div>
                <button 
                  className="btn btn-primary"
                  onClick={handleExportPDF}
                >
                  Export PDF
                </button>
              </div>
            </div>

            {/* Reading Info */}
            <div className="card mb-4">
              <div className="card-body">
                {reading.image && (
                  <div className="text-center mb-3">
                    <SmartImageV2 
                      src={reading.image} 
                      alt="Reading image" 
                      width={300} 
                      height={200} 
                      style={{ borderRadius: '6px', objectFit: 'contain' }}
                      imageType={IMAGE_TYPES.READING}
                      imageContext={{ readingId: reading._id }}
                    />
                  </div>
                )}
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>Date:</strong> {new Date(reading.dateTime || reading.createdAt).toLocaleString()}</p>
                    <p><strong>Deck:</strong> {
                      (reading.deck && typeof reading.deck === 'object') ? 
                        (reading.deck.deckName || reading.deck.name) :
                      reading.deckName || 'Unknown deck'
                    }</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Spread:</strong> {
                      (reading.spread && typeof reading.spread === 'object') ?
                        (reading.spread.spread || reading.spread.title || reading.spread.name) :
                      reading.spreadName || 'Unknown spread'
                    }</p>
                    {reading.selectedTags && reading.selectedTags.length > 0 && (
                      <p><strong>Tags:</strong> {
                        reading.selectedTags.map(tag => 
                          typeof tag === 'object' ? tag.name : tag
                        ).join(', ')
                      }</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Question */}
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">Question</h5>
                <div className="p-3 bg-light rounded">
                  {question || 'No question recorded'}
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">Cards</h5>
                {drawnCards && drawnCards.length > 0 ? (
                  <div className="row">
                    {drawnCards.map((card, index) => (
                      <div key={index} className="col-md-6 mb-3">
                        <div className="card">
                          <div className="card-body">
                            <h6 className="card-title">
                              {card.title && <span className="badge bg-secondary me-2">{card.title}</span>}
                              {card.suit && card.card ? `${card.suit} ${card.card}` : 
                               card.name || card.cardName || 'Unknown Card'}
                              {card.reversed && <span className="text-muted"> (Reversed)</span>}
                            </h6>
                            {card.image && (
                              <div className="mb-3">
                                <SmartImageV2 
                                  src={card.image} 
                                  alt={card.title || card.name || 'Card'} 
                                  width={120} 
                                  height={180} 
                                  style={{ borderRadius: '6px', objectFit: 'cover' }}
                                  imageType={IMAGE_TYPES.CARD}
                                  imageContext={{ 
                                    cardName: card.card || card.name || card.cardName,
                                    deck: reading.deck || reading.deckName
                                  }}
                                />
                              </div>
                            )}
                            <div className="mt-2">
                              <label className="form-label"><strong>Interpretation:</strong></label>
                              <div className="p-3 bg-light rounded">
                                {card.interpretation || 'No interpretation recorded'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No cards found for this reading.</p>
                )}
              </div>
            </div>

            {/* Overall Interpretation */}
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">Overall Interpretation</h5>
                <div className="p-3 bg-light rounded">
                  {interpretation || 'No interpretation recorded'}
                </div>
              </div>
            </div>

            {/* Outcome */}
            <div className="card mb-4">
              <div className="card-body">
                  <h5 className="card-title">Outcome</h5>
                  <div className="outcome-helper">Describe what actually happened</div>
                <div>
                  <textarea
                    className="form-control matching-height"
                    rows="5"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    placeholder="Enter the outcome of this reading..."
                  />
                </div>
                {/* Action buttons moved here so they appear below the Outcome textarea */}
                <div className="mt-3 d-flex justify-content-end gap-2">
                  <button 
                    className="btn btn-cancel-black"
                    onClick={() => router.push('/reading')}
                  >
                    Cancel
                  </button>
                  <button 
                    className={`btn btn-success ${flashSave ? 'btn-flash' : ''}`}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AuthWrapper>
  )
}