const fs = require('fs')
const fetch = require('node-fetch')

// Simple test: POST a minimal HTML to the server export endpoint and save PDF to out.pdf
// Usage: node scripts/test_export_html.js [serverUrl]
// Example: node scripts/test_export_html.js http://localhost:5000

const server = process.argv[2] || 'http://localhost:5000'
const url = `${server.replace(/\/$/, '')}/api/export/pdf`

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:20px}h1{color:#5a1b6f;text-align:center}</style>
</head>
<body>
  <h1>Insights Export Test</h1>
  <p>This is a test PDF generated from raw HTML.</p>
  <div style="width:400px;height:200px;border:1px solid #ccc;display:flex;align-items:center;justify-content:center">Chart Placeholder</div>
</body>
</html>`

;(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, fileName: 'test-insights.pdf' })
    })
    if (!res.ok) {
      console.error('Server returned', res.status, await res.text())
      process.exit(2)
    }
    const buf = await res.arrayBuffer()
    fs.writeFileSync('out-insights-test.pdf', Buffer.from(buf))
    console.log('Saved out-insights-test.pdf')
  } catch (e) {
    console.error('Test failed', e)
    process.exit(1)
  }
})()
