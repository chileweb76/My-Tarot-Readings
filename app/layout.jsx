import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.scss'
import Header from '../components/Header'
import Footer from '../components/Footer'
import BootstrapJsLoader from '../components/BootstrapJsLoader'
import ServiceWorkerRegister from '../components/ServiceWorkerRegister'
import UniversalInstallPrompt from '../components/UniversalInstallPrompt'

export const metadata = {
  title: 'My Tarot Readings',
  description: 'Journal your way to better understanding of your tarot readings.',
  keywords: ['tarot', 'readings', 'journal', 'cards', 'divination', 'spiritual'],
  authors: [{ name: 'My Tarot Readings' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'My Tarot Readings',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'application-name': 'My Tarot Readings',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2b0f2f',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* All metadata is now handled by the metadata export above */}
      </head>
      <body>
        <div className="app-shell d-flex flex-column min-vh-100">
          <Header />
          <main className="container py-4 flex-grow-1">
            {children}
          </main>
          {/* Load Bootstrap JS on the client from the installed package (no external CDN) */}
          <BootstrapJsLoader />
          {/* Register a lightweight service worker for basic caching/offline support */}
          <ServiceWorkerRegister />
          {/* Universal PWA install prompt for all browsers */}
          <UniversalInstallPrompt />
          <Footer />
        </div>
      </body>
    </html>
  )
}
