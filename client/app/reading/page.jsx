"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthWrapper from '../../components/AuthWrapper'
import { apiFetch } from '../../lib/api'

export default function ReadingPage() {
  const router = useRouter()
  const [readings, setReadings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [querents, setQuerents] = useState([])
  const [selectedQuerent, setSelectedQuerent] = useState('self')
  const [timeframe, setTimeframe] = useState('week')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [monthValue, setMonthValue] = useState('')
  const [expanded, setExpanded] = useState({})
  const elRefs = useRef({})
  const [showsReadMore, setShowsReadMore] = useState({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const querentsResponse = await apiFetch('/api/querents')
        if (querentsResponse.ok) {
          const querentsData = await querentsResponse.json()
          const querentsList = Array.isArray(querentsData) ? querentsData : (Array.isArray(querentsData?.querents) ? querentsData.querents : [])
          setQuerents(querentsList)
        }

        const response = await apiFetch('/api/readings/user')
        if (!response.ok) throw new Error('Failed to fetch readings')
        const data = await response.json()

        let readingsList = []
        if (Array.isArray(data)) readingsList = data
        else if (data.readings && Array.isArray(data.readings)) readingsList = data.readings
        else if (data.data && Array.isArray(data.data)) readingsList = data.data

        setReadings(readingsList)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const computeRange = (tf) => {
      const today = new Date()
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
      let start
      if (tf === 'week') {
        start = new Date(end)
        start.setDate(end.getDate() - 6)
        return { start, end }
      } else if (tf === 'month') {
        start = new Date(end.getFullYear(), end.getMonth(), 1)
        const last = new Date(end.getFullYear(), end.getMonth() + 1, 0, 23, 59, 59, 999)
        return { start, end: last }
      }
      return { start: end, end }
    }

    const range = computeRange(timeframe)
    if (timeframe === 'week') {
      setStartDate(range.start.toISOString().slice(0,10))
      setEndDate(range.end.toISOString().slice(0,10))
    } else if (timeframe === 'month') {
      setMonthValue(`${range.start.getFullYear()}-${String(range.start.getMonth()+1).padStart(2,'0')}`)
    }
  }, [timeframe])

  // measure overflow for read-more buttons
  useEffect(() => {
    const updateOverflow = () => {
      const map = {}
      ;(readings || []).forEach((reading, idx) => {
        const rid = reading._id || reading.id || idx
        const outcomeEl = elRefs.current[`outcome-${rid}`]
        const intEl = elRefs.current[`int-${rid}`]
        if (outcomeEl) {
          map[`${rid}-outcome`] = outcomeEl.scrollHeight > outcomeEl.clientHeight || outcomeEl.scrollWidth > outcomeEl.clientWidth
        }
        if (intEl) {
          map[`${rid}-int`] = intEl.scrollHeight > intEl.clientHeight || intEl.scrollWidth > intEl.clientWidth
        }
      })
      setShowsReadMore(map)
    }

    // run after a tick so DOM has rendered
    const t = setTimeout(updateOverflow, 50)
    window.addEventListener('resize', updateOverflow)
    return () => { clearTimeout(t); window.removeEventListener('resize', updateOverflow) }
  }, [readings, expanded])

  const formatDate = (reading) => {
    const dateValue = reading.dateTime || reading.date || reading.createdAt || reading.timestamp
    if (!dateValue) return 'No date'
    try { const date = new Date(dateValue); return date.toLocaleDateString() + ' ' + date.toLocaleTimeString() } catch (e) { return String(dateValue) }
  }

  const formatCards = (reading) => {
    const cards = reading.drawnCards || reading.cards || reading.selectedCards || []
    if (!Array.isArray(cards) || cards.length === 0) return <div className="text-muted">No cards</div>
    return cards.map((card, index) => (
      <div key={index} className="card mb-2 p-2">
        <div><strong>{card.suit && card.card ? `${card.suit} ${card.card}` : card.name || card.cardName || card.title || 'Unknown Card'}</strong></div>
        {card.interpretation && <div className="small text-muted mt-1">{card.interpretation}</div>}
      </div>
    ))
  }

  const toggleExpanded = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const getReadingDate = (reading) => {
    const dateValue = reading.dateTime || reading.date || reading.createdAt || reading.timestamp
    try { return dateValue ? new Date(dateValue) : null } catch (e) { return null }
  }

  const computeRange = (tf) => {
    const today = new Date()
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
    let start
    if (tf === 'week') { start = new Date(end); start.setDate(end.getDate() - 6) }
    else if (tf === 'month') { start = new Date(end.getFullYear(), end.getMonth(), 1) }
    return { start, end }
  }

  let effectiveStart, effectiveEnd
  if (timeframe === 'week' && startDate && endDate) {
    effectiveStart = new Date(startDate + 'T00:00:00')
    effectiveEnd = new Date(endDate + 'T23:59:59')
  } else if (timeframe === 'month' && monthValue) {
    const [y, m] = monthValue.split('-').map(Number)
    if (!isNaN(y) && !isNaN(m)) { effectiveStart = new Date(y, m - 1, 1); effectiveEnd = new Date(y, m, 0, 23, 59, 59, 999) }
  } else {
    const range = computeRange(timeframe); effectiveStart = range.start; effectiveEnd = range.end
  }

  const filteredReadings = readings.filter(reading => {
    if (selectedQuerent === 'all') {}
    else if (selectedQuerent === 'self') {
      if (reading.querent) {
        const qname = (reading.querent?.name || reading.querent?.title || '').toLowerCase()
        const isSelf = qname === 'self' || qname === ''
        if (!isSelf) return false
      }
    } else {
      const idMatch = reading.querent?._id === selectedQuerent || reading.querent === selectedQuerent
      if (!idMatch) return false
    }

    if (effectiveStart && effectiveEnd) {
      const readingDate = getReadingDate(reading)
      if (readingDate && (readingDate < effectiveStart || readingDate > effectiveEnd)) return false
    }
    return true
  })

  const handleCardClick = (reading) => { const readingId = reading._id || reading.id; if (readingId) router.push(`/reading/edit/${readingId}`) }
  const handleEditClick = (e, reading) => { e.stopPropagation(); const readingId = reading._id || reading.id; if (readingId) router.push(`/reading/edit/${readingId}`) }

  if (loading) return (
    <AuthWrapper>
      <div className="d-flex justify-content-center mt-5"><div className="text-white">Loading readings...</div></div>
    </AuthWrapper>
  )

  if (error) return (
    <AuthWrapper>
      <div className="d-flex justify-content-center mt-5"><div className="text-danger">Error: {error}</div></div>
    </AuthWrapper>
  )

  return (
    <AuthWrapper>
      <div className="d-flex justify-content-center mt-5">
        <div style={{ textAlign: 'center', maxWidth: 800, width: '100%' }}>
          <h1 className="mb-4 text-white">Readings</h1>

          <div className="mb-3 d-flex justify-content-center align-items-center">
            <label className="querent-label me-2 form-label">Querent</label>
            <select style={{width:180}} className="form-select" value={selectedQuerent} onChange={(e) => setSelectedQuerent(e.target.value)}>
              <option value="self">Self</option>
              <option value="all">All querents</option>
              {querents.map(q => (<option key={q._id || q.id} value={q._id || q.id}>{q.name || q.title}</option>))}
            </select>
          </div>

          <div className="mb-3 d-flex justify-content-center">
            <div className="btn-group" role="group">
              <button aria-pressed={timeframe==='week'} className={`btn btn-sm ${timeframe==='week' ? 'btn-tarot-primary' : 'btn-outline-light'}`} onClick={() => setTimeframe('week')}>Week</button>
              <button aria-pressed={timeframe==='month'} className={`btn btn-sm ${timeframe==='month' ? 'btn-tarot-primary' : 'btn-outline-light'}`} onClick={() => setTimeframe('month')}>Month</button>
            </div>
          </div>

          <div className="mt-3 d-flex justify-content-center">
            <div className="d-flex align-items-center" style={{ gap: 12 }}>
              {timeframe === 'week' && (<>
                <label className="form-label mb-0 text-white">From</label>
                <input type="date" className="form-control" style={{ width: 160 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <label className="form-label mb-0 text-white">To</label>
                <input type="date" className="form-control" style={{ width: 160 }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </>) }
              {timeframe === 'month' && (<>
                <label className="form-label mb-0 text-white">Month</label>
                <input type="month" className="form-control" style={{ width: 200 }} value={monthValue} onChange={(e) => setMonthValue(e.target.value)} />
              </>) }
            </div>
          </div>

          {readings.length === 0 ? (
            <div className="text-muted mt-4">No readings found in your account.</div>
          ) : filteredReadings.length === 0 ? (
            <div className="text-muted mt-4">No readings found for the selected filters.</div>
          ) : (
            <div className="readings-list mt-4">
              {filteredReadings.map((reading, index) => {
                const rid = reading._id || reading.id || index
                const hasOutcome = !!(reading.outcome && String(reading.outcome).trim())
                return (
                  <div key={rid} className={`card mb-4 position-relative reading-card ${hasOutcome ? 'reading-has-outcome' : ''}`} style={{ cursor: 'default', transition: 'transform 0.2s ease-in-out' }}>
                    <div className="card-body" style={{ paddingTop: '50px' }}>
                      <button
                        className={`btn btn-sm position-absolute ${hasOutcome ? 'btn-tarot-dark' : 'btn-tarot-primary'}`}
                        style={{ top: '10px', right: '10px' }}
                        onClick={(e) => handleEditClick(e, reading)}
                        title={hasOutcome ? 'Edit Outcome' : 'Add Outcome'}
                        aria-label={hasOutcome ? 'Edit Outcome' : 'Add Outcome'}
                      >
                        {hasOutcome ? 'Edit Outcome' : 'Add Outcome'}
                      </button>

                      <div className="mb-2"><strong>Date:</strong> {formatDate(reading)}</div>

                      <div className="mb-3"><div><strong>Question:</strong></div><div className="mt-1">{reading.question || reading.query || 'No question recorded'}</div></div>

                      <div className="mb-3">
                        <div><strong>Outcome:</strong></div>
                        <div className="mt-1 text-muted">
                          {reading.outcome ? (
                            <>
                              <div
                                id={`outcome-${rid}`}
                                ref={(el) => { elRefs.current[`outcome-${rid}`] = el }}
                                className={`${expanded[rid] ? 'outcome-text expanded' : 'truncate-1'}`}
                                style={expanded[rid] ? { whiteSpace: 'normal', overflow: 'visible', maxHeight: 'none' } : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                              >
                                {reading.outcome}
                              </div>
                              {String(reading.outcome).length > 75 && (
                                <button
                                  className="read-toggle read-more-link"
                                  aria-controls={`outcome-${rid}`}
                                  aria-expanded={!!expanded[rid]}
                                  onClick={(e) => { e.stopPropagation(); toggleExpanded(rid) }}
                                >
                                  {expanded[rid] ? 'Show less' : 'Read more'}
                                </button>
                              )}
                            </>
                          ) : 'No outcome recorded'}
                        </div>
                      </div>

                      <div className="mb-2"><strong>Deck:</strong> {(reading.deck && typeof reading.deck === 'object') ? (reading.deck.deckName || reading.deck.name) : reading.deckName || 'Unknown deck'}</div>
                      <div className="mb-2"><strong>Spread:</strong> {(reading.spread && typeof reading.spread === 'object') ? (reading.spread.spread || reading.spread.title || reading.spread.name) : reading.spreadName || 'Unknown spread'}</div>

                      <div className="mb-2">
                        <strong>Cards:</strong>
                        <div className="mt-2">{formatCards(reading)}</div>
                      </div>

                      {(reading.interpretation || reading.overallInterpretation || reading.overall_interpretation || reading.summary) && (
                        <div className="mb-3">
                          <div><strong>Overall Interpretation:</strong></div>
                          <div className="mt-1">
                            {reading.interpretation ? (
                              <>
                                <div
                                  id={`int-${rid}`}
                                  ref={(el) => { elRefs.current[`int-${rid}`] = el }}
                                  className={expanded['int-' + rid] ? 'outcome-text expanded' : 'truncate-1'}
                                  style={expanded['int-' + rid] ? { whiteSpace: 'normal', overflow: 'visible', maxHeight: 'none' } : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                                >
                                  {reading.interpretation}
                                </div>
                                {String(reading.interpretation).length > 75 && (
                                  <button
                                    className="read-toggle read-more-link"
                                    aria-controls={`int-${rid}`}
                                    aria-expanded={!!expanded['int-' + rid]}
                                    onClick={(e) => { e.stopPropagation(); toggleExpanded('int-' + rid) }}
                                  >
                                    {expanded['int-' + rid] ? 'Show less' : 'Read more'}
                                  </button>
                                )}
                              </>
                            ) : (reading.overallInterpretation || reading.overall_interpretation || reading.summary)}
                          </div>
                        </div>
                      )}

                      {(reading.selectedTags && reading.selectedTags.length > 0) && (
                        <div className="mb-2"><strong>Tags:</strong> {reading.selectedTags.map(tag => typeof tag === 'object' ? tag.name : tag).join(', ')}</div>
                      )}

                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </AuthWrapper>
  )
}
