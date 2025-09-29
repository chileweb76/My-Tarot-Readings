 'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import AuthWrapper from '../../components/AuthWrapper'
import { notify } from '../../lib/toast'
import { buildSuitDataset } from '../../lib/suitUtils'
import ExportToolbar from '../../components/ExportToolbar'
import {
  getQuerentsAction,
  getDecksAction,
  getTagsAction,
  getInsightsCountAction,
  getInsightsSuitsAction,
  getInsightsCardsAction,
  exportReadingPDFAction
} from '../../lib/actions'

export default function InsightsPage() {
  const [querents, setQuerents] = useState([])
  const [selectedQuerent, setSelectedQuerent] = useState('all')
  const [timeframe, setTimeframe] = useState('week')
  const [decks, setDecks] = useState([])
  const [selectedDeck, setSelectedDeck] = useState('all')
  const [tags, setTags] = useState([])
  const [selectedTag, setSelectedTag] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [monthValue, setMonthValue] = useState('')
  const [yearValue, setYearValue] = useState('')
  const [totalCount, setTotalCount] = useState(null)
  const [suitCounts, setSuitCounts] = useState({})
  const [cardCounts, setCardCounts] = useState([])
  const [isFetchingCount, setIsFetchingCount] = useState(false)
  const [lastFetchError, setLastFetchError] = useState(null)
  const [isClearingTag, setIsClearingTag] = useState(false)
  const rootRef = useRef(null)

  const computeRange = (tf) => {
    const today = new Date()
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    let start
    let month = ''
    let year = ''
    if (tf === 'week') {
      start = new Date(end)
      start.setDate(end.getDate() - 6)
    } else if (tf === 'month') {
      start = new Date(end.getFullYear(), end.getMonth(), 1)
      const last = new Date(end.getFullYear(), end.getMonth() + 1, 0)
      month = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`
      year = String(end.getFullYear())
      return { start: toISO(start), end: toISO(last), month, year }
    } else if (tf === 'year') {
      start = new Date(end.getFullYear(), 0, 1)
      const last = new Date(end.getFullYear(), 11, 31)
      year = String(end.getFullYear())
      return { start: toISO(start), end: toISO(last), month, year }
    } else {
      start = new Date(end)
    }
    return { start: toISO(start), end: toISO(end), month, year }
  }

  const toISO = (d) => d.toISOString().slice(0, 10)

  // initialize date range
  useEffect(() => {
    const r = computeRange(timeframe)
    setStartDate(r.start)
    setEndDate(r.end)
    setMonthValue(r.month || '')
    setYearValue(r.year || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe])

  // short helper to capture the current Insights DOM as HTML
  const captureInsightsHtml = async () => {
    if (!rootRef.current) return document.documentElement.outerHTML
    const root = rootRef.current
    const clone = root.cloneNode(true)

        // Apply selective light theme for export
    try {
      // Force light background on the main overlay containers
      const overlays = clone.querySelectorAll('div[style*="rgba(255,255,255,0.04)"], div[style*="rgba(255,255,255,0.03)"], div[style*="rgba(255,255,255,0.08)"]')
      overlays.forEach(el => {
        el.style.background = '#f8f9fa'
        el.style.backgroundColor = '#f8f9fa'
        el.style.border = '1px solid #dee2e6'
      })
      
    } catch (e) {
      console.warn('Failed to apply selective light theme', e)
    }

    // Give the browser a frame to ensure Chart canvases have finished rendering
    try {
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)))
    } catch (e) {
      // ignore in non-browser environments
    }

    try {
      // Simple canvas capture for any remaining canvases
      const liveCanvases = Array.from(root.querySelectorAll('canvas'))
      const cloneCanvases = Array.from(clone.querySelectorAll('canvas'))
      for (let i = 0; i < liveCanvases.length; i++) {
        const live = liveCanvases[i]
        const cloneC = cloneCanvases[i]
        try {
          let dataUrl = null
          
          // Use direct canvas capture
          try {
            dataUrl = live.toDataURL && live.toDataURL('image/png', 1.0)
          } catch (e) {
            console.warn('Canvas toDataURL failed', e)
          }

          if (dataUrl) {
            const img = document.createElement('img')
            img.className = '__capture_canvas_img'
            img.src = dataUrl
            if (cloneC && cloneC.parentNode) {
              const visW = cloneC.clientWidth || live.clientWidth || cloneC.width || live.width || 800
              const visH = cloneC.clientHeight || live.clientHeight || cloneC.height || live.height || 400
              img.width = Math.round(visW)
              img.height = Math.round(visH)
              img.style.width = Math.round(visW) + 'px'
              img.style.height = Math.round(visH) + 'px'
              cloneC.parentNode.replaceChild(img, cloneC)
            }
          }
        } catch (e) {
          console.warn('Failed to capture canvas', e)
        }
      }
    } catch (e) {
      console.warn('Canvas inlining failed', e)
    }

    // Inline <style> tags directly
    const headStyleTags = Array.from(document.querySelectorAll('style')).map(s => s.outerHTML)

    // For linked stylesheets, attempt to fetch their contents and inline as <style> blocks.
    const linkEls = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    const inlinedLinkStyles = await Promise.all(linkEls.map(async (l) => {
      try {
        const href = l.href
        if (!href) return l.outerHTML
        // Try fetching the CSS text. This may fail due to CORS for third-party stylesheets.
        const resp = await fetch(href)
        if (!resp.ok) return l.outerHTML
        const text = await resp.text()
        // Wrap in a style tag with a comment showing original href for debugging
        return `<style data-href="${href}">/* inlined from ${href} */\n${text}\n</style>`
      } catch (e) {
        // Fall back to the original link tag if fetch fails
        return l.outerHTML
      }
    }))

    // Export-only overrides: force bright white theme for PDF
    const exportOverrides = `<style>
      /* Force bright white background for PDF */
      html, body { 
        background: #ffffff !important; 
        background-color: #ffffff !important;
        color: #000000 !important; 
      }
      
      /* Remove all background images and dark overlays */
      body::before, body::after {
        display: none !important;
      }
      
      /* Force all containers to light backgrounds */
      * {
        background-image: none !important;
      }
      
      div[style*="rgba(255,255,255,0.04)"], 
      div[style*="rgba(255,255,255,0.03)"],
      div[style*="rgba(255,255,255,0.08)"],
      .chart-container {
        background: #f8f9fa !important;
        background-color: #f8f9fa !important;
        border: 1px solid #dee2e6 !important;
      }
      
      /* Force all text to black */
      *, *::before, *::after {
        color: #000000 !important;
      }
      
      h1, h2, h3, h4, h5, h6,
      p, span, div, label, li, a {
        color: #000000 !important;
      }
      
      .text-white, .text-light, .text-muted, .text-secondary {
        color: #000000 !important;
      }
      
      /* Text inside colored bars - override ALL inline styles */
      [style*="backgroundColor"] .text-white,
      [style*="backgroundColor"] span,
      [style*="backgroundColor"] .chart-number,
      [style*="backgroundColor"] span[style*="textShadow"],
      [style*="backgroundColor"] span[style*="color: #fff"] {
        color: #ffffff !important;
        text-shadow: none !important;
        font-weight: bold !important;
        background: none !important;
        background-color: transparent !important;
        box-shadow: none !important;
      }
      
      /* Specific override for chart numbers */
      .chart-number {
        color: #ffffff !important;
        text-shadow: none !important;
        background: none !important;
        background-color: transparent !important;
        box-shadow: none !important;
      }
      
      /* Card frequency styling */
      .card-frequency-item {
        background: #e9ecef !important;
        border: 1px solid #ced4da !important;
        color: #000000 !important;
      }
      
      .card-frequency-count {
        background: #495057 !important;
        color: #ffffff !important;
      }
      
      /* Remove any button dark styling */
      .btn, .btn-tarot-dark, .btn-outline-light { 
        background: #f8f9fa !important;
        color: #000000 !important; 
        border: 1px solid #ced4da !important; 
      }
      
      /* Form controls */
      input, select { 
        background: #ffffff !important; 
        color: #000000 !important; 
        border: 1px solid #ced4da !important; 
      }
      
      /* Remove any remaining dark styling */
      [style*="background-color: #"] {
        color: #000000 !important;
      }
    </style>`

    const head = `<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><base href="${window.location.origin}"/>${exportOverrides}${inlinedLinkStyles.join('\n')}${headStyleTags.join('\n')}`
    return `<html><head>${head}</head><body>${clone.outerHTML}</body></html>`
  }

  // fetch helpers: querents, decks, tags
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const result = await getQuerentsAction()
        if (!result.success) return
        if (!mounted) return
        setQuerents(result.data || [])
      } catch (e) {
        console.warn('Failed to load querents', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const result = await getDecksAction()
        if (!result.success) return
        if (!mounted) return
        setDecks(Array.isArray(result.data) ? result.data : (result.data.decks || []))
      } catch (e) {
        console.warn('Failed to load decks', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const result = await getTagsAction()
        if (!result.success) return
        if (!mounted) return
        setTags(result.data.tags || [])
      } catch (e) {
        console.warn('Failed to load tags', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  const isRangeValid = (() => {
    if (!startDate || !endDate) return false
    try { return new Date(startDate) <= new Date(endDate) } catch (e) { return false }
  })()

  const isInputValid = (() => {
    if (timeframe === 'week') return isRangeValid
    if (timeframe === 'month') return !!monthValue
    if (timeframe === 'year') return !!yearValue
    return true
  })()

  const fetchCount = useCallback(async () => {
    if (!isInputValid) { setLastFetchError('Invalid inputs for selected timeframe'); return }
    setIsFetchingCount(true)
    setLastFetchError(null)
    try {
      const params = new URLSearchParams()
      if (selectedQuerent) params.set('querent', selectedQuerent)
      if (startDate) params.set('start', startDate)
      if (endDate) params.set('end', endDate)
      if (selectedDeck) params.set('deck', selectedDeck)
      if (selectedTag && selectedTag !== 'all') params.set('tags', selectedTag)

      const result = await getInsightsCountAction(Object.fromEntries(params))
      if (!result.success) { setTotalCount(null); setLastFetchError('Server returned an error'); return }
      setTotalCount(typeof result.data.count === 'number' ? result.data.count : null)

      try {
        const suitsResult = await getInsightsSuitsAction(Object.fromEntries(params))
        if (suitsResult && suitsResult.success) {
          setSuitCounts(suitsResult.data.suits || {})
        } else setSuitCounts({})
      } catch (e) { console.warn('Failed to fetch suit frequencies', e); setSuitCounts({}) }

      try {
        const cardsResult = await getInsightsCardsAction(Object.fromEntries(params))
        if (cardsResult && cardsResult.success) {
          setCardCounts(Array.isArray(cardsResult.data.cards) ? cardsResult.data.cards : [])
        } else setCardCounts([])
      } catch (e) { console.warn('Failed to fetch card frequencies', e); setCardCounts([]) }

    } catch (e) {
      console.warn('Failed to fetch insights count', e)
      setTotalCount(null)
      setLastFetchError(e && e.message ? e.message : String(e))
    } finally {
      setIsFetchingCount(false)
    }
  }, [selectedQuerent, startDate, endDate, selectedDeck, selectedTag, isInputValid])

  useEffect(() => { fetchCount(); }, [fetchCount])

  // Export / Print / Share handlers
  const handlePrint = async () => {
    try {
      let fullHtml = ''
      try { fullHtml = await captureInsightsHtml() } catch (e) { console.warn('capture failed', e); fullHtml = '<html><body><h1>Insights</h1></body></html>' }
      const w = window.open('', '_blank')
      if (!w) return notify({ type: 'error', text: 'Unable to open print window. Please allow popups.' })
      w.document.write(fullHtml)
      w.document.close()
      w.focus()
      setTimeout(() => { try { w.print(); w.onafterprint = () => { try { w.close() } catch (e) {} } } catch (e) { notify({ type: 'error', text: 'Print failed' }) } }, 250)
    } catch (e) { console.error('Print failed', e); notify({ type: 'error', text: 'Failed to open print view' }) }
  }

  const handleShareAsPdf = async () => {
    const fileName = `insights-${startDate}-${endDate}.pdf`
    try {
      const fullHtml = await captureInsightsHtml()
      const result = await exportReadingPDFAction({ html: fullHtml, fileName })
      if (!result.success) { notify({ type: 'error', text: 'Server failed to generate PDF for sharing.' }); return }
      
      // Convert base64 back to blob
      const binaryString = atob(result.data.blob)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: result.data.contentType })
      
      try {
        const file = new File([blob], fileName, { type: 'application/pdf' })
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Insights PDF', text: 'Sharing insights PDF' })
          notify({ type: 'success', text: 'PDF shared.' })
          return
        }
      } catch (e) { console.warn('Web Share with files not available', e) }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      notify({ type: 'success', text: 'PDF downloaded.' })
    } catch (e) { console.error('Share as PDF failed', e); notify({ type: 'error', text: 'Failed to share or download PDF.' }) }
  }

  const handleExport = async () => {
    const fileName = `insights-${startDate}-${endDate}.pdf`
    try {
      // Prefer posting the full captured HTML so the PDF uses the Insights layout
      try {
        const fullHtml = await captureInsightsHtml()
        const result = await exportReadingPDFAction({ html: fullHtml, fileName })
        if (!result.success) { notify({ type: 'error', text: 'Server export failed.' }); return }
        
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
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        notify({ type: 'success', text: 'PDF downloaded.' })
        return
      } catch (e) {
        // If capture fails, fall back to templated reading export
        console.warn('Capture failed, falling back to templated export', e)
      }

      const readingPayload = {
        by: 'Insights',
        date: `${startDate} — ${endDate}`,
        querent: 'Insights',
        spread: 'Insights',
        deck: '',
        question: '',
        cards: (cardCounts || []).map(c => ({ title: (c.suit && c.suit.toLowerCase() !== 'major arcana' ? `${c.suit} ${c.card}` : c.card), card: c.card, suit: c.suit })),
        interpretation: ''
      }
      const result = await exportReadingPDFAction({ reading: readingPayload, fileName })
      if (!result.success) { notify({ type: 'error', text: 'Server export failed.' }); return }
      
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
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      notify({ type: 'success', text: 'PDF downloaded.' })
    } catch (e) { console.error('Export failed', e); notify({ type: 'error', text: 'Failed to export insights.' }) }
  }

  const handleShareText = async () => {
    try {
      const title = `🔮 Insights ${startDate} — ${endDate}`
      const suitsText = Object.keys(suitCounts || {}).length ? Object.entries(suitCounts).map(([k,v]) => `${k}: ${v}`).join('\n') : 'No suit data'
      const cardsText = (cardCounts || []).length ? (cardCounts || []).map(c => `${(c.suit && c.suit.toLowerCase() !== 'major arcana' ? c.suit + ' ' : '')}${c.card} — ${c.count}`).join('\n') : 'No card data'
      const text = `${title}\n\nSuits:\n${suitsText}\n\nCards:\n${cardsText}`
      if (navigator.share) { try { await navigator.share({ title: 'Insights', text }); notify({ type: 'success', text: 'Insights shared.' }); return } catch (e) { console.warn('Share API failed', e) } }
      await navigator.clipboard.writeText(text)
      notify({ type: 'success', text: 'Insights copied to clipboard.' })
    } catch (e) { console.error('Share failed', e); notify({ type: 'error', text: 'Failed to share insights' }) }
  }

  return (
    <AuthWrapper>
      <style jsx>{`
        .chart-number {
          text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
        }
        
        .chart-bar {
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
          print-color-adjust: exact;
        }
        
        /* Print styles to ensure colors show up in print */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .chart-bar,
          [style*="backgroundColor"] {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .chart-number {
            text-shadow: none !important;
            color: #ffffff !important;
            font-weight: bold !important;
          }
        }
      `}</style>
      <div className="container mt-5">
        <div className="d-flex justify-content-center">
          <div style={{ textAlign: 'center', maxWidth: 720, width: '100%' }} ref={rootRef}>
            <div style={{ position: 'relative' }}>
              <h1 className="mb-4 text-white fs-xl">Insights</h1>
              {/* Refresh button removed per UX request */}
            </div>

            <div className="d-flex justify-content-center querent-row">
              <div>
                <label htmlFor="querentSelect" className="form-label text-white fs-lg">Querent</label>
                <select id="querentSelect" className="form-select" value={selectedQuerent} onChange={(e) => setSelectedQuerent(e.target.value)} style={{ width: 160 }}>
                  <option value="all">All querents</option>
                  <option value="self">Self</option>
                  {querents.map(q => <option key={q._id} value={q._id}>{q.name}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-3 d-flex justify-content-center">
              <div>
                <div className="btn-group" role="group" aria-label="Timeframe">
                  {['week','month','year'].map(tf => (
                    <button key={tf} type="button" className={`btn ${timeframe === tf ? 'btn-tarot-primary' : 'btn-outline-light'}`} onClick={() => setTimeframe(tf)}>
                      {tf.charAt(0).toUpperCase() + tf.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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

            {!isRangeValid && (
              <div className="d-flex justify-content-center">
                <div className="text-danger mt-2" role="alert" aria-live="polite">Start date must be the same as or before the end date. Please adjust the range.</div>
              </div>
            )}

            <div className="mt-3 d-flex justify-content-center">
              <div className="d-flex align-items-center" style={{ gap: 12 }}>
                <label htmlFor="deckSelect" className="form-label mb-0 text-white fs-lg">Deck</label>
                <select id="deckSelect" className="form-select" value={selectedDeck} onChange={(e) => setSelectedDeck(e.target.value)} style={{ width: 320 }}>
                  <option value="all">All decks</option>
                  {decks.map(d => <option key={d._id} value={d._id}>{d.deckName || d.name || d.title}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-3 d-flex justify-content-center">
              <div className="d-flex align-items-center" style={{ gap: 12 }}>
                <label htmlFor="tagsSelect" className="form-label mb-0 text-white fs-lg">Tags</label>
                <select id="tagsSelect" className="form-select" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} style={{ width: 320 }}>
                  <option value="all">All tags</option>
                  {tags.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            {selectedTag && selectedTag !== 'all' && (
              <div className="mt-2 d-flex justify-content-center">
                <a href="#" className={`insights-filter-link text-white ${isClearingTag ? 'fade-out-up' : ''}`} onClick={(e) => { e.preventDefault(); if (isClearingTag) return; setIsClearingTag(true); setTimeout(() => { setSelectedTag('all'); setIsClearingTag(false) }, 240) }} title="Click to clear tag filter">
                  <span className="text-white">Filtering by:</span>&nbsp;<strong className="text-white">{(tags.find(t => t._id === selectedTag) || {}).name || 'Selected tag'}</strong>
                </a>
              </div>
            )}

            {totalCount !== null && (
              <div className="mt-4 d-flex justify-content-center"><div className="text-white fs-xl"><strong>Total readings:</strong> {totalCount}</div></div>
            )}

            <div className="mt-3 d-flex justify-content-center">
              {/* Reusable export/share toolbar component */}
              <ExportToolbar
                onPrint={handlePrint}
                onSharePdf={handleShareAsPdf}
                onExport={handleExport}
                onShareText={handleShareText}
                busy={isFetchingCount}
              />
            </div>

            <div className="mt-4 d-flex justify-content-center">
              <div style={{ maxWidth: 720, width: '100%' }}>
                <h2 className="text-white fs-lg">Frequency of Appearance</h2>
                <div className="chart-container" style={{ background: 'rgba(255,255,255,0.04)', padding: 20, borderRadius: 6 }}>
                  {(() => {
                    const { labels, data: dataValues, colors } = buildSuitDataset(suitCounts || {})
                    if (!labels.length) return <div className="text-white">No suit data</div>
                    
                    const maxValue = Math.max(...dataValues)
                    const barHeight = 40
                    const maxBarWidth = 300
                    
                    return (
                      <div style={{ minHeight: 280 }}>
                        {/* Y-axis label */}
                        <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>
                          Occurrences
                        </div>
                        
                        {/* Chart area */}
                        <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-around', minHeight: 200, paddingTop: 20 }}>
                          {labels.map((label, idx) => {
                            const value = dataValues[idx] || 0
                            const color = colors[idx] || '#6c757d'
                            const barHeight = value > 0 ? Math.max((value / maxValue) * 160, 20) : 8
                            
                            return (
                              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: 140 }}>
                                {/* Bar with number inside */}
                                <div className="chart-bar" style={{
                                  width: 80,
                                  height: barHeight,
                                  backgroundColor: color,
                                  borderRadius: '6px 6px 0 0',
                                  marginBottom: 12,
                                  transition: 'height 0.3s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  position: 'relative',
                                  border: '2px solid rgba(255,255,255,0.1)'
                                }}>
                                  {/* Number inside bar */}
                                  {value > 0 && (
                                    <span className="chart-number" style={{ 
                                      color: '#fff', 
                                      fontSize: '16px', 
                                      fontWeight: 'bold',
                                      zIndex: 1
                                    }}>
                                      {value}
                                    </span>
                                  )}
                                </div>
                                
                                {/* X-axis label */}
                                <div style={{ 
                                  color: '#fff', 
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  textAlign: 'center', 
                                  wordWrap: 'break-word',
                                  lineHeight: '1.3',
                                  maxWidth: 100,
                                  minHeight: 40,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {label}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>

            <div className="mt-4 d-flex justify-content-center">
              <div style={{ maxWidth: 720, width: '100%' }}>
                <h3 className="text-white fs-md">Card Frequency</h3>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 6 }}>
                  {cardCounts && cardCounts.length ? (
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '12px',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {cardCounts.map((c, idx) => {
                        const suit = (c.suit || '').trim()
                        let displayName = c.card
                        if (suit && !/^major\s+arcana$/i.test(suit)) displayName = `${suit} ${c.card}`
                        return (
                          <div key={c.card + '_' + idx} className="card-frequency-item" style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.08)',
                            padding: '8px 12px',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            gap: '8px',
                            minWidth: 'fit-content'
                          }}>
                            <span className="text-white" style={{ fontSize: '14px', fontWeight: '500' }}>
                              {displayName}
                            </span>
                            <span className="card-frequency-count" style={{
                              backgroundColor: '#6c757d',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              minWidth: '20px',
                              textAlign: 'center'
                            }}>
                              {c.count}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-white">No card data</div>
                  )}
                </div>
              </div>
            </div>

            {lastFetchError && (
              <div className="mt-2 d-flex justify-content-center"><div className="text-danger">{lastFetchError}</div></div>
            )}

          </div>
        </div>
      </div>
    </AuthWrapper>
  )
}
