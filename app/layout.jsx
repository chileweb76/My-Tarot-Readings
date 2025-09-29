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
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
  <head>
      <link rel="icon" href="/favicon.ico" />
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content="#2b0f2f" />
      
      {/* iOS-specific meta tags */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="My Tarot Readings" />
      <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      <link rel="apple-touch-startup-image" href="/icons/icon-512.png" />
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
