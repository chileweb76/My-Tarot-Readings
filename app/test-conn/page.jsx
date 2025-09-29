"use client"

import { useEffect, useState } from 'react'
import { testConnectionAction } from '../../lib/actions'

export default function TestConnPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function runTest() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const result = await testConnectionAction()
      if (result.success) {
        setResult(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { runTest() }, [])

  return (
    <div className="container py-4">
      <h2>API test — /api/test-conn</h2>
      <p className="text-muted">This page calls <code>/api/test-conn</code> using your client configuration (credentials included).</p>
      <div className="mb-3">
        <button className="btn btn-tarot-primary" onClick={runTest} disabled={loading}>
          {loading ? 'Testing…' : 'Run test'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">Error: {error}</div>
      )}

      {result && (
        <div>
          <h5>Response</h5>
          <p><strong>HTTP Status:</strong> {result.status} {result.ok ? '(ok)' : ''}</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f8f9fa', padding: '12px', borderRadius: '6px' }}>{JSON.stringify(result.data, null, 2)}</pre>
        </div>
      )}

      {!result && !error && !loading && (
        <div className="text-muted">No result yet. Click &quot;Run test&quot; to start.</div>
      )}
    </div>
  )
}
