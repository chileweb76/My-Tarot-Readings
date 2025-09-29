'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faExclamationTriangle } from '../../../lib/icons'
import { getCurrentUserAction } from '../../../lib/actions'

export const dynamic = 'force-dynamic'

export default function AuthSuccessPage() {
  const [status, setStatus] = useState('processing')

  useEffect(() => {
    const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams('')
    const provider = sp.get('provider')
    const verified = sp.get('verified')

    // If verification flow (no provider) — show verified message and redirect to sign-in
    if (!provider && verified === 'true') {
      setStatus('verified')
      setTimeout(() => {
        // send user back to sign-in so they can log in
        window.location.href = '/auth'
      }, 3000)
      return
    }

    // For authentication success (Google OAuth or other providers)
    if (provider || window.location.pathname.includes('success')) {
      // Fetch user data using Server Action (cookies are handled automatically)
      fetchUserData()
    } else {
      setStatus('error')
    }
  }, [])

  const fetchUserData = async () => {
    try {
      // Use Server Action to get current user (uses HTTP-only cookies)
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

      console.error('auth/success: getCurrentUserAction failed:', result.error)
      setStatus('error')
    } catch (error) {
      console.error('Error fetching user data:', error)
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
                                    <a href="/auth" className="btn btn-tarot-primary">
                    Return to Sign In
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
