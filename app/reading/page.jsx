"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthWrapper from '../../components/AuthWrapper'
import ExportToolbar from '../../components/ExportToolbar'
import { notify } from '../../lib/toast'
import { LargeImageWarningModal, ExportSignInModal } from '../../components/modals'
import {
  getQuerentsAction,
  getUserReadingsAction,
  exportReadingPDFAction
} from '../../lib/actions'

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

        // Small delay to ensure authentication state is established
        await new Promise(resolve => setTimeout(resolve, 100))

        console.log('Making API calls using Server Actions')

        const querentsResult = await getQuerentsAction()
        if (querentsResult.success) {
          setQuerents(querentsResult.data)
        } else {
          console.warn('Failed to load querents:', querentsResult.error)
        }

        const readingsResult = await getUserReadingsAction()
        if (!readingsResult.success) {
          console.error('Readings API error:', readingsResult.error)
          throw new Error(readingsResult.error || 'Failed to fetch readings')
        }
        const data = readingsResult.data
        console.log('Readings data received:', data)

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

  // simple image fetch + size check helper (uses localStorage configured limit)
  const getImageSizeLimitBytes = () => {
    try {
      const v = localStorage.getItem('IMAGE_SIZE_LIMIT_MB')
      const mb = v ? parseFloat(v) : 5.0
      return Math.max(0.1, mb) * 1024 * 1024
    } catch (e) { return 5.0 * 1024 * 1024 }
  }
  const [largeImagePending, setLargeImagePending] = useState(null)
  const [showExportSignInModal, setShowExportSignInModal] = useState(false)

  const fetchBlobWithSizeCheck = async (url) => {
    try {
      const res = await fetch(url)
      if (!res.ok) return { proceed: false, blob: null }
      const b = await res.blob()
      if (b.size > getImageSizeLimitBytes()) {
        // show LargeImageWarningModal and wait for user's decision
        const human = `${(b.size / 1024 / 1024).toFixed(2)} MB`
        const p = new Promise((resolve) => {
          setLargeImagePending({ size: b.size, humanSize: human, resolve })
        })
        const userChoice = await p
        return { proceed: !!userChoice, blob: userChoice ? b : null }
      }
      return { proceed: true, blob: b }
    } catch (e) {
      console.warn('Failed to fetch blob for size check', e)
      return { proceed: false, blob: null }
    }
  }

  const [exportingMap, setExportingMap] = useState({})
  const setExportingFor = (rid, v) => setExportingMap(prev => ({ ...prev, [rid]: !!v }))

  const preparePayloadFromReading = (reading) => {
    const readingDateTime = reading.dateTime || reading.date || reading.createdAt || new Date().toISOString()
    const cards = reading.drawnCards || reading.cards || reading.selectedCards || []
    const cardsMapped = (Array.isArray(cards) ? cards : []).map(c => ({
      title: c.title || c.name || c.cardName || '',
      suit: c.suit || '',
      card: c.card || c.cardName || c.name || '',
      reversed: !!c.reversed,
      interpretation: c.interpretation || '' ,
      image: c.image || null
    }))

    return {
      by: (reading.by || reading.author || (reading.user && reading.user.username) || 'Unknown'),
      date: new Date(readingDateTime).toLocaleString(),
      querent: reading.querent && (reading.querent.name || reading.querent.title) ? (reading.querent.name || reading.querent.title) : (reading.querent || 'Unknown'),
      spread: (reading.spread && (reading.spread.spread || reading.spread.title || reading.spread.name)) || reading.spreadName || 'Unknown spread',
      deck: (reading.deck && (reading.deck.deckName || reading.deck.name)) || reading.deckName || 'Unknown deck',
      question: reading.question || reading.query || '',
      cards: cardsMapped,
      interpretation: reading.interpretation || reading.overallInterpretation || reading.summary || '',
      outcome: reading.outcome || '',
      image: reading.image || null,
      exportedAt: new Date().toLocaleString()
    }
  }

  const handlePrintReadingFor = async (reading) => {
    const rid = reading._id || reading.id || String(Math.random())
    setExportingFor(rid, true)
    try {
      const payload = preparePayloadFromReading(reading)
      const exportHtml = `
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
            </div>
          )}

        </div>
      </div>
      {/* Shared modals rendered at page root so they overlay correctly */}
      <ExportSignInModal show={showExportSignInModal} onClose={() => setShowExportSignInModal(false)} />
      <LargeImageWarningModal info={largeImagePending} getImageSizeLimitBytes={getImageSizeLimitBytes} onClose={() => setLargeImagePending(null)} />
    </AuthWrapper>
  )
          </div>
          <div class="section"><h3>Question</h3><div>${payload.question || 'No question recorded'}</div></div>
          <div class="section"><h3>Outcome</h3><div>${payload.outcome || 'No outcome recorded'}</div></div>
          <div class="section"><h3>Cards Drawn</h3>
            ${payload.cards.map(cs => `<div class="card-item"><div class="card-title">${cs.title || ''}${cs.card ? ` - ${cs.card}` : ''}${cs.reversed ? ' (reversed)' : ''}</div>${cs.interpretation ? `<div class="card-interpretation">${cs.interpretation}</div>` : ''}${cs.image ? `<div style="margin-top:8px"><img src="${cs.image}" style="max-width:120px;max-height:160px"/></div>` : ''}</div>`).join('')}
          </div>
          <div class="section"><h3>Interpretation</h3><div>${payload.interpretation || 'No overall interpretation provided'}</div></div>
          <div class="footer-note">Exported: ${new Date().toLocaleString()}</div>
        </body>
      </html>
      `

      const printWindow = window.open('', '_blank')
      if (!printWindow) { notify({ type: 'error', text: 'Unable to open print window. Please allow popups.' }); setExportingFor(rid, false); return }
      printWindow.document.write(exportHtml)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => { try { printWindow.print(); printWindow.onafterprint = () => { try { printWindow.close() } catch (e) {} } } catch (err) { console.error('Print failed', err); notify({ type: 'error', text: 'Print failed' }) } }, 300)
    } finally { setExportingFor(rid, false) }
  }

  const handleExportReadingFor = async (reading) => {
    const rid = reading._id || reading.id || String(Math.random())
    setExportingFor(rid, true)
    try {
      const payload = preparePayloadFromReading(reading)
      // If reading contains local/blob/data images and user not signed in, prompt sign-in like HomePage
      const hasLocalImage = (payload.image && typeof payload.image === 'string' && (/^data:|^blob:|^object:/i).test(payload.image)) || (payload.cards && payload.cards.some(c => c.image && typeof c.image === 'string' && (/^data:|^blob:|^object:/i).test(c.image)))
      if (hasLocalImage) {
        const token = localStorage.getItem('token')
        if (!token) { setShowExportSignInModal(true); setExportingFor(rid, false); return }
      }
      // prepare images (convert blob/object URLs to data URLs and check sizes)
      try {
        for (let i = 0; i < payload.cards.length; i++) {
          const c = payload.cards[i]
          if (!c.image || typeof c.image !== 'string') continue
          if (c.image.startsWith('data:')) {
            const { proceed } = await fetchBlobWithSizeCheck(c.image)
            if (!proceed) { notify({ type: 'info', text: 'Export cancelled due to large image.' }); setExportingFor(rid, false); return }
          } else if (c.image.startsWith('blob:') || c.image.startsWith('object:')) {
            const { proceed, blob } = await fetchBlobWithSizeCheck(c.image)
            if (!proceed) { notify({ type: 'info', text: 'Export cancelled due to large image.' }); setExportingFor(rid, false); return }
            if (blob) {
              c.image = await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.onerror = reject; fr.readAsDataURL(blob) })
            }
          } else if (!/^https?:\/\//i.test(c.image) && c.image.startsWith('/')) {
            c.image = `${window.location.protocol}//${window.location.host}${c.image}`
          }
        }
      } catch (e) { console.warn('Failed preparing images for export', e); alert('Failed to prepare images for export.'); setExportingFor(rid, false); return }

      const result = await exportReadingPDFAction({ 
        reading: payload, 
        fileName: `tarot-reading-${new Date().toISOString().split('T')[0]}.pdf` 
      })
      
      if (!result.success) { 
        console.error('Server export failed', result.error); 
        notify({ type: 'error', text: 'Server export failed' }); 
        setExportingFor(rid, false); 
        return 
      }
      
      // Convert base64 back to blob for download
      const binaryString = atob(result.data.blob)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: result.data.contentType })
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tarot-reading-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) { console.error('Export failed', e); notify({ type: 'error', text: 'Export failed' }) }
    finally { setExportingFor(rid, false) }
  }

  const handleShareAsPdfFor = async (reading) => {
    const rid = reading._id || reading.id || String(Math.random())
    setExportingFor(rid, true)
    try {
      const payload = preparePayloadFromReading(reading)
      const hasLocalImage = (payload.image && typeof payload.image === 'string' && (/^data:|^blob:|^object:/i).test(payload.image)) || (payload.cards && payload.cards.some(c => c.image && typeof c.image === 'string' && (/^data:|^blob:|^object:/i).test(c.image)))
      if (hasLocalImage) {
        const token = localStorage.getItem('token')
        if (!token) { setShowExportSignInModal(true); setExportingFor(rid, false); return }
      }
      try {
        for (let i = 0; i < payload.cards.length; i++) {
          const c = payload.cards[i]
          if (!c.image || typeof c.image !== 'string') continue
          if (c.image.startsWith('data:')) {
            const { proceed } = await fetchBlobWithSizeCheck(c.image)
            if (!proceed) { notify({ type: 'info', text: 'Share cancelled due to large image.' }); setExportingFor(rid, false); return }
          } else if (c.image.startsWith('blob:') || c.image.startsWith('object:')) {
            const { proceed, blob } = await fetchBlobWithSizeCheck(c.image)
            if (!proceed) { notify({ type: 'info', text: 'Share cancelled due to large image.' }); setExportingFor(rid, false); return }
            if (blob) {
              c.image = await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.onerror = reject; fr.readAsDataURL(blob) })
            }
          } else if (!/^https?:\/\//i.test(c.image) && c.image.startsWith('/')) {
            c.image = `${window.location.protocol}//${window.location.host}${c.image}`
          }
        }
      } catch (e) { console.warn('Failed preparing images for share', e); alert('Failed to prepare images for sharing.'); setExportingFor(rid, false); return }

      const result = await exportReadingPDFAction({ 
        reading: payload, 
        fileName: `tarot-reading-${new Date().toISOString().split('T')[0]}.pdf` 
      })
      
      if (!result.success) { 
        notify({ type: 'error', text: 'Server failed to generate PDF for sharing.' }); 
        setExportingFor(rid, false); 
        return 
      }
      
      // Convert base64 back to blob
      const binaryString = atob(result.data.blob)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: result.data.contentType })
      
      const filename = `tarot-reading-${new Date().toISOString().split('T')[0]}.pdf`
      try {
        const file = new File([blob], filename, { type: 'application/pdf' })
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Tarot Reading', text: 'Sharing a PDF of the tarot reading.' })
          setExportingFor(rid, false)
          return
        }
      } catch (e) { console.warn('Web Share with files not available', e) }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) { console.error('Share as PDF failed', e); notify({ type: 'error', text: 'Share as PDF failed' }) }
    finally { setExportingFor(rid, false) }
  }

  const handleShareReadingFor = async (reading) => {
    const rid = reading._id || reading.id || String(Math.random())
    setExportingFor(rid, true)
    try {
      const payload = preparePayloadFromReading(reading)
      const cardsText = (payload.cards || []).map(cs => {
        const details = cs.card ? (cs.suit && cs.suit.toLowerCase() !== 'major arcana' ? `${cs.card} of ${cs.suit}` : cs.card) : ''
        const rev = cs.reversed ? ' (reversed)' : ''
        const interp = cs.interpretation ? ` — ${cs.interpretation}` : ''
        return `${cs.title || ''}${details ? ` — ${details}` : ''}${rev}${interp}`
      }).join('\n')

      const shareText = `🔮 Tarot Reading - ${payload.date}\n\nQuerent: ${payload.querent}\nSpread: ${payload.spread}\nQuestion: ${payload.question}\n\nCards:\n${cardsText}\n\nInterpretation: ${payload.interpretation || 'No interpretation provided'}`

      if (navigator.share) {
        try { await navigator.share({ title: 'Tarot Reading', text: shareText }); setExportingFor(rid, false); return } catch (e) { console.warn('Share failed', e) }
      }
      try { await navigator.clipboard.writeText(shareText); notify({ type: 'success', text: 'Reading copied to clipboard!' }) } catch (e) { console.error('Failed to copy to clipboard', e); notify({ type: 'error', text: 'Failed to copy reading to clipboard' }) }
    } finally { setExportingFor(rid, false) }
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

  // Modal to warn the user when converting a large image to a data URL
  // Shared modals (LargeImageWarningModal and ExportSignInModal) are imported from components/ExportModals

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
                    {/* Export toolbar positioned in top-left of card */}
                    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
                      <ExportToolbar
                        onPrint={() => handlePrintReadingFor(reading)}
                        onSharePdf={() => handleShareAsPdfFor(reading)}
                        onExport={() => handleExportReadingFor(reading)}
                        onShareText={() => handleShareReadingFor(reading)}
                        busy={!!exportingMap[rid]}
                        printTitle="Print this reading"
                        sharePdfTitle="Share this reading as PDF"
                        exportTitle="Export this reading"
                        shareTitle="Share this reading"
                      />
                    </div>
                    <div className="card-body" style={{ paddingTop: '50px' }}>
                      <button
                        className={`btn btn-sm position-absolute btn-tarot-secondary`}
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
