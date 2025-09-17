'use client'

import { useEffect, useState } from 'react'
import AuthWrapper from '../../components/AuthWrapper'
import { apiFetch } from '../../lib/api'

export default function InsightsPage() {
  const [querents, setQuerents] = useState([])
  const [selectedQuerent, setSelectedQuerent] = useState('self')
  const [timeframe, setTimeframe] = useState('week')
  // helper: compute default date ranges and helpers for timeframe
  const computeRange = (tf) => {
    const today = new Date()
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    let start
    let month = ''
    let year = ''
    if (tf === 'week') {
      start = new Date(end)
      start.setDate(end.getDate() - 6) // last 7 days inclusive
      month = ''
      year = ''
    } else if (tf === 'month') {
      // current month
      start = new Date(end.getFullYear(), end.getMonth(), 1)
      // end is last day of month
      const last = new Date(end.getFullYear(), end.getMonth() + 1, 0)
      // use last as end
      month = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`
      year = String(end.getFullYear())
      const toISODate = (d) => d.toISOString().slice(0,10)
      return { start: toISODate(start), end: toISODate(last), month, year }
    } else if (tf === 'year') {
      start = new Date(end.getFullYear(), 0, 1)
      const last = new Date(end.getFullYear(), 11, 31)
      month = ''
      year = String(end.getFullYear())
      const toISODate = (d) => d.toISOString().slice(0,10)
      return { start: toISODate(start), end: toISODate(last), month, year }
    } else {
      start = new Date(end)
    }
    const toISODate = (d) => d.toISOString().slice(0,10)
    return { start: toISODate(start), end: toISODate(end), month, year }
  }
  const initialRange = computeRange(timeframe)
  const [decks, setDecks] = useState([])
  const [selectedDeck, setSelectedDeck] = useState('all')
  const [tags, setTags] = useState([])
  const [selectedTag, setSelectedTag] = useState('all')
  const [startDate, setStartDate] = useState(initialRange.start)
  const [endDate, setEndDate] = useState(initialRange.end)
  // month/year helper states to bind to the month/year inputs
  const [monthValue, setMonthValue] = useState(initialRange.month || '')
  const [yearValue, setYearValue] = useState(initialRange.year || '')
  const [totalCount, setTotalCount] = useState(null)
  const [isFetchingCount, setIsFetchingCount] = useState(false)
  const [lastFetchError, setLastFetchError] = useState(null)
  const [isClearingTag, setIsClearingTag] = useState(false)

  // Validation: ensure start <= end
  const isRangeValid = (() => {
    if (!startDate || !endDate) return false
    try {
      return new Date(startDate) <= new Date(endDate)
    } catch (e) {
      return false
    }
  })()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await apiFetch('/api/querents')
        if (!res.ok) return
        const data = await res.json()
        // server returns { querents: [...] }
        const list = data.querents || []
        if (!mounted) return
        setQuerents(list)
        // if there's a personal querent called 'Self' for the user, prefer that id
        // otherwise keep the default 'self' which the server resolves to global Self
      } catch (err) {
        console.warn('Failed to load querents', err)
      }
    })()
    return () => { mounted = false }
  }, [])

  // update date range when timeframe changes
  useEffect(() => {
    const r = computeRange(timeframe)
    setStartDate(r.start)
    setEndDate(r.end)
    setMonthValue(r.month || '')
    setYearValue(r.year || '')
  }, [timeframe])

  // when monthValue changes (for month timeframe) compute start/end
  useEffect(() => {
    if (timeframe !== 'month') return
    if (!monthValue) return
    // monthValue is YYYY-MM
    const [y, m] = monthValue.split('-').map(Number)
    if (!y || !m) return
    const start = new Date(y, m - 1, 1)
    const last = new Date(y, m, 0)
    const toISO = (d) => d.toISOString().slice(0,10)
    setStartDate(toISO(start))
    setEndDate(toISO(last))
    setYearValue(String(y))
  }, [monthValue, timeframe])

  // when yearValue changes (for year timeframe) compute start/end
  useEffect(() => {
    if (timeframe !== 'year') return
    const y = Number(yearValue)
    if (!y) return
    const start = new Date(y, 0, 1)
    const last = new Date(y, 11, 31)
    const toISO = (d) => d.toISOString().slice(0,10)
    setStartDate(toISO(start))
    setEndDate(toISO(last))
  }, [yearValue, timeframe])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await apiFetch('/api/decks')
        if (!res.ok) return
        const data = await res.json()
        // server likely returns array or { decks }
        const list = Array.isArray(data) ? data : (data.decks || [])
        if (!mounted) return
        setDecks(list)
      } catch (err) {
        console.warn('Failed to load decks', err)
      }
    })()
    return () => { mounted = false }
  }, [])

  // load tags (global + user)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await apiFetch('/api/tags')
        if (!res.ok) return
        const data = await res.json()
        const list = data.tags || (Array.isArray(data) ? data : [])
        if (!mounted) return
        setTags(list)
      } catch (err) {
        console.warn('Failed to load tags', err)
      }
    })()
    return () => { mounted = false }
  }, [])

  // input validity: Week requires valid start/end, Month requires monthValue, Year requires yearValue
  const isInputValid = (() => {
    if (timeframe === 'week') return isRangeValid
    if (timeframe === 'month') return !!monthValue
    if (timeframe === 'year') return !!yearValue
    return true
  })()

  // Reusable fetch function so Refresh button can call it manually
  const fetchCount = async () => {
    // Skip fetch when inputs are invalid
    if (!isInputValid) {
      setLastFetchError('Invalid inputs for selected timeframe')
      return
    }
    setIsFetchingCount(true)
    setLastFetchError(null)
    try {
      const params = new URLSearchParams()
      if (selectedQuerent) params.set('querent', selectedQuerent)
      if (startDate) params.set('start', startDate)
      if (endDate) params.set('end', endDate)
      if (selectedDeck) params.set('deck', selectedDeck)
      // include tags if selected (server accepts comma-separated list or JSON array)
      // include tag if selected (server accepts comma-separated list or JSON array)
      if (selectedTag && selectedTag !== 'all') {
        params.set('tags', selectedTag)
      }
      const res = await apiFetch('/api/insights/count?' + params.toString())
      if (!res.ok) {
        setTotalCount(null)
        setLastFetchError('Server returned an error')
        return
      }
      const data = await res.json()
      setTotalCount(typeof data.count === 'number' ? data.count : null)
    } catch (e) {
      console.warn('Failed to fetch insights count', e)
      setTotalCount(null)
      setLastFetchError(e && e.message ? e.message : String(e))
    } finally {
      setIsFetchingCount(false)
    }
  }

  // Auto-fetch when dependencies change, but only when inputs are valid
  useEffect(() => {
    fetchCount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuerent, startDate, endDate, selectedDeck, timeframe, selectedTag])

  return (
    <AuthWrapper>
      <div className="container mt-5">
        <div className="d-flex justify-content-center">
          <div style={{ textAlign: 'center', maxWidth: 720, width: '100%' }}>
            <div style={{ position: 'relative' }}>
              <h1 className="mb-4 text-white fs-xl">Insights</h1>
              <button
                type="button"
                className="btn btn-tarot-primary btn-sm position-absolute"
                onClick={() => fetchCount()}
                disabled={!isInputValid || isFetchingCount}
                style={{ top: 8, right: 8 }}
                title={!isInputValid ? 'Adjust timeframe inputs first' : 'Refresh count'}
              >
                {isFetchingCount ? (
                  <span className="spinner-border spinner-border-sm text-white" role="status" aria-hidden="true"></span>
                ) : 'Refresh'}
              </button>
            </div>
            

            <div className="d-flex justify-content-center querent-row">
              <div>
                <label htmlFor="querentSelect" className="form-label text-white fs-lg">Querent</label>
                <select
                  id="querentSelect"
                  className="form-select"
                  value={selectedQuerent}
                  onChange={(e) => setSelectedQuerent(e.target.value)}
                  style={{ width: 160 }}
                >
                  <option value="self">Self</option>
                  {querents.map(q => (
                    <option key={q._id} value={q._id}>{q.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timeframe links */}
            <div className="mt-3 d-flex justify-content-center">
              <div>
                <div className="btn-group" role="group" aria-label="Timeframe">
                  {['week','month','year'].map(tf => (
                    <button
                      key={tf}
                      type="button"
                      className={`btn ${timeframe === tf ? 'btn-tarot-primary' : 'btn-outline-light'}`}
                      onClick={() => setTimeframe(tf)}
                    >
                      {tf.charAt(0).toUpperCase() + tf.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date / Month / Year inputs depending on timeframe */}
            <div className="mt-3 d-flex justify-content-center">
              <div className="d-flex align-items-center" style={{ gap: 12 }}>
                {timeframe === 'week' && (
                  <>
                    <label className="form-label mb-0 text-white">From</label>
                    <input type="date" className={`form-control ${!isRangeValid ? 'is-invalid' : ''}`} style={{ width: 160 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <label className="form-label mb-0 text-white">To</label>
                    <input type="date" className={`form-control ${!isRangeValid ? 'is-invalid' : ''}`} style={{ width: 160 }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </>
                )}

                {timeframe === 'month' && (
                  <>
                    <label className="form-label mb-0 text-white">Month</label>
                    <input type="month" className="form-control" style={{ width: 200 }} value={monthValue} onChange={(e) => setMonthValue(e.target.value)} />
                  </>
                )}

                {timeframe === 'year' && (
                  <>
                    <label className="form-label mb-0 text-white">Year</label>
                    <input type="number" min="1900" max="2100" className="form-control" style={{ width: 140 }} value={yearValue} onChange={(e) => setYearValue(e.target.value)} />
                  </>
                )}
              </div>
            </div>

            {/* Friendly validation message */}
            {!isRangeValid && (
              <div className="d-flex justify-content-center">
                <div className="text-danger mt-2" role="alert" aria-live="polite">
                  Start date must be the same as or before the end date. Please adjust the range.
                </div>
              </div>
            )}

            {/* Deck select */}
            <div className="mt-3 d-flex justify-content-center">
              <div className="d-flex align-items-center" style={{ gap: 12 }}>
                <label htmlFor="deckSelect" className="form-label mb-0 text-white fs-lg">Deck</label>
                <select id="deckSelect" className="form-select" value={selectedDeck} onChange={(e) => setSelectedDeck(e.target.value)} style={{ width: 320 }}>
                  <option value="all">All decks</option>
                  {decks.map(d => (
                    <option key={d._id} value={d._id}>{d.deckName || d.name || d.title}</option>
                  ))}
                </select>
                
              </div>
            </div>

            {/* Tags dropdown (single select) */}
            <div className="mt-3 d-flex justify-content-center">
              <div className="d-flex align-items-center" style={{ gap: 12 }}>
                <label htmlFor="tagsSelect" className="form-label mb-0 text-white fs-lg">Tags</label>
                <select id="tagsSelect" className="form-select" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} style={{ width: 320 }}>
                  <option value="all">All tags</option>
                  {tags.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active tag label */}
            {selectedTag && selectedTag !== 'all' && (
              <div className="mt-2 d-flex justify-content-center">
                <a
                  href="#"
                  className={`insights-filter-link text-white ${isClearingTag ? 'fade-out-up' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    if (isClearingTag) return
                    // trigger animation, then clear selection
                    setIsClearingTag(true)
                    window.setTimeout(() => {
                      setSelectedTag('all')
                      setIsClearingTag(false)
                    }, 240)
                  }}
                  title="Click to clear tag filter"
                >
                  <span className="text-white">Filtering by:</span>&nbsp;<strong className="text-white">{(tags.find(t => t._id === selectedTag) || {}).name || 'Selected tag'}</strong>
                </a>
              </div>
            )}

              {/* Total readings display (prominent) */}
              {totalCount !== null && (
                <div className="mt-4 d-flex justify-content-center">
                  <div className="text-white fs-xl">
                    <strong>Total readings:</strong> {totalCount}
                  </div>
                </div>
              )}
              {lastFetchError && (
                <div className="mt-2 d-flex justify-content-center">
                  <div className="text-danger">{lastFetchError}</div>
                </div>
              )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  )
}
