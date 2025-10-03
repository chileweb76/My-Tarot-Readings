'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faExclamationTriangle } from '../../../lib/icons'
import { getCurrentUserAction, debugAuthStatusAction, exchangeOAuthTokenAction } from '../../../lib/actions'

export const dynamic = 'force-dynamic'

export default function AuthSuccessPage() {
  const [status, setStatus] = useState('processing')
  const [debugInfo, setDebugInfo] = useState(null)
  const [cookieInfo, setCookieInfo] = useState(null)
  const [deckCheck, setDeckCheck] = useState(null)

  const fetchUserData = useCallback(async (retryCount = 0) => {
    try {
      // First get debug info
      const debug = await debugAuthStatusAction()
      setDebugInfo(debug)
      console.log('Auth debug info:', debug)
      
      // Use Server Action to get current user (uses HTTP-only cookies)
      const result = await getCurrentUserAction()
      console.log('getCurrentUserAction result:', result)

      if (result.success && result.user) {
        // Store user data in localStorage for client components that need it
        localStorage.setItem('user', JSON.stringify(result.user))
        
        try {
          window.dispatchEvent(new CustomEvent('userUpdated', { detail: result.user }))
        } catch (e) {}
        
        setStatus('success')
        // Redirect to home page after a short delay
        setTimeout(() => (window.location.href = '/'), 1200)
        return
      }

      // If no token found and we haven't retried much, wait and retry
      if (!debug.debug?.hasToken && retryCount < 3) {
        console.log(`No token found, retrying in 1 second (attempt ${retryCount + 1}/3)`)
        setTimeout(() => fetchUserData(retryCount + 1), 1000)
        return
      }

      // If all retries failed and we're supposed to be in an OAuth flow, 
      // but have no token, suggest going back to login
      const sp = new URLSearchParams(window.location.search)
      const provider = sp.get('provider')
      
      if (provider && !debug.debug?.hasToken) {
        console.error('OAuth flow detected but no token available. Possible causes:')
        console.error('1. OAuth callback failed to set cookie or redirect with token')
        console.error('2. Backend environment variables not configured')
        console.error('3. Cross-origin cookie issues')
        console.error('Redirecting back to auth page...')
        
        // Redirect back to auth page after a delay
        setTimeout(() => {
          window.location.href = '/auth?error=oauth_failed'
        }, 3000)
        return
      }

      console.error('auth/success: getCurrentUserAction failed:', result.error)
      setStatus('error')
    } catch (error) {
      console.error('Error fetching user data:', error)
      
      // Retry on network errors up to 3 times
      if (retryCount < 3) {
        console.log(`Retrying due to error (attempt ${retryCount + 1}/3):`, error.message)
        setTimeout(() => fetchUserData(retryCount + 1), 1000)
        return
      }
      
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams('')
    const provider = sp.get('provider')
    const verified = sp.get('verified')
    const token = sp.get('token') // OAuth token from cross-domain callback
    
    // Enhanced debugging
    console.log('Auth success page loaded with params:', {
      provider,
      verified,
      token: token ? `${token.substring(0, 10)}...` : null,
      fullUrl: window.location.href,
      search: window.location.search
    })

    // If verification flow (no provider) — show verified message and redirect to sign-in
    if (!provider && verified === 'true') {
      console.log('Email verification flow detected')
      setStatus('verified')
      setTimeout(() => {
        // send user back to sign-in so they can log in
        window.location.href = '/auth'
      }, 3000)
      return
    }

    // For OAuth with token relay (cross-domain)
    if (provider && token) {
      console.log('OAuth token relay detected, exchanging token...', { 
        provider, 
        tokenPresent: !!token,
        tokenLength: token.length
      })
      handleOAuthTokenRelay(token)
      return
    }

    // For authentication success (Google OAuth or other providers)
    if (provider || window.location.pathname.includes('success')) {
      console.log('Standard OAuth flow detected (no token in URL), checking cookies...', { provider })
      // Fetch user data using Server Action (cookies are handled automatically)
      fetchUserData()
    } else {
      console.log('No valid auth flow detected, showing error')
      setStatus('error')
    }
  }, [fetchUserData])

  // Developer helper: check document cookies and do a test fetch to /api/decks
  const runClientDiagnostics = async () => {
    try {
      const raw = typeof document !== 'undefined' ? document.cookie : ''
      // mask cookie values for safety
      const masked = raw.split(';').map(c => {
        const [k, v] = c.split('=')
        if (!k) return ''
        const key = k.trim()
        const val = v ? v.trim() : ''
        if (!val) return key + '='
        return `${key}=${val.substring(0, 6)}...(${val.length})`
      }).filter(Boolean).join('; ')
      setCookieInfo(masked)

      // Test fetch to /api/decks with credentials to see if cookie is sent and user decks returned
      setDeckCheck({ status: 'running' })
      const resp = await fetch('/api/decks', { method: 'GET', credentials: 'include' })
      const json = await resp.clone().json().catch(() => null)
      setDeckCheck({ status: resp.ok ? 'ok' : 'error', code: resp.status, body: json })
      console.log('Diagnostics /api/decks response:', resp, json)
    } catch (err) {
      console.error('Diagnostics error', err)
      setDeckCheck({ status: 'error', error: String(err) })
    }
  }

  const handleOAuthTokenRelay = async (token) => {
    try {
      // Clear the token from URL immediately for security
      const newUrl = window.location.origin + window.location.pathname + '?provider=google'
      window.history.replaceState({}, document.title, newUrl)
      
      // Exchange the token for a proper cookie
      const result = await exchangeOAuthTokenAction(token)
      console.log('Token exchange result:', result)
      
      if (result.success && result.user) {
        // Store user data in localStorage for client components that need it
        localStorage.setItem('user', JSON.stringify(result.user))
        
        try {
          window.dispatchEvent(new CustomEvent('userUpdated', { detail: result.user }))
        } catch (e) {}
        
        setStatus('success')
        // Redirect to home page after a short delay
        setTimeout(() => (window.location.href = '/'), 1200)
        return
      }
      
      console.error('OAuth token exchange failed:', result.error)
      setStatus('error')
    } catch (error) {
      console.error('Error in OAuth token relay:', error)
      setStatus('error')
    }
  }

  return (
    <div className="auth-container">
      <div className="row justify-content-center w-100">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow auth-card">
            <div className="card-body p-5 text-center">
              {status === 'processing' && (
                <div>
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <h4 className="text-primary">Processing your sign-in...</h4>
                  <p className="text-muted">Please wait while we complete your authentication.</p>
                </div>
              )}
              
              {status === 'success' && (
                <div>
                  <div className="text-success mb-3">
                    <FontAwesomeIcon icon={faCheckCircle} size="3x" />
                  </div>
                  <h4 className="text-success">Welcome to My Tarot Readings!</h4>
                  <p className="text-muted">You have been successfully signed in.</p>
                  <p className="text-muted small">Redirecting you to the home page...</p>
                </div>
              )}

              {status === 'verified' && (
                <div>
                  <div className="text-success mb-3">
                    <FontAwesomeIcon icon={faCheckCircle} size="3x" />
                  </div>
                  <h4 className="text-success">Account Verified</h4>
                  <p className="text-muted">Your email address has been verified.</p>
                  <p className="text-muted small">Redirecting to sign in...</p>
                </div>
              )}
              
              {status === 'error' && (
                <div>
                  <div className="text-danger mb-3">
                    <FontAwesomeIcon icon={faExclamationTriangle} size="3x" />
                  </div>
                  <h4 className="text-danger">Authentication Failed</h4>
                  <p className="text-muted">There was an error processing your sign-in.</p>
                  
                  {debugInfo && (
                    <div className="text-start mt-3">
                      <small className="text-muted">
                        Debug Info:<br />
                        Token: {debugInfo.debug?.hasToken ? 'Yes' : 'No'}<br />
                        API URL: {debugInfo.debug?.apiBaseUrl}<br />
                        Environment: {debugInfo.debug?.nodeEnv}<br />
                        Error: {debugInfo.error}
                      </small>
                    </div>
                  )}
                  
                  <a href="/auth" className="btn btn-tarot-primary">
                    Return to Sign In
                  </a>
                </div>
              )}

              {/* Developer diagnostics panel (non-production) */}
              {process.env.NODE_ENV !== 'production' && (
                <div className="mt-3 text-start small">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={runClientDiagnostics}>Run client diagnostics</button>
                  {cookieInfo && (
                    <div className="mt-2">
                      <strong>Cookies:</strong>
                      <div className="text-monospace">{cookieInfo}</div>
                    </div>
                  )}
                  {deckCheck && (
                    <div className="mt-2">
                      <strong>/api/decks:</strong>
                      <div className="mt-1">
                        {deckCheck.status === 'running' && <span>Running…</span>}
                        {deckCheck.status === 'ok' && (
                          <pre className="small">{JSON.stringify(deckCheck.body, null, 2)}</pre>
                        )}
                        {deckCheck.status === 'error' && (
                          <pre className="small">{JSON.stringify(deckCheck, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
