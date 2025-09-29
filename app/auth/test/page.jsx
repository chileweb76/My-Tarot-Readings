'use client'

import { useEffect, useState } from 'react'
import { debugAuthStatusAction } from '../../../lib/actions'

export default function AuthTestPage() {
  const [diagnostics, setDiagnostics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        // Test auth status
        const authStatus = await debugAuthStatusAction()
        
        // Test environment info
        const envInfo = {
          currentUrl: typeof window !== 'undefined' ? window.location.href : 'unknown',
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
          cookiesEnabled: typeof window !== 'undefined' ? navigator.cookieEnabled : false,
          localStorage: typeof window !== 'undefined' && window.localStorage ? 'available' : 'unavailable'
        }

        // Test backend connectivity
        let backendTest = { error: 'Not tested' }
        try {
          const response = await fetch('/api/test-conn')
          if (response.ok) {
            const data = await response.json()
            backendTest = { success: true, data }
          } else {
            backendTest = { error: `HTTP ${response.status}` }
          }
        } catch (error) {
          backendTest = { error: error.message }
        }

        setDiagnostics({
          authStatus,
          environment: envInfo,
          backendConnectivity: backendTest,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        setDiagnostics({
          error: error.message,
          timestamp: new Date().toISOString()
        })
      } finally {
        setLoading(false)
      }
    }

    runDiagnostics()
  }, [])

  const testOAuthFlow = () => {
    window.location.href = 'https://mytarotreadingsserver.vercel.app/api/auth/google'
  }

  const clearStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
      console.log('Storage cleared')
      window.location.reload()
    }
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-10">
          <h1 className="h3 mb-4">🔍 Authentication Diagnostics</h1>
          
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Quick Actions</h5>
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-primary" onClick={testOAuthFlow}>
                  Test Google OAuth
                </button>
                <button className="btn btn-warning" onClick={clearStorage}>
                  Clear Storage
                </button>
                <a href="/auth" className="btn btn-secondary">
                  Back to Login
                </a>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Diagnostic Results</h5>
              
              {loading ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Running diagnostics...</p>
                </div>
              ) : (
                <pre className="bg-light p-3 overflow-auto" style={{ fontSize: '0.9rem' }}>
                  {JSON.stringify(diagnostics, null, 2)}
                </pre>
              )}
            </div>
          </div>

          <div className="card mt-3">
            <div className="card-body">
              <h6 className="card-title">Expected OAuth Flow:</h6>
              <ol className="small">
                <li>Click "Test Google OAuth" → Redirects to Google</li>
                <li>Authorize with Google → Google redirects to backend callback</li>
                <li>Backend processes auth → Redirects to <code>/auth/success?provider=google&token=...</code></li>
                <li>Frontend extracts token → Exchanges for cookie → Success</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}