"use client"

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPrint, faFilePdf, faFileExport, faShareAlt } from '../lib/icons'

export default function ExportToolbar({ onPrint, onSharePdf, onExport, onShareText, busy = false, printTitle = 'Print', sharePdfTitle = 'Share as PDF', exportTitle = 'Export', shareTitle = 'Share' }) {
  return (
    <div className="mt-3 d-flex justify-content-center gap-1 export-toolbar">
      <button type="button" className="btn btn-sm btn-solid btn-tarot-dark" onClick={onPrint} disabled={busy} title={printTitle}>
        <FontAwesomeIcon icon={faPrint} aria-hidden="true" />
        <span className="toolbar-label ms-1">Print</span>
      </button>
      <button type="button" className="btn btn-sm btn-solid btn-tarot-dark" onClick={onSharePdf} disabled={busy} title={sharePdfTitle}>
        <FontAwesomeIcon icon={faFilePdf} aria-hidden="true" />
        <span className="toolbar-label ms-1">Share as PDF</span>
      </button>
      <button type="button" className="btn btn-sm btn-solid btn-tarot-dark" onClick={onExport} disabled={busy} title={exportTitle}>
        {busy ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            <span className="toolbar-label">{exportTitle}...</span>
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faFileExport} aria-hidden="true" />
            <span className="toolbar-label ms-1">{exportTitle}</span>
          </>
        )}
      </button>
      <button type="button" className="btn btn-sm btn-solid btn-tarot-dark" onClick={onShareText} disabled={busy} title={shareTitle}>
  <FontAwesomeIcon icon={faShareAlt} aria-hidden="true" />
  <span className="toolbar-label ms-1">Share</span>
      </button>
    </div>
  )
}
