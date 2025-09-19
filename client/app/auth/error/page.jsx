"use client"

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle } from '../../../lib/icons'

export default function AuthErrorPage() {
  return (
    <div className="auth-container">
      <div className="row justify-content-center w-100">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow auth-card">
            <div className="card-body p-5 text-center">
              <div className="text-danger mb-3">
                <FontAwesomeIcon icon={faExclamationTriangle} size="3x" />
              </div>
              <h4 className="text-danger">Authentication Error</h4>
              <p className="text-muted mb-4">
                There was an error processing your Google sign-in. This could be due to:
              </p>
              <ul className="text-start text-muted mb-4">
                <li>Cancelled authentication process</li>
                <li>Server configuration issues</li>
                <li>Network connectivity problems</li>
              </ul>
              <div className="d-grid gap-2">
                                <Link href="/auth" className="btn btn-tarot-primary">
                  Return to Sign In
                </Link>
                <Link href="/" className="btn btn-outline-secondary">
                  Go to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
