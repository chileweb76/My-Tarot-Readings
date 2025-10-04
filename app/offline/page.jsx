'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function OfflinePage() {
  // Small helper handlers so buttons don't reference undefined functions
  const install = () => {
    // noop — real install flow handled elsewhere
    // Install PWA requested
  }

  const checkSW = () => {
    // Check service worker requested
  }

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-gradient">
      <div className="text-center p-4">
        <Image 
          src="/images/logo.png" 
          alt="My Tarot Readings Logo" 
          width={300}
          height={150}
          priority
          className="mb-4"
          style={{ height: 'auto', objectFit: 'contain' }}
        />

        <div className="card shadow-lg" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div className="card-body p-4">
            <h2 className="card-title text-center mb-3">
              <i className="fas fa-wifi-slash text-warning me-2"></i>
              You&apos;re Offline
            </h2>

            <p className="card-text text-center mb-4">
              It looks like you&apos;re not connected to the internet. Don&apos;t worry - you can still:
            </p>

            <ul className="list-unstyled mb-4">
              <li className="mb-2">
                <i className="fas fa-check-circle text-success me-2"></i>
                View your cached readings
              </li>
              <li className="mb-2">
                <i className="fas fa-check-circle text-success me-2"></i>
                Create new readings (saved locally)
              </li>
              <li className="mb-2">
                <i className="fas fa-check-circle text-success me-2"></i>
                Access your offline content
              </li>
              <li className="mb-2">
                <i className="fas fa-sync-alt text-primary me-2"></i>
                Auto-sync when connection returns
              </li>
            </ul>

            <div className="text-center">
              <button
                type="button"
                className="btn btn-tarot-primary me-2"
                onClick={() => window.location.reload()}
              >
                <i className="fas fa-refresh me-1"></i>
                Try Again
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={install}
              >
                Install PWA
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={checkSW}
              >
                Check Service Worker
              </button>
            </div>

            <div className="mt-4 text-center">
              <small className="text-muted">
                <i className="fas fa-info-circle me-1"></i>
                Your data will sync automatically when you&apos;re back online
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}