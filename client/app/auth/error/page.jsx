'use client'

export default function AuthErrorPage() {
  return (
    <div className="auth-container">
      <div className="row justify-content-center w-100">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow auth-card">
            <div className="card-body p-5 text-center">
              <div className="text-danger mb-3">
                <i className="fas fa-exclamation-triangle fa-3x"></i>
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
                <a href="/auth" className="btn btn-primary">
                  Try Again
                </a>
                <a href="/" className="btn btn-outline-secondary">
                  Go to Home
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
