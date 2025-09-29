'use client'

import { useState, useEffect } from 'react'

export default function SecurityTest() {
  const [headers, setHeaders] = useState(null)
  const [cspTest, setCspTest] = useState(null)
  const [pwaFeatures, setPwaFeatures] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function runSecurityTests() {
      try {
        // Test 1: Check response headers
        const response = await fetch('/', { method: 'HEAD' })
        const headerEntries = [...response.headers.entries()]
        
        setHeaders({
          'Content-Security-Policy': response.headers.get('content-security-policy'),
          'X-Frame-Options': response.headers.get('x-frame-options'),
          'X-Content-Type-Options': response.headers.get('x-content-type-options'),
          'Referrer-Policy': response.headers.get('referrer-policy'),
          'Strict-Transport-Security': response.headers.get('strict-transport-security'),
          'Permissions-Policy': response.headers.get('permissions-policy'),
          allHeaders: headerEntries
        })

        // Test 2: CSP violation test (safe test)
        try {
          eval('console.log("CSP test")')
          setCspTest({ eval: 'ALLOWED (unsafe)' })
        } catch (e) {
          setCspTest({ eval: 'BLOCKED (secure)' })
        }

        // Test 3: PWA Features
        setPwaFeatures({
          serviceWorker: 'serviceWorker' in navigator ? 'SUPPORTED' : 'NOT SUPPORTED',
          installPrompt: 'BeforeInstallPromptEvent' in window ? 'SUPPORTED' : 'NOT SUPPORTED',
          pushNotifications: 'PushManager' in window ? 'SUPPORTED' : 'NOT SUPPORTED',
          backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype ? 'SUPPORTED' : 'NOT SUPPORTED',
          webAppManifest: document.querySelector('link[rel="manifest"]') ? 'PRESENT' : 'MISSING',
          isStandalone: window.matchMedia('(display-mode: standalone)').matches ? 'YES' : 'NO'
        })

      } catch (error) {
        console.error('Security test failed:', error)
      }
      
      setLoading(false)
    }

    runSecurityTests()
  }, [])

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-body text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading security tests...</span>
                </div>
                <p className="mt-3">Running security tests...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-10">
          <div className="card">
            <div className="card-header">
              <h2 className="mb-0">🔒 Security & PWA Test Results</h2>
            </div>
            <div className="card-body">
              
              {/* Security Headers Test */}
              <div className="mb-4">
                <h4>Security Headers</h4>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Header</th>
                        <th>Value</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Content-Security-Policy</td>
                        <td className="font-monospace small">{headers?.['Content-Security-Policy'] || 'Not set'}</td>
                        <td>
                          <span className={`badge ${headers?.['Content-Security-Policy'] ? 'bg-success' : 'bg-warning'}`}>
                            {headers?.['Content-Security-Policy'] ? '✓ Set' : '⚠ Missing'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>X-Frame-Options</td>
                        <td className="font-monospace">{headers?.['X-Frame-Options'] || 'Not set'}</td>
                        <td>
                          <span className={`badge ${headers?.['X-Frame-Options'] ? 'bg-success' : 'bg-warning'}`}>
                            {headers?.['X-Frame-Options'] ? '✓ Set' : '⚠ Missing'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>X-Content-Type-Options</td>
                        <td className="font-monospace">{headers?.['X-Content-Type-Options'] || 'Not set'}</td>
                        <td>
                          <span className={`badge ${headers?.['X-Content-Type-Options'] ? 'bg-success' : 'bg-warning'}`}>
                            {headers?.['X-Content-Type-Options'] ? '✓ Set' : '⚠ Missing'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Referrer-Policy</td>
                        <td className="font-monospace">{headers?.['Referrer-Policy'] || 'Not set'}</td>
                        <td>
                          <span className={`badge ${headers?.['Referrer-Policy'] ? 'bg-success' : 'bg-warning'}`}>
                            {headers?.['Referrer-Policy'] ? '✓ Set' : '⚠ Missing'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Strict-Transport-Security</td>
                        <td className="font-monospace">{headers?.['Strict-Transport-Security'] || 'Not set'}</td>
                        <td>
                          <span className={`badge ${headers?.['Strict-Transport-Security'] ? 'bg-success' : 'bg-info'}`}>
                            {headers?.['Strict-Transport-Security'] ? '✓ Set' : 'ℹ HTTPS only'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CSP Test */}
              <div className="mb-4">
                <h4>Content Security Policy Test</h4>
                <div className="alert alert-info">
                  <strong>Eval Test:</strong> {cspTest?.eval}
                  <br />
                  <small>If CSP is working correctly, eval should be blocked in production.</small>
                </div>
              </div>

              {/* PWA Features */}
              <div className="mb-4">
                <h4>PWA Features</h4>
                <div className="row">
                  <div className="col-md-6">
                    <ul className="list-group">
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Service Worker
                        <span className={`badge ${pwaFeatures?.serviceWorker === 'SUPPORTED' ? 'bg-success' : 'bg-danger'}`}>
                          {pwaFeatures?.serviceWorker}
                        </span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Install Prompt
                        <span className={`badge ${pwaFeatures?.installPrompt === 'SUPPORTED' ? 'bg-success' : 'bg-warning'}`}>
                          {pwaFeatures?.installPrompt}
                        </span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Push Notifications
                        <span className={`badge ${pwaFeatures?.pushNotifications === 'SUPPORTED' ? 'bg-success' : 'bg-danger'}`}>
                          {pwaFeatures?.pushNotifications}
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <ul className="list-group">
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Background Sync
                        <span className={`badge ${pwaFeatures?.backgroundSync === 'SUPPORTED' ? 'bg-success' : 'bg-warning'}`}>
                          {pwaFeatures?.backgroundSync}
                        </span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Web App Manifest
                        <span className={`badge ${pwaFeatures?.webAppManifest === 'PRESENT' ? 'bg-success' : 'bg-danger'}`}>
                          {pwaFeatures?.webAppManifest}
                        </span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Standalone Mode
                        <span className={`badge ${pwaFeatures?.isStandalone === 'YES' ? 'bg-success' : 'bg-info'}`}>
                          {pwaFeatures?.isStandalone}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* All Headers Debug */}
              <div className="mb-4">
                <h4>All Response Headers <small className="text-muted">(Debug)</small></h4>
                <details className="border rounded p-3">
                  <summary className="mb-2 fw-bold">Click to expand all headers</summary>
                  <pre className="small bg-light p-2 rounded">
                    {headers?.allHeaders?.map(([name, value]) => `${name}: ${value}`).join('\n') || 'No headers captured'}
                  </pre>
                </details>
              </div>

              {/* Actions */}
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-primary"
                  onClick={() => window.location.reload()}
                >
                  🔄 Retest
                </button>
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => window.open('https://securityheaders.com/?q=' + encodeURIComponent(window.location.origin), '_blank')}
                >
                  🔍 External Security Scan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}