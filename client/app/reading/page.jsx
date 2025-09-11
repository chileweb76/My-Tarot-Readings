'use client'

import { useEffect, useState } from 'react'
import AuthWrapper from '../../components/AuthWrapper'
import { apiFetch } from '../../lib/api'

export default function ReadingPage() {
  const [reading, setReading] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchReading = async () => {
  try {
  const response = await apiFetch('/api/readings')
        
        if (!response.ok) {
          throw new Error('Failed to fetch reading')
        }
        
        const data = await response.json()
        setReading(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reading')
      } finally {
        setLoading(false)
      }
    }

    fetchReading()
  }, [])

  return (
    <AuthWrapper>
      {loading && (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Drawing your cards...</p>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error</h4>
          <p>{error}</p>
          <hr />
          <p className="mb-0">Please try again later or check if the server is running.</p>
        </div>
      )}

      {!loading && !error && (
        <div className="row">
          <div className="col-lg-10 mx-auto">
            <div className="card card-reading p-4">
              <h1 className="text-center mb-4">Your Tarot Reading</h1>
              
              {reading && (
                <>
                  <div className="row g-4 mb-4">
                    {reading.cards.map((card, index) => (
                      <div key={index} className="col-md-4">
                        <div className="card h-100">
                          <div className="card-body text-center">
                            <h5 className="card-title text-primary">{card.position}</h5>
                            <div className="tarot-card mb-3">🎴</div>
                            <h6 className="card-subtitle mb-2">{card.name}</h6>
                            <p className="card-text text-muted">{card.meaning}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center">
                    <p className="text-muted">
                      Spread: {reading.spread} • {new Date(reading.timestamp).toLocaleString()}
                    </p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => window.location.reload()}
                    >
                      Get New Reading
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthWrapper>
  )
}
