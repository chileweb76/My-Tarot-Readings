// Lightweight fetch wrapper that retries once using refresh token when receiving 401
export async function apiFetch(url, options = {}) {
  // Default to the server's default port (5000). Override with NEXT_PUBLIC_API_URL in env.
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
  const apiBase = raw.replace(/\/$|\/api$/i, '')

  // Normalize relative paths: if the caller passes "/auth/..." or "/querents"
  // or any path that doesn't already begin with "/api", prefix it with "/api".
  // Absolute URLs (http/https) are left untouched.
  let path = url
  if (!url.startsWith('http')) {
    if (url.startsWith('/')) {
      if (!url.startsWith('/api')) path = '/api' + url
    } else {
      // no leading slash, assume a relative API path
      path = '/api/' + url
    }
  }

  const full = url.startsWith('http') ? url : `${apiBase}${path}`

  // Helpful debug output when developing: show how the final URL is built.
  try {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[apiFetch] apiBase=', apiBase, 'path=', path, 'full=', full)
    }
  } catch (e) {
    // ignore
  }

  const token = localStorage.getItem('token')
  const headers = new Headers(options.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res = await fetch(full, { ...options, headers })
  if (res.status !== 401) return res

  // Try refresh once
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return res
  try {
    const rawRefresh = await fetch(`${apiBase}/api/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) })
    if (!rawRefresh.ok) return res
    const data = await rawRefresh.json()
    if (data.token) {
      localStorage.setItem('token', data.token)
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
      // retry original request with new token
      headers.set('Authorization', `Bearer ${data.token}`)
      res = await fetch(full, { ...options, headers })
      return res
    }
  } catch (e) {
    console.warn('Token refresh failed', e)
  }
  return res
}
