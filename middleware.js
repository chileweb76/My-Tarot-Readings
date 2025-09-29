import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function middleware(request) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers)
  
  // Create response with security headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // JWT Authentication for Server Actions and auth routes
  if (request.nextUrl.pathname.startsWith('/api/auth') || 
      request.method === 'POST' && request.headers.get('content-type')?.includes('multipart/form-data')) {
    
    // Get token from cookies (for Server Actions) or Authorization header (for API routes)
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (token) {
      try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        
        // Add user info to headers for Server Actions
        response.headers.set('x-user-id', decoded.userId)
      } catch (error) {
        console.error('JWT verification failed:', error)
        
        // For Server Actions, let them handle auth errors
        if (request.method !== 'POST') {
          // For API routes, return 401
          return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }
      }
    }
  }

  // Enhanced Content Security Policy for PWA
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline, unsafe-eval for dev
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net", // Bootstrap CDN
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
    "img-src 'self' data: blob: https://*.vercel-storage.com https://vercel-storage.com",
    "media-src 'self' blob: https://*.vercel-storage.com",
    "connect-src 'self' https://*.vercel-storage.com https://vercel-storage.com ws: wss:",
    "worker-src 'self'", // Service worker
    "manifest-src 'self'", // PWA manifest
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  // Apply security headers to HTML pages
  const isHtmlPage = request.headers.get('accept')?.includes('text/html')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(request.nextUrl.pathname)

  if (isHtmlPage && !isApiRoute && !isStaticAsset) {
    response.headers.set('Content-Security-Policy', csp)
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('X-Download-Options', 'noopen')
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  }

  // Service Worker specific headers
  if (request.nextUrl.pathname === '/service-worker.js') {
    response.headers.set('Service-Worker-Allowed', '/')
    response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; connect-src 'self' https://*.vercel-storage.com")
  }

  // PWA manifest headers
  if (request.nextUrl.pathname === '/manifest.json') {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
  }

  // CORS headers for API routes (PWA offline functionality)
  if (isApiRoute) {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')
  }

  return response
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}