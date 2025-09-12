"use client"

import { useEffect, useState } from 'react'
import AuthWrapper from '../components/AuthWrapper'
import { apiFetch } from '../lib/api'

export default function ReadingHistoryPage() {
  const [readings, setReadings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingReading, setEditingReading] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    loadReadings()
  }, [])

  const loadReadings = async () => {
    try {
      setLoading(true)
      const res = await apiFetch('/api/readings/user')
      if (!res.ok) {
        throw new Error('Failed to load readings')
      }
      const data = await res.json()
      setReadings(data.readings || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReading = async (readingId) => {
    if (!confirm('Are you sure you want to delete this reading?')) {
      return
    }

    try {
      const res = await apiFetch(`/api/readings/${readingId}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        throw new Error('Failed to delete reading')
      }
      setReadings(prev => prev.filter(r => r._id !== readingId))
    } catch (err) {
      alert('Error deleting reading: ' + err.message)
    }
  }

  const handleEditReading = (reading) => {
    setEditingReading(reading)
    setShowEditModal(true)
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString()
  }

  if (loading) {
    return (
      <AuthWrapper>
        <div className="container mt-4">
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading reading history...</p>
          </div>
        </div>
      </AuthWrapper>
    )
  }

  if (error) {
    return (
      <AuthWrapper>
        <div className="container mt-4">
          <div className="alert alert-danger" role="alert">
            Error loading readings: {error}
          </div>
        </div>
      </AuthWrapper>
    )
  }

  return (
    <AuthWrapper>
      <div className="container mt-4">
        <h1>Reading History</h1>
        
        {readings.length === 0 ? (
          <div className="text-center mt-5">
            <h3 className="text-muted">No readings found</h3>
            <p>You haven't saved any readings yet.</p>
            <a href="/" className="btn btn-tarot-primary">Create a Reading</a>
          </div>
        ) : (
          <div className="row">
            {readings.map(reading => (
              <div key={reading._id} className="col-12 col-md-6 col-lg-4 mb-4">
                <div className="card h-100">
                  <div className="card-header d-flex justify-content-between align-items-start">
                    <h6 className="mb-0">{formatDate(reading.dateTime)}</h6>
                    <div className="dropdown">
                      <button 
                        className="btn btn-sm btn-outline-secondary dropdown-toggle" 
                        type="button" 
                        data-bs-toggle="dropdown"
                      >
                        Actions
                      </button>
                      <ul className="dropdown-menu">
                        <li>
                          <button 
                            className="dropdown-item" 
                            onClick={() => handleEditReading(reading)}
                          >
                            Edit
                          </button>
                        </li>
                        <li>
                          <button 
                            className="dropdown-item text-danger" 
                            onClick={() => handleDeleteReading(reading._id)}
                          >
                            Delete
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="card-body">
                    <p className="card-text">
                      <strong>Question:</strong> {reading.question || 'No question'}
                    </p>
                    <p className="card-text">
                      <strong>Cards:</strong> {reading.drawnCards?.length || 0} cards
                    </p>
                    
                    {reading.drawnCards && reading.drawnCards.length > 0 && (
                      <div className="mb-2">
                        <small className="text-muted">Cards drawn:</small>
                        <ul className="list-unstyled small">
                          {reading.drawnCards.slice(0, 3).map((card, idx) => (
                            <li key={idx}>
                              • {card.title}{card.reversed ? ' (Reversed)' : ''}
                            </li>
                          ))}
                          {reading.drawnCards.length > 3 && (
                            <li className="text-muted">... and {reading.drawnCards.length - 3} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    {reading.interpretation && (
                      <p className="card-text">
                        <small className="text-muted">
                          {reading.interpretation.length > 100 
                            ? reading.interpretation.substring(0, 100) + '...'
                            : reading.interpretation
                          }
                        </small>
                      </p>
                    )}
                  </div>
                  
                  <div className="card-footer text-muted">
                    <small>Saved: {formatDate(reading.createdAt)}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Reading Modal */}
        {showEditModal && editingReading && (
          <EditReadingModal 
            reading={editingReading}
            onClose={() => {
              setShowEditModal(false)
              setEditingReading(null)
            }}
            onSave={(updatedReading) => {
              setReadings(prev => prev.map(r => 
                r._id === updatedReading._id ? updatedReading : r
              ))
              setShowEditModal(false)
              setEditingReading(null)
            }}
          />
        )}
      </div>
    </AuthWrapper>
  )
}

// Edit Reading Modal Component
function EditReadingModal({ reading, onClose, onSave }) {
  const [question, setQuestion] = useState(reading.question || '')
  const [interpretation, setInterpretation] = useState(reading.interpretation || '')
  const [dateTime, setDateTime] = useState(
    reading.dateTime ? new Date(reading.dateTime).toISOString().slice(0, 16) : ''
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await apiFetch(`/api/readings/${reading._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question,
          interpretation,
          dateTime: new Date(dateTime).toISOString()
        })
      })

      if (!res.ok) {
        throw new Error('Failed to update reading')
      }

      const updatedReading = await res.json()
      onSave(updatedReading.reading)
    } catch (err) {
      alert('Error updating reading: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit Reading</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            <div className="mb-3">
              <label htmlFor="editDateTime" className="form-label">Date & Time</label>
              <input
                id="editDateTime"
                type="datetime-local"
                className="form-control"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
              />
            </div>
            
            <div className="mb-3">
              <label htmlFor="editQuestion" className="form-label">Question</label>
              <input
                id="editQuestion"
                type="text"
                className="form-control"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Enter your question for the reading"
              />
            </div>
            
            <div className="mb-3">
              <label htmlFor="editInterpretation" className="form-label">Interpretation</label>
              <textarea
                id="editInterpretation"
                className="form-control"
                rows={6}
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
                placeholder="Write your interpretation for this reading..."
              />
            </div>

            {/* Display cards (read-only) */}
            {reading.drawnCards && reading.drawnCards.length > 0 && (
              <div className="mb-3">
                <label className="form-label">Cards Drawn (read-only)</label>
                <div className="border rounded p-3 bg-light">
                  {reading.drawnCards.map((card, idx) => (
                    <div key={idx} className="mb-2">
                      <strong>{card.title}</strong>
                      {card.reversed && <span className="text-danger"> (Reversed)</span>}
                      {card.suit && <div><small>Suit: {card.suit}</small></div>}
                      {card.interpretation && (
                        <div><small className="text-muted">{card.interpretation}</small></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-tarot-primary" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}