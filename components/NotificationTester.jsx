"use client"
import { useState } from 'react'

export default function NotificationTester() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const sendTestNotifications = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const tests = [
        {
          name: 'Daily Reading',
          type: 'daily-reading'
        },
        {
          name: 'New Insight',
          type: 'new-insight',
          data: { message: 'The cards suggest new opportunities are coming your way!' }
        },
        {
          name: 'Reading Reminder',
          type: 'reading-reminder',
          data: { 
            readingTitle: 'Your Celtic Cross Reading',
            readingUrl: '/reading/123'
          }
        }
      ]

      const results = []
      
      for (const test of tests) {
        try {
          const response = await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(test)
          })
          
          const data = await response.json()
          results.push({ ...test, success: response.ok, data })
        } catch (error) {
          results.push({ ...test, success: false, error: error.message })
        }
      }
      
      setResult(results)
    } catch (error) {
      setResult([{ error: error.message }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card mt-3">
      <div className="card-header">
        <h6 className="mb-0">🧪 Notification Testing</h6>
      </div>
      <div className="card-body">
        <p className="small text-muted mb-3">
          Test different types of push notifications. You must be subscribed to receive them.
        </p>
        
        <button 
          className="btn btn-outline-primary btn-sm"
          onClick={sendTestNotifications}
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Test Notifications'}
        </button>

        {result && (
          <div className="mt-3">
            <h6>Results:</h6>
            <div className="small">
              {result.map((test, index) => (
                <div key={index} className="mb-2">
                  <span className={`badge ${test.success ? 'bg-success' : 'bg-danger'} me-2`}>
                    {test.success ? '✓' : '✗'}
                  </span>
                  <strong>{test.name || 'Test'}:</strong>
                  {test.success ? (
                    <span className="text-success ms-1">
                      Sent to {test.data?.sent || 0} subscribers
                    </span>
                  ) : (
                    <span className="text-danger ms-1">
                      {test.error || test.data?.error || 'Failed'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}