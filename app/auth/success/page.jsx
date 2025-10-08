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

  const fetchUserData = useCallback(async (retryCount = 0) => {
    try {
  // First get debug info and attempt to retrieve current user
  const debug = await debugAuthStatusAction()
  setDebugInfo(debug)
  const result = await getCurrentUserAction()

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
        // Token not present yet; retry briefly
        setTimeout(() => fetchUserData(retryCount + 1), 1000)
        return
      }

      // If all retries failed and we're supposed to be in an OAuth flow, 
      // but have no token, suggest going back to login
      const sp = new URLSearchParams(window.location.search)
      const provider = sp.get('provider')
      
      if (provider && !debug.debug?.hasToken) {
        // OAuth flow but no token — redirect back to auth
        setTimeout(() => { window.location.href = '/auth?error=oauth_failed' }, 3000)
        return
      }

      // Failed to get current user
      setStatus('error')
    } catch (error) {
      // Retry on network errors up to 3 times
      if (retryCount < 3) {
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
    
    // IMPORTANT: Check verification flow FIRST before attempting authentication
    // Email verification does NOT log the user in, just confirms their email

    // If verification flow (no provider) — show verified message and redirect to sign-in
    if (verified === 'true' && !provider) {
      // Email verification flow - user is NOT logged in yet
      setStatus('verified')
      setTimeout(() => {
        // send user back to sign-in so they can log in
        window.location.href = '/auth'
      }, 3000)
      return
    }

    // For OAuth with token relay (cross-domain)
    if (provider && token) {
      // OAuth token relay detected
      handleOAuthTokenRelay(token)
      return
    }

    // For authentication success (Google OAuth or other providers)
    if (provider) {
      // Standard OAuth flow detected — check cookies via server action
      // Fetch user data using Server Action (cookies are handled automatically)
      fetchUserData()
    } else {
      // No valid auth flow detected
      setStatus('error')
    }
  }, [fetchUserData])
  // Diagnostics removed

  const handleOAuthTokenRelay = async (token) => {
    try {
  // Clear the token from URL immediately for security
  const newUrl = window.location.origin + window.location.pathname + '?provider=google'
  window.history.replaceState({}, document.title, newUrl)
      
  // Exchange the token for a proper cookie
  const result = await exchangeOAuthTokenAction(token)
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
      
      // OAuth token exchange failed
      setStatus('error')
    } catch (error) {
      // Error in OAuth token relay
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

              {/* Diagnostics removed */}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
