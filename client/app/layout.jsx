import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.scss'
import Header from '../components/Header'
import Footer from '../components/Footer'
import BootstrapJsLoader from '../components/BootstrapJsLoader'

export const metadata = {
  title: 'My Tarot Readings',
  description: 'Discover your spiritual path through tarot',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
  <head />
      <body>
        <div className="app-shell d-flex flex-column min-vh-100">
          <Header />
          <main className="container py-4 flex-grow-1">
            {children}
          </main>
          {/* Load Bootstrap JS on the client from the installed package (no external CDN) */}
          <BootstrapJsLoader />
          <Footer />
        </div>
      </body>
    </html>
  )
}
