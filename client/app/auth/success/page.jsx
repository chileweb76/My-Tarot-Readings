'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faExclamationTriangle } from '../../../lib/icons'
import { apiFetch } from '../../../lib/api'

export const dynamic = 'force-dynamic'

export default function AuthSuccessPage() {
  const [status, setStatus] = useState('processing')
    const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams('')

  useEffect(() => {
      const token = sp.get('token')
      const verified = sp.get('verified')

    // If verification flow (no token) — show verified message and redirect to sign-in
    if (!token && verified === 'true') {
      setStatus('verified')
      setTimeout(() => {
        // send user back to sign-in so they can log in
        window.location.href = '/auth'
      }, 3000)
      return
    }

    if (token) {
      // Store the token
      localStorage.setItem('token', token)

      // Fetch user data with the token
      fetchUserData(token)
    } else {
      setStatus('error')
    }
  }, [searchParams])

  const fetchUserData = async (token) => {
    try {
      // prefer NEXT_PUBLIC_API_URL (contains trailing /api in our env), normalize to no trailing slash
      const fetchMe = async () => {
        const res = await apiFetch('/auth/me')
        if (!res.ok) throw new Error(`Failed to fetch /auth/me (${res.status})`)
        return res.json()
      }

      // Try once, then retry once if profilePicture missing (some timing edge cases)
      let data = await fetchMe()
      if (!data?.user?.profilePicture) {
        console.debug('auth/success: profilePicture missing on first fetch, retrying')
        // small delay then retry
        await new Promise((r) => setTimeout(r, 400))
        try {
          data = await fetchMe()
        } catch (e) {
          console.warn('Second attempt to fetch /auth/me failed', e)
        }
      }

        if (data?.user) {
      localStorage.setItem('user', JSON.stringify(data.user))
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
        try {
          window.dispatchEvent(new CustomEvent('userUpdated', { detail: data.user }))
        } catch (e) {}
        setStatus('success')
        // Redirect to home page after a short delay
        setTimeout(() => (window.location.href = '/'), 1200)
        return
      }

      console.error('auth/success: no user returned from /auth/me')
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
                  <p className="text-muted">You have been successfully signed in with Google.</p>
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
                  <a href="/auth" className="btn btn-primary">
                    Try Again
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
